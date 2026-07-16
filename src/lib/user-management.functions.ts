import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const RoleSchema = z.enum(["driver", "student", "faculty", "admin"]);

async function assertAdmin(ctx: { supabase: any; userId: string }) {
  const { data, error } = await ctx.supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", ctx.userId)
    .eq("role", "admin")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Forbidden: admin only");
}

const CreateInput = z.object({
  email: z.string().trim().toLowerCase().email().max(320),
  password: z.string().min(6).max(200),
  role: RoleSchema,
  full_name: z.string().trim().max(200).optional(),
  phone: z.string().trim().max(40).optional(),
  roll_no: z.string().trim().max(60).optional(),
  employee_id: z.string().trim().max(60).optional(),
  license_no: z.string().trim().max(60).optional(),
  department: z.string().trim().max(100).optional(),
  branch: z.string().trim().max(100).optional(),
  section: z.string().trim().max(20).optional(),
  year_of_study: z.number().int().min(1).max(10).nullable().optional(),
  academic_year_id: z.string().uuid().nullable().optional(),
  send_reset_email: z.boolean().optional(),
  redirect_to: z.string().url().optional(),
});

export const adminCreateUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => CreateInput.parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: {
        full_name: data.full_name ?? null,
        phone: data.phone ?? null,
        roll_no: data.roll_no ?? null,
        department: data.department ?? null,
        role: data.role === "admin" ? "student" : data.role,
      },
    });
    if (error || !created.user) throw new Error(error?.message ?? "Failed to create user");
    const userId = created.user.id;

    // Ensure profile row (handle_new_user trigger inserts basic fields; upsert extras)
    await supabaseAdmin.from("profiles").upsert({
      id: userId,
      email: data.email,
      full_name: data.full_name ?? null,
      phone: data.phone ?? null,
      roll_no: data.roll_no ?? null,
      employee_id: data.employee_id ?? null,
      license_no: data.license_no ?? null,
      department: data.department ?? null,
      branch: data.branch ?? null,
      section: data.section ?? null,
      year_of_study: data.year_of_study ?? null,
      academic_year_id: data.academic_year_id ?? null,
    });

    // Force the exact role (trigger may have inserted a default)
    await supabaseAdmin.from("user_roles").delete().eq("user_id", userId);
    await supabaseAdmin.from("user_roles").insert({ user_id: userId, role: data.role });

    if (data.send_reset_email) {
      await supabaseAdmin.auth.resetPasswordForEmail(data.email, {
        redirectTo: data.redirect_to,
      });
    }

    return { ok: true, userId };
  });

const UpdateInput = z.object({
  userId: z.string().uuid(),
  patch: z.object({
    full_name: z.string().trim().max(200).nullable().optional(),
    phone: z.string().trim().max(40).nullable().optional(),
    roll_no: z.string().trim().max(60).nullable().optional(),
    employee_id: z.string().trim().max(60).nullable().optional(),
    license_no: z.string().trim().max(60).nullable().optional(),
    department: z.string().trim().max(100).nullable().optional(),
    branch: z.string().trim().max(100).nullable().optional(),
    section: z.string().trim().max(20).nullable().optional(),
    year_of_study: z.number().int().min(1).max(10).nullable().optional(),
    academic_year_id: z.string().uuid().nullable().optional(),
    student_status: z.enum(["active", "inactive", "graduated", "archived"]).optional(),
  }),
});

export const adminUpdateUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => UpdateInput.parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("profiles")
      .update(data.patch)
      .eq("id", data.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminDeleteUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ userId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    if (data.userId === context.userId) throw new Error("You cannot delete your own account");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminResetUserPassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        email: z.string().trim().toLowerCase().email().max(320),
        redirect_to: z.string().url().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.resetPasswordForEmail(data.email, {
      redirectTo: data.redirect_to,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminSetUserPassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        userId: z.string().uuid(),
        password: z.string().min(6).max(200),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.updateUserById(data.userId, {
      password: data.password,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });