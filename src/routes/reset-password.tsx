import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Lock, ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Reset Password · Narayana Bus Tracker" },
      { name: "description", content: "Set a new password for your Narayana Bus Tracker account." },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [validRecovery, setValidRecovery] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const hash = window.location.hash;
    if (hash.includes("type=recovery")) {
      setValidRecovery(true);
    }
    setChecked(true);
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters.");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Password updated! Please sign in with your new password.");
      navigate({ to: "/auth", replace: true });
    }
  }

  if (!checked) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-secondary/40 px-4">
        <p className="text-sm text-muted-foreground">Checking link…</p>
      </div>
    );
  }

  if (!validRecovery) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-secondary/40 px-4">
        <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-xl text-center">
          <h1 className="text-xl font-semibold text-foreground">Invalid or expired link</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            This password reset link is invalid or has expired. Please request a new one.
          </p>
          <Button className="mt-6 w-full" onClick={() => navigate({ to: "/auth" })}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to sign in
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-secondary/40 px-4">
      <div className="w-full max-w-md">
        <div className="mb-5 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-secondary text-primary">
            <Lock className="h-7 w-7" />
          </div>
          <h1 className="mt-4 text-2xl font-bold text-primary">Set new password</h1>
          <p className="text-sm text-muted-foreground">Create a new password for your account</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-6 shadow-xl shadow-primary/5">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-password">New password</Label>
              <Input
                id="new-password"
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm password</Label>
              <Input
                id="confirm-password"
                type="password"
                required
                minLength={6}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Updating…" : "Update password"}
            </Button>
          </form>
        </div>
        <div className="mt-4 text-center">
          <button
            type="button"
            onClick={() => navigate({ to: "/auth" })}
            className="inline-flex items-center text-sm text-primary hover:underline"
          >
            <ArrowLeft className="mr-1 h-4 w-4" /> Back to sign in
          </button>
        </div>
      </div>
    </div>
  );
}
