import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
const collegeLogo = { url: "/college-logo.png" };
const collegeBanner = { url: "/college-banner.jpg" };
const founderImg = { url: "/founder.webp" };
import { MailCheck, RefreshCw, ArrowLeft } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { checkLoginLockout, recordLoginAttempt } from "@/lib/security.functions";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useRef } from "react";

// Small local blocklist of commonly-leaked / trivially-guessable passwords.
// Kept intentionally short — HIBP on the server is the authoritative check;
// this only catches the obvious ones before the network call.
const COMMON_WEAK_PASSWORDS = new Set(
  [
    "password", "password1", "password123", "passw0rd", "p@ssw0rd", "p@ssword",
    "qwerty", "qwerty123", "qwertyuiop", "asdfghjkl", "zxcvbnm",
    "12345678", "123456789", "1234567890", "11111111", "00000000",
    "abcd1234", "abcdefgh", "iloveyou", "welcome1", "welcome123",
    "letmein", "letmein1", "admin123", "administrator", "root1234",
    "monkey123", "dragon123", "master123", "sunshine1", "princess1",
    "football1", "baseball1", "trustno1", "starwars1", "superman1",
  ].map((p) => p.toLowerCase()),
);

function isLikelyWeakPassword(pw: string, email?: string, name?: string): boolean {
  const lower = pw.toLowerCase();
  if (COMMON_WEAK_PASSWORDS.has(lower)) return true;
  // Strip trailing digits / punctuation and re-check (e.g. "Password@2024")
  const stripped = lower.replace(/[^a-z]/g, "");
  if (stripped.length >= 6 && COMMON_WEAK_PASSWORDS.has(stripped)) return true;
  // Contains the local-part of the email or user name verbatim
  const emailLocal = (email ?? "").split("@")[0]?.toLowerCase();
  if (emailLocal && emailLocal.length >= 4 && lower.includes(emailLocal)) return true;
  const first = (name ?? "").trim().split(/\s+/)[0]?.toLowerCase();
  if (first && first.length >= 4 && lower.includes(first)) return true;
  return false;
}

function generatePasswordSuggestions(count = 4): string[] {
  const bases = [
    "SchoolBus", "NBusTrack", "CampusRide", "SafeRoute",
    "RouteWatch", "BusPilot", "GudurRide", "NECTransit",
  ];
  const tails = ["Ravi", "Faculty", "Gmail", "Campus", "Route", "Bus", "Track", "Signal"];
  const symbols = ["@", "#", "$", "!", "&", "%"];
  const rand = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)];
  const out = new Set<string>();
  while (out.size < count) {
    const base = rand(bases);
    const sym = rand(symbols);
    const year = 2024 + Math.floor(Math.random() * 4);
    const tail = rand(tails);
    const num = Math.floor(10 + Math.random() * 90);
    out.add(`${base}${sym}${year}#${tail}${num}`);
  }
  return Array.from(out);
}

type PasswordChecks = {
  length: boolean;
  upper: boolean;
  lower: boolean;
  number: boolean;
  special: boolean;
};

function evaluatePassword(pw: string): PasswordChecks {
  return {
    length: pw.length >= 8,
    upper: /[A-Z]/.test(pw),
    lower: /[a-z]/.test(pw),
    number: /[0-9]/.test(pw),
    special: /[^A-Za-z0-9]/.test(pw),
  };
}

function passwordScore(c: PasswordChecks): number {
  return Number(c.length) + Number(c.upper) + Number(c.lower) + Number(c.number) + Number(c.special);
}

function passwordStrengthLabel(score: number): { label: "Weak" | "Medium" | "Strong"; tone: string; bar: string } {
  if (score <= 2) return { label: "Weak", tone: "text-destructive", bar: "bg-destructive" };
  if (score <= 4) return { label: "Medium", tone: "text-amber-600 dark:text-amber-400", bar: "bg-amber-500" };
  return { label: "Strong", tone: "text-emerald-600 dark:text-emerald-400", bar: "bg-emerald-500" };
}

function PasswordRequirements({ checks, id }: { checks: PasswordChecks; id: string }) {
  const items: { key: keyof PasswordChecks; label: string }[] = [
    { key: "length", label: "At least 8 characters" },
    { key: "upper", label: "One uppercase letter (A-Z)" },
    { key: "lower", label: "One lowercase letter (a-z)" },
    { key: "number", label: "One number (0-9)" },
    { key: "special", label: "One special character (!@#$…)" },
  ];
  return (
    <ul id={id} className="mt-1 space-y-0.5 text-xs" aria-live="polite">
      {items.map((it) => {
        const ok = checks[it.key];
        return (
          <li
            key={it.key}
            className={ok ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"}
          >
            <span aria-hidden="true" className="mr-1.5">{ok ? "✓" : "•"}</span>
            <span className="sr-only">{ok ? "Met: " : "Not met: "}</span>
            {it.label}
          </li>
        );
      })}
    </ul>
  );
}

function PasswordStrengthMeter({ score }: { score: number }) {
  const pct = (score / 5) * 100;
  const { label, tone, bar } = passwordStrengthLabel(score);
  return (
    <div className="mt-1.5">
      <div
        className="h-1.5 w-full overflow-hidden rounded-full bg-secondary"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={5}
        aria-valuenow={score}
        aria-label={`Password strength: ${label}`}
      >
        <div className={`h-full ${bar} transition-all`} style={{ width: `${pct}%` }} />
      </div>
      <div className={`mt-1 text-xs font-medium ${tone}`}>Strength: {label}</div>
    </div>
  );
}

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
  const [linkError, setLinkError] = useState<string | null>(null);

  useEffect(() => {
    // Detect expired/invalid verification links: Supabase appends error params
    // to the redirect URL (either in the hash or query string).
    const parseAuthError = (source: string) => {
      const p = new URLSearchParams(source);
      const err = p.get("error_description") || p.get("error");
      return err ? decodeURIComponent(err.replace(/\+/g, " ")) : null;
    };
    const hash = window.location.hash.startsWith("#")
      ? window.location.hash.slice(1)
      : window.location.hash;
    const err =
      parseAuthError(hash) || parseAuthError(window.location.search.replace(/^\?/, ""));
    if (err) {
      setLinkError(err);
      // Clean the URL so the error doesn't persist on reload
      window.history.replaceState({}, "", window.location.pathname);
    }

    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard", replace: true });
      else setChecking(false);
    }).catch(() => setChecking(false));
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
            {linkError && !pendingEmail && (
              <div
                role="alert"
                className="mb-4 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive"
              >
                <div className="font-semibold">Verification link problem</div>
                <p className="mt-0.5 text-destructive/90">{linkError}</p>
                <p className="mt-1 text-xs text-destructive/80">
                  The link may have expired or already been used. Sign in below, or request a new verification email.
                </p>
              </div>
            )}
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
          <Input id="forgot-email" type="email" autoComplete="username" required value={forgotEmail} onChange={(e) => setForgotEmail(e.target.value)} placeholder="you@narayana.edu" />
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
        <Input id="signin-email" type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@narayana.edu" />
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="signin-password">Password</Label>
          <button type="button" onClick={() => setForgotMode(true)} className="text-xs text-primary hover:underline">
            Forgot password?
          </button>
        </div>
        <Input id="signin-password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
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
    role: "student" as "student" | "faculty",
  });
  const [loading, setLoading] = useState(false);
  const [pwTouched, setPwTouched] = useState(false);
  const checks = evaluatePassword(form.password);
  const score = passwordScore(checks);
  const allMet = score === 5;
  const pwErrorId = "signup-password-requirements";
  const passwordRef = useRef<HTMLInputElement>(null);
  const [weakDialogOpen, setWeakDialogOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>(() => generatePasswordSuggestions());

  function openWeakDialog() {
    setSuggestions(generatePasswordSuggestions());
    // Preserve every other field; only clear the password.
    setForm((f) => ({ ...f, password: "" }));
    setWeakDialogOpen(true);
  }

  function isWeakLeakedError(msg: string): boolean {
    const m = msg.toLowerCase();
    return (
      m.includes("known to be weak") ||
      m.includes("easy to guess") ||
      m.includes("pwned") ||
      m.includes("data breach") ||
      m.includes("compromised") ||
      m.includes("has appeared")
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPwTouched(true);
    if (!allMet) {
      toast.error("Please choose a password that meets all requirements.");
      return;
    }
    // Local leaked/common password guard — before hitting the network.
    if (isLikelyWeakPassword(form.password, form.email, form.full_name)) {
      toast.error(
        "This password has appeared in previous data breaches. Please choose a unique password that you have never used before.",
      );
      openWeakDialog();
      return;
    }
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
    if (error) {
      if (isWeakLeakedError(error.message)) {
        openWeakDialog();
        return;
      }
      return toast.error(error.message);
    }
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
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          Driver accounts are created by the Transport Administration.
        </p>
      </div>
      <div className="space-y-1.5">
        <Label>Full name</Label>
        <Input required value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
      </div>
      <div className="space-y-1.5">
        <Label>Email</Label>
        <Input type="email" autoComplete="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
      </div>
      <div className="space-y-1.5">
        <Label>Password</Label>
        <Input
          id="signup-password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          onBlur={() => setPwTouched(true)}
          aria-describedby={pwErrorId}
          aria-invalid={pwTouched && !allMet}
          ref={passwordRef}
        />
        {form.password.length > 0 && <PasswordStrengthMeter score={score} />}
        <PasswordRequirements checks={checks} id={pwErrorId} />
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
      <Dialog
        open={weakDialogOpen}
        onOpenChange={(open) => {
          setWeakDialogOpen(open);
          if (!open) {
            // Focus the password input after closing so the user can retype.
            window.setTimeout(() => passwordRef.current?.focus(), 0);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Choose a Different Password</DialogTitle>
            <DialogDescription asChild>
              <div className="space-y-2 text-sm">
                <p>
                  The password you entered has been found in previous public data breaches.
                  Although it meets complexity requirements, it is not safe to use.
                </p>
                <p>
                  Please choose a password that is unique and has never been used on another
                  website.
                </p>
              </div>
            </DialogDescription>
          </DialogHeader>
          <div className="mt-2 rounded-lg border border-border bg-secondary/40 p-3">
            <p className="text-xs font-medium text-foreground">Random suggestions</p>
            <ul className="mt-1.5 space-y-1 font-mono text-xs text-muted-foreground">
              {suggestions.map((s) => (
                <li key={s} className="break-all">{s}</li>
              ))}
            </ul>
            <p className="mt-2 text-[11px] text-muted-foreground">
              These are examples only — pick one you can remember, or invent your own.
            </p>
          </div>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setWeakDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => {
                setWeakDialogOpen(false);
                window.setTimeout(() => passwordRef.current?.focus(), 0);
              }}
            >
              Change Password
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </form>
  );
}

function VerifyPending({ email, onBack }: { email: string; onBack: () => void }) {
  const [resending, setResending] = useState(false);
  const [checking, setChecking] = useState(false);
  const [cooldown, setCooldown] = useState(60);
  const navigate = useNavigate();

  // Countdown timer for the resend cooldown (initial 60s starts on mount
  // because we assume the signup call just sent the first email).
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = window.setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => window.clearTimeout(t);
  }, [cooldown]);

  // Auto-redirect the moment the user verifies in another tab.
  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if ((event === "SIGNED_IN" || event === "TOKEN_REFRESHED") && session) {
        toast.success("Email verified. Redirecting…");
        navigate({ to: "/dashboard", replace: true });
      }
    });
    return () => sub.subscription.unsubscribe();
  }, [navigate]);

  async function resend() {
    if (cooldown > 0 || resending) return;
    setResending(true);
    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email,
        options: { emailRedirectTo: window.location.origin },
      });
      if (error) {
        toast.error(error.message);
      } else {
        toast.success("Verification email sent. Check your inbox and spam folder.");
        setCooldown(60);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to resend email.";
      toast.error(message);
      console.error("[auth] resend verification failed", err);
    } finally {
      setResending(false);
    }
  }

  async function recheck() {
    setChecking(true);
    try {
      const { data, error } = await supabase.auth.getSession();
      if (error) throw error;
      if (data.session) {
        toast.success("Email verified. Redirecting…");
        navigate({ to: "/dashboard", replace: true });
      } else {
        toast.info("Still unverified. Open the link in the email we sent you.");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not check status.";
      toast.error(message);
      console.error("[auth] verification recheck failed", err);
    } finally {
      setChecking(false);
    }
  }

  return (
    <div className="space-y-4 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-secondary text-primary">
        <MailCheck className="h-7 w-7" />
      </div>
      <div>
        <h2 className="text-lg font-semibold text-foreground">Registration successful</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Please check your email to verify your account. We sent a confirmation link to
        </p>
        <p className="mt-0.5 text-sm font-medium text-foreground break-all">{email}</p>
      </div>
      <div className="rounded-lg border border-dashed border-border bg-secondary/40 p-3 text-left text-xs text-muted-foreground">
        <p className="font-medium text-foreground">Didn't receive the email?</p>
        <p className="mt-1">
          Check your spam or junk folder, or resend the verification email below.
          The link expires after 24 hours — if it stops working, just resend.
        </p>
      </div>
      <div className="space-y-2">
        <Button type="button" className="w-full" onClick={recheck} disabled={checking}>
          <RefreshCw className={`mr-2 h-4 w-4 ${checking ? "animate-spin" : ""}`} />
          {checking ? "Checking…" : "I've verified — continue"}
        </Button>
        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={resend}
          disabled={resending || cooldown > 0}
        >
          {resending
            ? "Sending…"
            : cooldown > 0
              ? `Resend verification email (${cooldown}s)`
              : "Resend verification email"}
        </Button>
        <Button type="button" variant="ghost" className="w-full" onClick={onBack}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to sign in
        </Button>
      </div>
    </div>
  );
}