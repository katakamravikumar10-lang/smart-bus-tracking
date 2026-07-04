import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import logo from "@/assets/logo.png";
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
    <div className="min-h-screen bg-gradient-to-br from-secondary via-background to-secondary flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 flex flex-col items-center text-center">
          <img src={logo} alt="Narayana Engineering College" width={72} height={72} className="mb-3" />
          <h1 className="text-2xl font-bold text-primary">Narayana Engineering College</h1>
          <p className="text-sm text-muted-foreground">Smart Bus Tracking · Gudur</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-6 shadow-lg shadow-primary/5">
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