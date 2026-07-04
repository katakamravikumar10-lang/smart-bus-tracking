import { createFileRoute } from "@tanstack/react-router";
import { useSession, useRole, useProfile } from "@/lib/auth-hooks";
import { BrandHeader } from "@/components/BrandHeader";
import { StudentDashboard } from "@/components/dashboards/StudentDashboard";
import { DriverDashboard } from "@/components/dashboards/DriverDashboard";
import { FacultyDashboard } from "@/components/dashboards/FacultyDashboard";
import { AdminDashboard } from "@/components/dashboards/AdminDashboard";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [{ title: "Dashboard · Narayana Bus Tracker" }],
  }),
  component: DashboardPage,
});

function DashboardPage() {
  const { user, loading } = useSession();
  const { role, loading: roleLoading } = useRole(user);
  const profile = useProfile(user);

  if (loading || roleLoading) {
    return (
      <div className="min-h-screen bg-background">
        <BrandHeader />
        <div className="mx-auto max-w-7xl px-4 py-10 text-sm text-muted-foreground">Loading…</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <BrandHeader subtitle={roleLabel(role) + (profile?.full_name ? ` · ${profile.full_name}` : "")} />
      <main className="mx-auto max-w-7xl px-4 py-6">
        {role === "admin" && <AdminDashboard user={user!} />}
        {role === "driver" && <DriverDashboard user={user!} />}
        {role === "faculty" && <FacultyDashboard user={user!} />}
        {(role === "student" || !role) && <StudentDashboard user={user!} />}
      </main>
    </div>
  );
}

function roleLabel(r: string | null) {
  if (!r) return "Smart Bus Tracking";
  return r.charAt(0).toUpperCase() + r.slice(1);
}