import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import collegeLogo from "@/assets/college-logo.png.asset.json";
import collegeBanner from "@/assets/college-banner.jpg.asset.json";
import founderImg from "@/assets/founder.webp.asset.json";
import { MailCheck, RefreshCw, ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in · Narayana Bus Tracker" },
      { name: "description", content: "Sign in to the Narayana Engineering College Smart Bus Tracking system." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard", replace: true });
      else setChecking(false);
    });
  }, [navigate]);

  if (checking) return null;

  return (
    <div className="min-h-screen bg-secondary/40 lg:grid lg:grid-cols-2">
      {/* Left: brand / founder panel */}
      <div className="relative hidden lg:flex flex-col justify-between overflow-hidden bg-gradient-to-br from-primary via-primary to-primary/80 text-primary-foreground p-10">
        <div className="absolute -top-24 -right-24 h-96 w-96 rounded-full bg-accent/30 blur-3xl" />
        <div className="absolute -bottom-32 -left-24 h-96 w-96 rounded-full bg-white/10 blur-3xl" />

        <div className="relative z-10 flex items-center gap-4">
          <div className="rounded-xl bg-white p-2 shadow-lg">
            <img src={collegeLogo.url} alt="Narayana Engineering College logo" className="h-16 w-16 object-contain" />
          </div>
          <div>
            <div className="text-2xl font-bold leading-tight">Narayana Engineering College</div>
            <div className="text-sm opacity-80">Gudur · Autonomous · Approved by AICTE</div>
          </div>
        </div>

        <div className="relative z-10 flex items-end gap-6">
          <div className="relative">
            <div className="absolute inset-0 -m-2 rounded-2xl bg-accent/40 blur-2xl" />
            <img
              src={founderImg.url}
              alt="Dr. Ponguru Narayana, Founder"
              className="relative h-56 w-44 rounded-2xl object-cover shadow-2xl ring-4 ring-white/20"
            />
          </div>
          <div className="pb-2">
            <div className="text-[11px] uppercase tracking-widest text-accent">Founder</div>
            <div className="mt-1 text-2xl font-bold leading-tight">Dr. Ponguru Narayana</div>
            <div className="mt-2 h-0.5 w-16 bg-accent" />
            <p className="mt-3 max-w-xs text-sm opacity-90">
              “Committed to excellence in engineering education.”
            </p>
          </div>
        </div>

        <div className="relative z-10">
          <div className="rounded-xl border border-white/20 bg-white/10 p-4 backdrop-blur">
            <div className="text-sm font-semibold">Smart Bus Tracking System</div>
            <p className="mt-1 text-xs opacity-85">
              Live GPS · Arrival alerts · Route management for students, faculty, drivers and admins.
            </p>
          </div>
        </div>
      </div>

      {/* Right: auth panel */}
      <div className="flex min-h-screen items-center justify-center px-4 py-8">
        <div className="w-full max-w-md">
          {/* Mobile banner */}
          <div className="lg:hidden mb-6 overflow-hidden rounded-2xl border border-border bg-card shadow-md">
            <div className="relative bg-gradient-to-br from-primary to-primary/80 p-4 text-primary-foreground">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-white p-1">
                  <img src={collegeLogo.url} alt="NEC Logo" className="h-10 w-10 object-contain" />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-bold leading-tight">Narayana Engineering College</div>
                  <div className="text-[11px] opacity-85">Gudur · Autonomous</div>
                </div>
              </div>
              <img
                src={collegeBanner.url}
                alt="NEC accreditations"
                className="mt-3 h-14 w-full rounded-md bg-white object-contain p-1"
              />
            </div>
            <div className="flex items-center gap-3 p-3">
              <img
                src={founderImg.url}
                alt="Dr. Ponguru Narayana"
                className="h-14 w-12 rounded-md object-cover ring-2 ring-primary/20"
              />
              <div className="leading-tight">
                <div className="text-[10px] uppercase tracking-wider text-accent-foreground/70">Founder</div>
                <div className="text-sm font-semibold text-primary">Dr. Ponguru Narayana</div>
                <div className="text-[11px] text-muted-foreground">Smart Bus Tracking</div>
              </div>
            </div>
          </div>

          <div className="mb-5 hidden lg:block text-center">
            <h1 className="text-2xl font-bold text-primary">Welcome back</h1>
            <p className="text-sm text-muted-foreground">Sign in to the college bus tracker</p>
          </div>

          <div className="rounded-2xl border border-border bg-card p-6 shadow-xl shadow-primary/5">
            {pendingEmail ? (
              <VerifyPending email={pendingEmail} onBack={() => setPendingEmail(null)} />
            ) : (
              <Tabs defaultValue="signin">
                <TabsList className="grid w-full grid-cols-2 mb-4">
                  <TabsTrigger value="signin">Sign in</TabsTrigger>
                  <TabsTrigger value="signup">Register</TabsTrigger>
                </TabsList>
                <TabsContent value="signin">
                  <SignInForm onUnverified={setPendingEmail} />
                </TabsContent>
                <TabsContent value="signup">
                  <SignUpForm onPending={setPendingEmail} />
                </TabsContent>
              </Tabs>
            )}
          </div>

          <p className="mt-4 text-center text-xs text-muted-foreground">
            Trouble signing in? Contact the college transport office.
          </p>
        </div>
      </div>
    </div>
  );
}

function SignInForm({ onUnverified }: { onUnverified: (email: string) => void }) {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      const code = (error as { code?: string }).code;
      if (code === "email_not_confirmed" || /confirm/i.test(error.message)) {
        onUnverified(email);
        return;
      }
      toast.error(error.message);
    } else navigate({ to: "/dashboard", replace: true });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="signin-email">College Email</Label>
        <Input id="signin-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@narayana.edu" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="signin-password">Password</Label>
        <Input id="signin-password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
      </div>
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  );
}

function SignUpForm({ onPending }: { onPending: (email: string) => void }) {
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    password: "",
    phone: "",
    roll_no: "",
    department: "",
    role: "student" as "student" | "faculty" | "driver",
  });
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        emailRedirectTo: window.location.origin,
        data: {
          full_name: form.full_name,
          phone: form.phone,
          roll_no: form.roll_no,
          department: form.department,
          role: form.role,
        },
      },
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    if (data.session) {
      toast.success("Account created!");
      window.location.assign("/dashboard");
    } else {
      onPending(form.email);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="space-y-1.5">
        <Label>I am a</Label>
        <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v as typeof form.role })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="student">Student</SelectItem>
            <SelectItem value="faculty">Faculty</SelectItem>
            <SelectItem value="driver">Driver</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label>Full name</Label>
        <Input required value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
      </div>
      <div className="space-y-1.5">
        <Label>Email</Label>
        <Input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
      </div>
      <div className="space-y-1.5">
        <Label>Password</Label>
        <Input type="password" required minLength={6} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1.5">
          <Label>Phone</Label>
          <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        </div>
        {form.role === "student" ? (
          <div className="space-y-1.5">
            <Label>Roll no.</Label>
            <Input value={form.roll_no} onChange={(e) => setForm({ ...form, roll_no: e.target.value })} />
          </div>
        ) : (
          <div className="space-y-1.5">
            <Label>Department</Label>
            <Input value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} />
          </div>
        )}
      </div>
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? "Creating…" : "Create account"}
      </Button>
      <p className="text-center text-[11px] text-muted-foreground">
        Administrator accounts are provisioned by the transport office.
      </p>
    </form>
  );
}

function VerifyPending({ email, onBack }: { email: string; onBack: () => void }) {
  const [resending, setResending] = useState(false);
  const [checking, setChecking] = useState(false);
  const navigate = useNavigate();

  async function resend() {
    setResending(true);
    const { error } = await supabase.auth.resend({
      type: "signup",
      email,
      options: { emailRedirectTo: window.location.origin },
    });
    setResending(false);
    if (error) toast.error(error.message);
    else toast.success("Verification email sent. Check your inbox.");
  }

  async function recheck() {
    setChecking(true);
    const { data } = await supabase.auth.getSession();
    setChecking(false);
    if (data.session) navigate({ to: "/dashboard", replace: true });
    else toast.info("Still unverified. Open the link in the email we sent you.");
  }

  return (
    <div className="space-y-4 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-secondary text-primary">
        <MailCheck className="h-7 w-7" />
      </div>
      <div>
        <h2 className="text-lg font-semibold text-foreground">Verify your email</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          We sent a confirmation link to
        </p>
        <p className="mt-0.5 text-sm font-medium text-foreground break-all">{email}</p>
      </div>
      <div className="rounded-lg border border-dashed border-border bg-secondary/40 p-3 text-left text-xs text-muted-foreground">
        <p className="font-medium text-foreground">Status: Not verified yet</p>
        <p className="mt-1">
          Access to the dashboard is blocked until you click the confirmation link.
          Check your spam folder if the email hasn't arrived.
        </p>
      </div>
      <div className="space-y-2">
        <Button type="button" className="w-full" onClick={recheck} disabled={checking}>
          <RefreshCw className={`mr-2 h-4 w-4 ${checking ? "animate-spin" : ""}`} />
          I've verified — continue
        </Button>
        <Button type="button" variant="outline" className="w-full" onClick={resend} disabled={resending}>
          {resending ? "Sending…" : "Resend verification email"}
        </Button>
        <Button type="button" variant="ghost" className="w-full" onClick={onBack}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to sign in
        </Button>
      </div>
    </div>
  );
}