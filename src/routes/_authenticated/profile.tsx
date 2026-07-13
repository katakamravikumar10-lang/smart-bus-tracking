import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSession, useRole } from "@/lib/auth-hooks";
import { BrandHeader } from "@/components/BrandHeader";
import { PageHeader } from "@/components/nav/PageHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Camera, KeyRound, Save, LogOut } from "lucide-react";
import { useAvatarUrl, avatarInitials } from "@/lib/avatar";
import { AppFooter } from "@/components/AppFooter";
import { audit } from "@/lib/audit";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({ meta: [{ title: "Profile · Narayana Bus Tracker" }] }),
  component: ProfilePage,
});

type ProfileRow = {
  id: string;
  email: string | null;
  full_name: string | null;
  phone: string | null;
  department: string | null;
  roll_no: string | null;
  avatar_url: string | null;
  employee_id: string | null;
  license_no: string | null;
};

type AssignmentInfo = { busNumber: string | null; routeName: string | null; boardingStop: string | null };

function ProfilePage() {
  const { user, loading: sessionLoading } = useSession();
  const { role } = useRole(user);
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [assignment, setAssignment] = useState<AssignmentInfo>({ busNumber: null, routeName: null, boardingStop: null });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const avatarUrl = useAvatarUrl(profile?.avatar_url);

  // Password form
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPw, setChangingPw] = useState(false);

  useEffect(() => {
    if (!user) return;
    let active = true;
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id,email,full_name,phone,department,roll_no,avatar_url,employee_id,license_no")
        .eq("id", user.id)
        .maybeSingle();
      if (!active) return;
      setProfile((data as ProfileRow | null) ?? {
        id: user.id,
        email: user.email ?? null,
        full_name: null, phone: null, department: null, roll_no: null,
        avatar_url: null, employee_id: null, license_no: null,
      });

      // Load assignment info based on role
      let busId: string | null = null;
      let boardingStop: string | null = null;
      const [{ data: sa }, { data: da }] = await Promise.all([
        supabase.from("student_assignments").select("bus_id,boarding_stop").eq("user_id", user.id).maybeSingle(),
        supabase.from("driver_assignments").select("bus_id").eq("driver_id", user.id).eq("active", true).maybeSingle(),
      ]);
      if (sa) { busId = sa.bus_id; boardingStop = sa.boarding_stop; }
      else if (da) { busId = da.bus_id; }

      if (busId) {
        const { data: bus } = await supabase.from("buses").select("bus_number,route_id").eq("id", busId).maybeSingle();
        let routeName: string | null = null;
        if (bus?.route_id) {
          const { data: r } = await supabase.from("routes").select("name").eq("id", bus.route_id).maybeSingle();
          routeName = r?.name ?? null;
        }
        if (active) setAssignment({ busNumber: bus?.bus_number ?? null, routeName, boardingStop });
      }
      if (active) setLoading(false);
    })();
    return () => { active = false; };
  }, [user]);

  if (sessionLoading || !user) {
    return (
      <div className="min-h-dvh bg-background">
        <BrandHeader subtitle="Profile" />
        <main className="mx-auto max-w-3xl px-4 py-6">
          <Skeleton className="h-64 w-full rounded-xl" />
        </main>
      </div>
    );
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!profile || !user) return;
    setSaving(true);
    const payload = {
      id: user.id,
      full_name: profile.full_name,
      phone: profile.phone,
      department: profile.department,
      roll_no: profile.roll_no,
      employee_id: profile.employee_id,
      license_no: profile.license_no,
    };
    const { error } = await supabase.from("profiles").upsert(payload, { onConflict: "id" });
    setSaving(false);
    if (error) toast.error(error.message);
    else {
      audit("profile.update", { entityType: "profile", entityId: user.id, after: payload });
      toast.success("Profile updated");
    }
  }

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (file.size > 5 * 1024 * 1024) return toast.error("Image must be under 5 MB");
    setUploading(true);
    const ext = file.name.split(".").pop() ?? "jpg";
    const path = `${user.id}/avatar-${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage.from("avatars").upload(path, file, { upsert: true, contentType: file.type });
    if (upErr) {
      setUploading(false);
      return toast.error(upErr.message);
    }
    const { error: dbErr } = await supabase.from("profiles").update({ avatar_url: path }).eq("id", user.id);
    setUploading(false);
    if (dbErr) return toast.error(dbErr.message);
    setProfile((p) => (p ? { ...p, avatar_url: path } : p));
    audit("profile.avatar.update", { entityType: "profile", entityId: user.id, details: { path } });
    toast.success("Profile picture updated");
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword.length < 6) return toast.error("Password must be at least 6 characters");
    if (newPassword !== confirmPassword) return toast.error("Passwords do not match");
    setChangingPw(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setChangingPw(false);
    if (error) return toast.error(error.message);
    setNewPassword(""); setConfirmPassword("");
    audit("account.password.change", { entityType: "auth", entityId: user.id });
    toast.success("Password updated");
  }

  async function signOut() {
    await supabase.auth.signOut();
    window.location.assign("/auth");
  }

  const isDriver = role === "driver";
  const isFaculty = role === "faculty";
  const isStudent = role === "student" || !role;

  return (
    <div className="min-h-dvh bg-background">
      <BrandHeader subtitle="Profile" />
      <main className="mx-auto max-w-3xl px-4 py-6 space-y-6">
        <PageHeader
          title="Profile"
          description="Manage your personal information, avatar, and password."
          breadcrumbs={[
            { label: "Dashboard", to: "/dashboard" },
            { label: "Profile" },
          ]}
        />
        <Card>
          <CardHeader className="flex-row items-start gap-4 space-y-0">
            <div className="relative">
              <Avatar className="h-20 w-20">
                {avatarUrl && <AvatarImage src={avatarUrl} alt={profile?.full_name ?? "Profile"} />}
                <AvatarFallback className="bg-primary text-primary-foreground text-lg">
                  {avatarInitials(profile?.full_name ?? user.email)}
                </AvatarFallback>
              </Avatar>
              <Button
                type="button" size="icon" variant="secondary"
                className="absolute -bottom-1 -right-1 h-8 w-8 rounded-full shadow"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                aria-label="Change profile picture"
              >
                <Camera className="h-4 w-4" />
              </Button>
              <input ref={fileRef} type="file" accept="image/*" hidden onChange={handleAvatarChange} />
            </div>
            <div className="flex-1 min-w-0">
              <CardTitle className="truncate">{profile?.full_name || "Your profile"}</CardTitle>
              <CardDescription className="truncate">{profile?.email ?? user.email}</CardDescription>
              <div className="mt-2 flex flex-wrap gap-2">
                {role && <Badge variant="secondary" className="capitalize">{role}</Badge>}
                {assignment.busNumber && <Badge variant="outline">Bus {assignment.busNumber}</Badge>}
                {assignment.routeName && <Badge variant="outline">{assignment.routeName}</Badge>}
              </div>
            </div>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Personal information</CardTitle>
            <CardDescription>Update the details visible to the transport office.</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-48 w-full" />
            ) : (
              <form onSubmit={handleSave} className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="full_name">Full name</Label>
                  <Input id="full_name" value={profile?.full_name ?? ""} onChange={(e) => setProfile((p) => p && { ...p, full_name: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" value={profile?.email ?? ""} disabled />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="phone">Phone</Label>
                  <Input id="phone" value={profile?.phone ?? ""} onChange={(e) => setProfile((p) => p && { ...p, phone: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="department">Department</Label>
                  <Input id="department" value={profile?.department ?? ""} onChange={(e) => setProfile((p) => p && { ...p, department: e.target.value })} />
                </div>
                {isStudent && (
                  <div className="space-y-1.5">
                    <Label htmlFor="roll_no">Student roll number</Label>
                    <Input id="roll_no" value={profile?.roll_no ?? ""} onChange={(e) => setProfile((p) => p && { ...p, roll_no: e.target.value })} />
                  </div>
                )}
                {isFaculty && (
                  <div className="space-y-1.5">
                    <Label htmlFor="employee_id">Employee ID</Label>
                    <Input id="employee_id" value={profile?.employee_id ?? ""} onChange={(e) => setProfile((p) => p && { ...p, employee_id: e.target.value })} />
                  </div>
                )}
                {isDriver && (
                  <div className="space-y-1.5">
                    <Label htmlFor="license_no">Driver license number</Label>
                    <Input id="license_no" value={profile?.license_no ?? ""} onChange={(e) => setProfile((p) => p && { ...p, license_no: e.target.value })} />
                  </div>
                )}
                {(assignment.busNumber || assignment.routeName || assignment.boardingStop) && (
                  <div className="sm:col-span-2 rounded-lg border border-border bg-muted/40 p-3 text-sm">
                    <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Bus assignment</div>
                    <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1">
                      {assignment.busNumber && <span><span className="text-muted-foreground">Bus:</span> {assignment.busNumber}</span>}
                      {assignment.routeName && <span><span className="text-muted-foreground">Route:</span> {assignment.routeName}</span>}
                      {assignment.boardingStop && <span><span className="text-muted-foreground">Boarding stop:</span> {assignment.boardingStop}</span>}
                    </div>
                  </div>
                )}
                <div className="sm:col-span-2 flex justify-end">
                  <Button type="submit" disabled={saving}>
                    <Save className="mr-2 h-4 w-4" /> {saving ? "Saving…" : "Save changes"}
                  </Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Change password</CardTitle>
            <CardDescription>Use at least 6 characters. You'll stay signed in on this device.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleChangePassword} className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="new_pw">New password</Label>
                <Input id="new_pw" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} minLength={6} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="confirm_pw">Confirm password</Label>
                <Input id="confirm_pw" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} minLength={6} />
              </div>
              <div className="sm:col-span-2 flex justify-end">
                <Button type="submit" disabled={changingPw || !newPassword}>
                  <KeyRound className="mr-2 h-4 w-4" /> {changingPw ? "Updating…" : "Update password"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button variant="outline" onClick={signOut}>
            <LogOut className="mr-2 h-4 w-4" /> Sign out
          </Button>
        </div>
      </main>
      <AppFooter />
    </div>
  );
}