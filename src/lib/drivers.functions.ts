import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const createDriverAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        full_name: z.string().trim().min(1).max(120),
        email: z.string().trim().toLowerCase().email().max(320),
        phone: z.string().trim().max(40).optional().nullable(),
        employee_id: z.string().trim().max(80).optional().nullable(),
        password: z.string().min(8).max(128),
        bus_id: z.string().uuid().optional().nullable(),
        route_id: z.string().uuid().optional().nullable(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Forbidden");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: {
        full_name: data.full_name,
        phone: data.phone ?? null,
        employee_id: data.employee_id ?? null,
        role: "driver",
      },
    });
    if (createErr || !created?.user) {
      throw new Error(createErr?.message ?? "Failed to create user");
    }
    const newUserId = created.user.id;

    // Ensure profile row exists / is populated (handle_new_user trigger creates
    // a base row; upsert to fill driver-specific fields).
    const { error: profileErr } = await supabaseAdmin.from("profiles").upsert(
      {
        id: newUserId,
        email: data.email,
        full_name: data.full_name,
        phone: data.phone ?? null,
        employee_id: data.employee_id ?? null,
      },
      { onConflict: "id" },
    );
    if (profileErr) throw new Error(profileErr.message);

    // Force driver role (trigger self-assigns student/faculty only).
    await supabaseAdmin.from("user_roles").delete().eq("user_id", newUserId);
    const { error: roleErr } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: newUserId, role: "driver" });
    if (roleErr) throw new Error(roleErr.message);

    // Optional assignments.
    let assignmentId: string | null = null;
    if (data.bus_id) {
      const { data: yr } = await supabaseAdmin
        .from("academic_years")
        .select("id")
        .eq("status", "active")
        .maybeSingle();
      if (!yr?.id) {
        throw new Error("Please create or activate an Academic Year before assigning drivers.");
      }
      {
        // If a route is also chosen, sync the bus to that route.
        if (data.route_id) {
          await supabaseAdmin
            .from("buses")
            .update({ route_id: data.route_id })
            .eq("id", data.bus_id);
        }
        await supabaseAdmin
          .from("driver_assignments")
          .update({ active: false })
          .eq("driver_id", newUserId);
        const { data: assn, error: assnErr } = await supabaseAdmin
          .from("driver_assignments")
          .upsert(
            {
              driver_id: newUserId,
              bus_id: data.bus_id,
              active: true,
              academic_year_id: yr.id,
            },
            { onConflict: "driver_id,bus_id" },
          )
          .select("id")
          .maybeSingle();
        if (assnErr) throw new Error(assnErr.message);
        assignmentId = assn?.id ?? null;
      }
    }

    // Audit log
    const { data: actorProfile } = await context.supabase
      .from("profiles")
      .select("email")
      .eq("id", context.userId)
      .maybeSingle();
    await supabaseAdmin.from("audit_logs").insert({
      actor_id: context.userId,
      actor_email: actorProfile?.email ?? null,
      action: "driver.create",
      entity_type: "driver",
      entity_id: newUserId,
      details: {
        email: data.email,
        full_name: data.full_name,
        bus_id: data.bus_id ?? null,
        route_id: data.route_id ?? null,
        assignment_id: assignmentId,
      } as never,
    });

    return { ok: true, user_id: newUserId };
  });