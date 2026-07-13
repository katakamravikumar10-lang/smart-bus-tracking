import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { BrandHeader } from "@/components/BrandHeader";
import { AppFooter } from "@/components/AppFooter";
import { PageHeader } from "@/components/nav/PageHeader";
import { Breadcrumbs } from "@/components/nav/Breadcrumbs";
import { BackButton } from "@/components/nav/BackButton";
import { Button } from "@/components/ui/button";
import { useSession, useRole } from "@/lib/auth-hooks";
import { listAuditLogs, listLoginHistory } from "@/lib/security.functions";
import { EmptyState } from "@/components/EmptyState";
import { ShieldCheck } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

export const Route = createFileRoute("/_authenticated/audit")({
  head: () => ({
    meta: [{ title: "Audit log · Narayana Bus Tracker" }],
  }),
  component: AuditPage,
});

type AuditRow = {
  id: string;
  actor_email: string | null;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  ip: string | null;
  created_at: string;
};

type LoginRow = {
  id: string;
  email: string | null;
  role: string | null;
  ip: string | null;
  user_agent: string | null;
  created_at: string;
};

function AuditPage() {
  const { user, loading } = useSession();
  const { role, loading: roleLoading } = useRole(user);
  const fetchLogs = useServerFn(listAuditLogs);
  const fetchLogins = useServerFn(listLoginHistory);
  const [logs, setLogs] = useState<AuditRow[]>([]);
  const [logins, setLogins] = useState<LoginRow[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (role !== "admin") return;
    setBusy(true);
    Promise.all([
      fetchLogs({ data: { limit: 100, offset: 0 } }),
      fetchLogins({ data: { limit: 100, offset: 0 } }),
    ])
      .then(([a, l]) => {
        setLogs((a.rows as unknown as AuditRow[]) ?? []);
        setLogins((l.rows as unknown as LoginRow[]) ?? []);
      })
      .finally(() => setBusy(false));
  }, [role, fetchLogs, fetchLogins]);

  if (loading || roleLoading) {
    return (
      <div className="min-h-dvh bg-background">
        <BrandHeader />
      </div>
    );
  }

  if (role !== "admin") {
    return (
      <div className="min-h-dvh bg-background">
        <BrandHeader />
        <main className="mx-auto max-w-5xl px-4 py-10">
          <EmptyState
            icon={ShieldCheck}
            title="Admins only"
            description="This page is restricted to administrators."
          />
          <div className="mt-6 flex justify-center">
            <BackButton />
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-background">
      <BrandHeader />
      <main className="mx-auto max-w-6xl px-4 py-6 space-y-4">
        <Breadcrumbs items={[{ label: "Dashboard", to: "/dashboard" }, { label: "Audit log" }]} />
        <PageHeader
          title="Audit log"
          description="Administrator actions and sign-in history."
          actions={<BackButton />}
        />

        <Tabs defaultValue="actions">
          <TabsList>
            <TabsTrigger value="actions">Admin actions</TabsTrigger>
            <TabsTrigger value="logins">Login history</TabsTrigger>
          </TabsList>
          <TabsContent value="actions" className="mt-4">
            <div className="rounded-lg border border-border bg-card">
              <table className="w-full text-sm">
                <thead className="bg-secondary/40 text-left text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2">When</th>
                    <th className="px-3 py-2">Actor</th>
                    <th className="px-3 py-2">Action</th>
                    <th className="px-3 py-2">Entity</th>
                    <th className="px-3 py-2">IP</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((r) => (
                    <tr key={r.id} className="border-t border-border">
                      <td className="px-3 py-2 whitespace-nowrap">{new Date(r.created_at).toLocaleString()}</td>
                      <td className="px-3 py-2">{r.actor_email ?? "—"}</td>
                      <td className="px-3 py-2 font-medium">{r.action}</td>
                      <td className="px-3 py-2 text-muted-foreground">
                        {r.entity_type ? `${r.entity_type}${r.entity_id ? ` · ${r.entity_id}` : ""}` : "—"}
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">{r.ip ?? "—"}</td>
                    </tr>
                  ))}
                  {!busy && logs.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-3 py-6 text-center text-muted-foreground">
                        No admin actions recorded yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </TabsContent>

          <TabsContent value="logins" className="mt-4">
            <div className="rounded-lg border border-border bg-card">
              <table className="w-full text-sm">
                <thead className="bg-secondary/40 text-left text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2">When</th>
                    <th className="px-3 py-2">Email</th>
                    <th className="px-3 py-2">Role</th>
                    <th className="px-3 py-2">IP</th>
                    <th className="px-3 py-2">Device</th>
                  </tr>
                </thead>
                <tbody>
                  {logins.map((r) => (
                    <tr key={r.id} className="border-t border-border">
                      <td className="px-3 py-2 whitespace-nowrap">{new Date(r.created_at).toLocaleString()}</td>
                      <td className="px-3 py-2">{r.email ?? "—"}</td>
                      <td className="px-3 py-2 capitalize">{r.role ?? "—"}</td>
                      <td className="px-3 py-2 text-muted-foreground">{r.ip ?? "—"}</td>
                      <td className="px-3 py-2 text-muted-foreground truncate max-w-xs">{r.user_agent ?? "—"}</td>
                    </tr>
                  ))}
                  {!busy && logins.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-3 py-6 text-center text-muted-foreground">
                        No login history yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </TabsContent>
        </Tabs>

        <div className="pt-2">
          <Button variant="outline" onClick={() => window.location.reload()} disabled={busy}>
            Refresh
          </Button>
        </div>
      </main>
      <AppFooter />
    </div>
  );
}