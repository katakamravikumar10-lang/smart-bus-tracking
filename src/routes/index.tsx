import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import logo from "@/assets/logo.png";
import { Button } from "@/components/ui/button";
import { Bus, MapPin, Bell, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  const navigate = useNavigate();
  const [authed, setAuthed] = useState(false);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setAuthed(!!data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setAuthed(!!s));
    return () => sub.subscription.unsubscribe();
  }, []);
  const primaryHref = authed ? "/dashboard" : "/auth";
  const primaryLabel = authed ? "Open dashboard" : "Sign in";
  return (
    <div className="min-h-screen bg-gradient-to-br from-secondary via-background to-secondary">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <div className="flex items-center gap-3">
          <img src={logo} alt="Narayana Engineering College" width={48} height={48} />
          <div>
            <div className="text-sm font-semibold text-primary">Narayana Engineering College</div>
            <div className="text-xs text-muted-foreground">Gudur · Smart Bus Tracking</div>
          </div>
        </div>
        <Button onClick={() => navigate({ to: primaryHref })}>{primaryLabel}</Button>
      </header>

      <section className="mx-auto max-w-6xl px-6 py-16 text-center sm:py-24">
        <div className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-1.5 text-xs font-medium text-primary">
          <span className="h-2 w-2 rounded-full bg-accent"></span> Live GPS tracking · Realtime alerts
        </div>
        <h1 className="text-4xl font-bold tracking-tight text-primary sm:text-6xl">
          Never miss the college bus again.
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
          Track Narayana Engineering College buses in real time, get arrival alerts before your stop,
          and stay informed with instant announcements from the transport office.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link to={primaryHref}><Button size="lg">{authed ? "Open dashboard" : "Get started"}</Button></Link>
          {!authed && <Link to="/auth"><Button size="lg" variant="outline">Driver login</Button></Link>}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-24">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Feature icon={<MapPin className="h-5 w-5" />} title="Live Location" text="Real-time GPS tracking of every college bus on the map." />
          <Feature icon={<Bell className="h-5 w-5" />} title="Arrival Alerts" text="Get notified when your bus is close to your stop." />
          <Feature icon={<Bus className="h-5 w-5" />} title="Route Info" text="View assigned bus, stops, driver, and schedule." />
          <Feature icon={<ShieldCheck className="h-5 w-5" />} title="Secure Roles" text="Separate access for students, faculty, drivers and admins." />
        </div>
      </section>
    </div>
  );
}

function Feature({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-accent/20 text-primary">{icon}</div>
      <div className="font-semibold text-primary">{title}</div>
      <p className="mt-1 text-sm text-muted-foreground">{text}</p>
    </div>
  );
}
