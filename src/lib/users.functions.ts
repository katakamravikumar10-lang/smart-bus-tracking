import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Admin-only: fully delete a user (profile, roles, and auth account).
 * Records an audit log entry on success.
 */
export const deleteUserAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        user_id: z.string().uuid(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Forbidden");

    if (data.user_id === context.userId) {
      throw new Error("You cannot delete your own account.");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Capture before-state for audit.
    const { data: beforeProfile } = await supabaseAdmin
      .from("profiles")
      .select("id, email, full_name")
      .eq("id", data.user_id)
      .maybeSingle();
    const { data: beforeRoles } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", data.user_id);

    // Delete role assignments first (FK to auth.users, but explicit for clarity).
    const { error: roleErr } = await supabaseAdmin
      .from("user_roles")
      .delete()
      .eq("user_id", data.user_id);
    if (roleErr) {
      throw new Error(`Cannot delete role assignments: ${roleErr.message}`);
    }

    // Delete profile.
    const { error: profileErr } = await supabaseAdmin
      .from("profiles")
      .delete()
      .eq("id", data.user_id);
    if (profileErr) {
      throw new Error(`Cannot delete profile: ${profileErr.message}`);
    }

    // Delete auth user (cascade cleans up remaining FKs).
    const { error: authErr } = await supabaseAdmin.auth.admin.deleteUser(data.user_id);
    // Ignore "user not found" — auth row was already deleted (e.g. cascade or retry).
    if (authErr && !/not.?found/i.test(authErr.message)) {
      throw new Error(`Cannot delete auth account: ${authErr.message}`);
    }

    // Audit.
    const { data: actorProfile } = await context.supabase
      .from("profiles")
      .select("email")
      .eq("id", context.userId)
      .maybeSingle();
    await supabaseAdmin.from("audit_logs").insert({
      actor_id: context.userId,
      actor_email: actorProfile?.email ?? null,
      action: "user.delete",
      entity_type: "user",
      entity_id: data.user_id,
      details: {
        before: {
          profile: beforeProfile ?? null,
          roles: (beforeRoles ?? []).map((r) => r.role),
        },
      } as never,
    });

    return { ok: true };
  });