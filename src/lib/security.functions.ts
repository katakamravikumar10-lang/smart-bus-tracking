import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader, getRequestIP } from "@tanstack/react-start/server";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

function getClientIp(): string | null {
  try {
    return getRequestIP({ xForwardedFor: true }) ?? null;
  } catch {
    return null;
  }
}

function getUserAgent(): string | null {
  try {
    return getRequestHeader("user-agent") ?? null;
  } catch {
    return null;
  }
}

/**
 * Public: checks whether an email is currently locked out after 5+ failed
 * login attempts within the last 15 minutes.
 */
export const checkLoginLockout = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z
      .object({ email: z.string().trim().toLowerCase().email().max(320) })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: locked, error } = await supabaseAdmin.rpc("is_email_locked", {
      _email: data.email,
    });
    if (error) return { locked: false, error: error.message };
    return { locked: Boolean(locked) };
  });

/**
 * Public: records a login attempt. On success also records login_history.
 */
export const recordLoginAttempt = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z
      .object({
        email: z.string().trim().toLowerCase().email().max(320),
        success: z.boolean(),
        userId: z.string().uuid().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const ip = getClientIp();
    const userAgent = getUserAgent();

    await supabaseAdmin.from("login_attempts").insert({
      email: data.email,
      success: data.success,
      ip,
      user_agent: userAgent,
    });

    if (data.success && data.userId) {
      const { data: roleRow } = await supabaseAdmin
        .from("user_roles")
        .select("role")
        .eq("user_id", data.userId)
        .maybeSingle();
      await supabaseAdmin.from("login_history").insert({
        user_id: data.userId,
        email: data.email,
        role: roleRow?.role ?? null,
        ip,
        user_agent: userAgent,
      });
    }

    return { ok: true };
  });

/**
 * Authenticated: records an admin action in the audit log. The caller must
 * be an admin. Any user can invoke, but the row records their identity and
 * the RLS policy only lets admins read the log.
 */
export const logAdminAction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        action: z.string().trim().min(1).max(120),
        entityType: z.string().trim().max(80).optional(),
        entityId: z.string().trim().max(120).optional(),
        details: z.record(z.string(), z.unknown()).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Forbidden");

    const { data: profile } = await context.supabase
      .from("profiles")
      .select("email")
      .eq("id", context.userId)
      .maybeSingle();

    await supabaseAdmin.from("audit_logs").insert({
      actor_id: context.userId,
      actor_email: profile?.email ?? null,
      action: data.action,
      entity_type: data.entityType ?? null,
      entity_id: data.entityId ?? null,
      details: data.details ?? null,
      ip: getClientIp(),
      user_agent: getUserAgent(),
    });
    return { ok: true };
  });

/**
 * Authenticated + admin only: list audit logs with pagination.
 */
export const listAuditLogs = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        limit: z.number().int().min(1).max(200).default(50),
        offset: z.number().int().min(0).max(10000).default(0),
      })
      .parse(input ?? {}),
  )
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Forbidden");

    const { data: rows, error, count } = await context.supabase
      .from("audit_logs")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(data.offset, data.offset + data.limit - 1);
    if (error) throw new Error(error.message);
    return { rows: rows ?? [], total: count ?? 0 };
  });

/**
 * Authenticated + admin: list login history / recent attempts.
 */
export const listLoginHistory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        limit: z.number().int().min(1).max(200).default(50),
        offset: z.number().int().min(0).max(10000).default(0),
      })
      .parse(input ?? {}),
  )
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Forbidden");

    const { data: rows, error, count } = await context.supabase
      .from("login_history")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(data.offset, data.offset + data.limit - 1);
    if (error) throw new Error(error.message);
    return { rows: rows ?? [], total: count ?? 0 };
  });