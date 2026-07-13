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
import { useServerFn } from "@tanstack/react-start";
import { checkLoginLockout, recordLoginAttempt } from "@/lib/security.functions";

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
    <div className="min-h-dvh bg-secondary/40 lg:grid lg:grid-cols-2">
      {/* Left: brand / founder panel */}
      <div className="relative hidden lg:flex flex-col justify-between overflow-hidden bg-gradient-to-br from-primary via-primary to-primary/80 text-primary-foreground p-10">
        <div className="absolute -top-24 -right-24 h-96 w-96 rounded-full bg-accent/30 blur-3xl" />
        <div className="absolute -bottom-32 -left-24 h-96 w-96 rounded-full bg-white/10 blur-3xl" />

        <div className="relative z-10 flex items-center gap-5">
          <div className="rounded-xl bg-white p-2.5 shadow-lg">
            <img src={collegeLogo.url} alt="Narayana Engineering College logo" className="h-20 w-20 object-contain" />
          </div>
          <div>
            <div className="text-3xl font-bold leading-tight">Narayana Engineering College</div>
            <div className="text-base opacity-80">Gudur · Autonomous · Approved by AICTE</div>
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
      <div className="flex min-h-dvh items-center justify-center px-4 py-8">
        <div className="w-full max-w-md">
          {/* Mobile banner */}
          <div className="lg:hidden mb-6 overflow-hidden rounded-2xl border border-border bg-card shadow-md">
            <div className="relative bg-gradient-to-br from-primary to-primary/80 p-6 text-primary-foreground">
              <div className="flex items-center gap-5">
                <div className="rounded-xl bg-white p-2 shadow-sm">
                  <img src={collegeLogo.url} alt="NEC Logo" className="h-20 w-20 object-contain" />
                </div>
                <div className="min-w-0">
                  <div className="text-xl font-bold leading-tight">Narayana Engineering College</div>
                  <div className="text-sm opacity-85">Gudur · Autonomous</div>
                </div>
              </div>
              <img
                src={collegeBanner.url}
                alt="NEC accreditations"
                className="mt-5 h-36 w-full rounded-lg bg-white object-contain p-2 shadow-sm"
              />
            </div>
            <div className="flex items-center gap-5 p-5">
              <img
                src={founderImg.url}
                alt="Dr. Ponguru Narayana"
                className="h-24 w-20 rounded-lg object-cover ring-2 ring-primary/20"
              />
              <div className="leading-tight">
                <div className="text-xs uppercase tracking-wider text-accent-foreground/70">Founder</div>
                <div className="text-lg font-semibold text-primary">Dr. Ponguru Narayana</div>
                <div className="text-sm text-muted-foreground">Smart Bus Tracking</div>
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
  const [forgotMode, setForgotMode] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);
  const checkLockout = useServerFn(checkLoginLockout);
  const recordAttempt = useServerFn(recordLoginAttempt);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    // Check lockout first (5 failed attempts / 15 min)
    try {
      const lockout = await checkLockout({ data: { email } });
      if (lockout.locked) {
        setLoading(false);
        toast.error("Account temporarily locked. Try again in 15 minutes.");
        return;
      }
    } catch {
      // Fail open if the lockout service is unreachable; auth still applies.
    }

    const { data: signInData, error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);

    // Record the attempt (best-effort, non-blocking failures)
    recordAttempt({
      data: { email, success: !error, userId: signInData?.user?.id },
    }).catch(() => {});

    if (error) {
      const code = (error as { code?: string }).code;
      if (code === "email_not_confirmed" || /confirm/i.test(error.message)) {
        onUnverified(email);
        return;
      }
      toast.error(error.message);
    } else navigate({ to: "/dashboard", replace: true });
  }

  async function handleForgotSubmit(e: React.FormEvent) {
    e.preventDefault();
    setForgotLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setForgotLoading(false);
    if (error) {
      toast.error(error.message);
    } else {
      setForgotSent(true);
      toast.success("Password reset link sent. Check your email.");
    }
  }

  if (forgotSent) {
    return (
      <div className="space-y-4 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-secondary text-primary">
          <MailCheck className="h-7 w-7" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-foreground">Check your email</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            We sent a password reset link to
          </p>
          <p className="mt-0.5 text-sm font-medium text-foreground break-all">{forgotEmail}</p>
        </div>
        <Button type="button" variant="ghost" className="w-full" onClick={() => { setForgotMode(false); setForgotSent(false); setForgotEmail(""); }}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to sign in
        </Button>
      </div>
    );
  }

  if (forgotMode) {
    return (
      <form onSubmit={handleForgotSubmit} className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Reset your password</h2>
          <p className="text-sm text-muted-foreground">Enter your email and we will send you a reset link.</p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="forgot-email">Email</Label>
          <Input id="forgot-email" type="email" required value={forgotEmail} onChange={(e) => setForgotEmail(e.target.value)} placeholder="you@narayana.edu" />
        </div>
        <Button type="submit" className="w-full" disabled={forgotLoading}>
          {forgotLoading ? "Sending…" : "Send reset link"}
        </Button>
        <Button type="button" variant="ghost" className="w-full" onClick={() => setForgotMode(false)}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to sign in
        </Button>
      </form>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="signin-email">Enter your register email</Label>
        <Input id="signin-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@narayana.edu" />
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="signin-password">Password</Label>
          <button type="button" onClick={() => setForgotMode(true)} className="text-xs text-primary hover:underline">
            Forgot password?
          </button>
        </div>
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