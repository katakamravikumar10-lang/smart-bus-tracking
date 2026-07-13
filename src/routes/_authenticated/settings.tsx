import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSession, useRole } from "@/lib/auth-hooks";
import { isDemoModeAllowed } from "@/lib/demo-mode";
import { BrandHeader } from "@/components/BrandHeader";
import { PageHeader } from "@/components/nav/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useTheme } from "@/lib/theme";
import { APP_VERSION } from "@/lib/version";
import { AppFooter } from "@/components/AppFooter";
import { Link } from "@tanstack/react-router";
import { useAppSettings } from "@/lib/app-settings";
import { toast } from "sonner";
import { audit } from "@/lib/audit";
import { Bell, Palette, ShieldAlert, Languages, Gauge, Info, LifeBuoy, FlaskConical } from "lucide-react";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({ meta: [{ title: "Settings · Narayana Bus Tracker" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const { user, loading } = useSession();
  const { role } = useRole(user);
  const { theme, setTheme } = useTheme();
  const { settings, update, hydrated } = useAppSettings();
  const [newEmail, setNewEmail] = useState("");
  const [emailLoading, setEmailLoading] = useState(false);
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [pwLoading, setPwLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  if (loading || !user) {
    return (
      <div className="min-h-dvh bg-background">
        <BrandHeader subtitle="Settings" />
        <div className="mx-auto max-w-3xl px-4 py-6 text-sm text-muted-foreground">Loading…</div>
      </div>
    );
  }

  async function updateEmail(e: React.FormEvent) {
    e.preventDefault();
    setEmailLoading(true);
    const { error } = await supabase.auth.updateUser({ email: newEmail });
    setEmailLoading(false);
    if (error) toast.error(error.message);
    else {
      audit("account.email.change.request", { entityType: "auth", entityId: user?.id, details: { newEmail } });
      toast.success("Confirmation link sent to your new email");
    }
  }

  async function changePw(e: React.FormEvent) {
    e.preventDefault();
    if (pw.length < 6) return toast.error("Password must be at least 6 characters");
    if (pw !== pw2) return toast.error("Passwords do not match");
    setPwLoading(true);
    const { error } = await supabase.auth.updateUser({ password: pw });
    setPwLoading(false);
    if (error) return toast.error(error.message);
    setPw(""); setPw2("");
    audit("account.password.change", { entityType: "auth", entityId: user?.id });
    toast.success("Password updated");
  }

  async function deleteAccount() {
    setDeleting(true);
    // Best-effort: mark profile & sign out. Actual auth deletion requires an admin action.
    const { error } = await supabase.from("profiles").update({ full_name: "[deleted]" }).eq("id", user!.id);
    if (error) {
      setDeleting(false);
      return toast.error(error.message);
    }
    audit("account.delete", { entityType: "profile", entityId: user!.id });
    await supabase.auth.signOut();
    window.location.assign("/auth");
  }

  return (
    <div className="min-h-dvh bg-background">
      <BrandHeader subtitle="Settings" />
      <main className="mx-auto max-w-3xl px-4 py-6 space-y-6">
        <PageHeader
          title="Settings"
          description="Appearance, notifications, and account preferences."
          breadcrumbs={[
            { label: "Dashboard", to: "/dashboard" },
            { label: "Settings" },
          ]}
        />
        {/* Appearance */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Palette className="h-5 w-5 text-accent" /> Appearance</CardTitle>
            <CardDescription>Choose how the app looks on this device.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Theme</Label>
              <Select value={theme} onValueChange={(v) => setTheme(v as "light" | "dark" | "system")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">Light</SelectItem>
                  <SelectItem value="dark">Dark</SelectItem>
                  <SelectItem value="system">Match system</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="flex items-center gap-2"><Languages className="h-4 w-4" /> Language</Label>
              <Select value={settings.language} onValueChange={(v) => update("language", v as "en" | "te")} disabled={!hydrated}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="te">తెలుగు (Telugu)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">Telugu translations rolling out gradually.</p>
            </div>
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Bell className="h-5 w-5 text-accent" /> Notifications</CardTitle>
            <CardDescription>Choose which alerts you want to receive.</CardDescription>
          </CardHeader>
          <CardContent className="divide-y divide-border">
            {[
              { key: "notifyBusArrival", label: "Bus arrival alerts", desc: "Notify me when my bus is approaching my stop." },
              { key: "notifyRouteChange", label: "Route change notifications", desc: "Any change to my assigned route." },
              { key: "notifyAnnouncements", label: "College announcements", desc: "General messages from the transport office." },
              { key: "notifyEmergency", label: "Emergency alerts", desc: "Critical safety notices. Recommended: on.", highlight: true },
              { key: "pushEnabled", label: "Push notifications", desc: "Enable browser/device push where available." },
            ].map((row) => (
              <div key={row.key} className="flex items-start justify-between gap-4 py-3">
                <div className="min-w-0">
                  <div className="text-sm font-medium">{row.label} {row.highlight && <span className="ml-1 text-[10px] uppercase tracking-wide text-destructive">Recommended</span>}</div>
                  <div className="text-xs text-muted-foreground">{row.desc}</div>
                </div>
                <Switch
                  checked={settings[row.key as keyof typeof settings] as boolean}
                  disabled={!hydrated}
                  onCheckedChange={(v) => update(row.key as keyof typeof settings, v as never)}
                  aria-label={row.label}
                />
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Application settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Gauge className="h-5 w-5 text-accent" /> Application</CardTitle>
            <CardDescription>GPS refresh cadence for the driver simulator and live map.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>GPS update frequency</Label>
              <Select
                value={String(settings.gpsUpdateSeconds)}
                onValueChange={(v) => update("gpsUpdateSeconds", Number(v))}
                disabled={!hydrated}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">Every 5 seconds</SelectItem>
                  <SelectItem value="10">Every 10 seconds</SelectItem>
                  <SelectItem value="15">Every 15 seconds</SelectItem>
                  <SelectItem value="30">Every 30 seconds</SelectItem>
                  <SelectItem value="60">Every 1 minute</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Account */}
        <Card>
          <CardHeader>
            <CardTitle>Account</CardTitle>
            <CardDescription>Signed in as {user.email}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <form onSubmit={updateEmail} className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
              <div className="space-y-1.5">
                <Label htmlFor="new_email">Update email</Label>
                <Input id="new_email" type="email" placeholder="new@narayana.edu" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} required />
              </div>
              <Button type="submit" disabled={emailLoading}>{emailLoading ? "Sending…" : "Update"}</Button>
            </form>

            <Separator />

            <form onSubmit={changePw} className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="pw">New password</Label>
                <Input id="pw" type="password" value={pw} onChange={(e) => setPw(e.target.value)} minLength={6} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pw2">Confirm password</Label>
                <Input id="pw2" type="password" value={pw2} onChange={(e) => setPw2(e.target.value)} minLength={6} />
              </div>
              <div className="sm:col-span-2 flex justify-end">
                <Button type="submit" disabled={pwLoading || !pw}>{pwLoading ? "Updating…" : "Change password"}</Button>
              </div>
            </form>

            {role === "admin" && (
              <>
                <Separator />
                <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4">
                  <div className="flex items-start gap-3">
                    <ShieldAlert className="mt-0.5 h-5 w-5 text-destructive" />
                    <div className="flex-1">
                      <div className="font-medium text-destructive">Delete account</div>
                      <p className="mt-1 text-sm text-muted-foreground">
                        This clears your profile and signs you out. Contact the transport office to fully remove authentication access.
                      </p>
                      <div className="mt-3">
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="destructive" size="sm" disabled={deleting}>
                              {deleting ? "Deleting…" : "Delete my account"}
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete your account?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This clears your profile and signs you out. You will lose access to the admin dashboard immediately.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={deleteAccount} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                Delete account
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {role === "admin" && isDemoModeAllowed() && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FlaskConical className="h-5 w-5 text-accent" /> Development Settings
              </CardTitle>
              <CardDescription>
                Administrator-only controls for demo and testing tooling. Demo data is always tagged
                and kept separate from real production records.
              </CardDescription>
            </CardHeader>
            <CardContent className="divide-y divide-border">
              <div className="flex items-start justify-between gap-4 py-3">
                <div className="min-w-0">
                  <div className="text-sm font-medium">Demo Mode</div>
                  <div className="text-xs text-muted-foreground">
                    When enabled, admins see the Demo Mode tab with tools to load demo data, run the
                    GPS simulator, and clear demo records. Disable to hide demo tools and demo
                    accounts from the dashboard.
                  </div>
                </div>
                <Switch
                  checked={settings.demoModeEnabled}
                  disabled={!hydrated}
                  onCheckedChange={(v) => {
                    update("demoModeEnabled", v as never);
                    audit("settings.demo_mode.toggle", { entityType: "settings", details: { enabled: v } });
                    toast.success(v ? "Demo Mode enabled" : "Demo Mode disabled");
                  }}
                  aria-label="Demo Mode"
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* About & version */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Info className="h-5 w-5 text-accent" /> About</CardTitle>
            <CardDescription>Application information and support.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap items-center justify-between gap-3 text-sm">
            <div>
              <div className="font-medium text-foreground">Narayana Bus Tracker</div>
              <div className="text-xs text-muted-foreground">Version {APP_VERSION}</div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button asChild variant="outline" size="sm">
                <Link to="/help"><LifeBuoy className="mr-2 h-4 w-4" /> Help & Support</Link>
              </Button>
              <Button asChild variant="outline" size="sm">
                <Link to="/about"><Info className="mr-2 h-4 w-4" /> About</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
      <AppFooter />
    </div>
  );
}