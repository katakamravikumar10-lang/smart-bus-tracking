import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { BrandHeader } from "@/components/BrandHeader";
import { PageHeader } from "@/components/nav/PageHeader";
import { AppFooter } from "@/components/AppFooter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/auth-hooks";
import { toast } from "sonner";
import { Bell, BellOff, CheckCheck, Search, Trash2, AlertTriangle } from "lucide-react";

type Notif = {
  id: string;
  title: string;
  body: string;
  type: string | null;
  is_emergency: boolean;
  read_at: string | null;
  created_at: string;
};

export const Route = createFileRoute("/_authenticated/notifications")({
  head: () => ({
    meta: [
      { title: "Notifications · Narayana Bus Tracker" },
      { name: "description", content: "View bus arrival alerts, delays, route changes, announcements, and emergencies." },
    ],
  }),
  component: NotificationsPage,
});

const FILTERS = [
  { value: "all", label: "All" },
  { value: "arrival", label: "Bus Arrival" },
  { value: "delayed", label: "Delay" },
  { value: "route_change", label: "Route Change" },
  { value: "emergency", label: "Emergency" },
  { value: "announcement", label: "Announcement" },
] as const;

function categorize(n: Notif): (typeof FILTERS)[number]["value"] {
  if (n.is_emergency || n.type === "sos") return "emergency";
  const t = n.type ?? "";
  if (t.includes("approaching") || t.includes("reached") || t === "trip_started" || t === "trip_completed") return "arrival";
  if (t === "delayed") return "delayed";
  if (t === "route_change") return "route_change";
  return "announcement";
}

function timeAgo(iso: string) {
  const d = new Date(iso).getTime();
  const diff = Math.max(0, Date.now() - d);
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.floor(h / 24);
  return `${days}d ago`;
}

function NotificationsPage() {
  const { user, loading: sessionLoading } = useSession();
  const [items, setItems] = useState<Notif[] | null>(null);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["value"]>("all");
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    setError(null);
    setItems(null);
    supabase
      .from("notifications")
      .select("id,title,body,type,is_emergency,read_at,created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(200)
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) setError(error.message);
        setItems((data as Notif[]) ?? []);
      });

    const ch = supabase
      .channel("notif-page-" + user.id)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        (payload) => {
          const n = payload.new as Notif;
          setItems((prev) => (prev ? [n, ...prev] : [n]));
        },
      )
      .subscribe();
    return () => {
      cancelled = true;
      supabase.removeChannel(ch);
    };
  }, [user]);

  const filtered = useMemo(() => {
    if (!items) return [];
    const q = query.trim().toLowerCase();
    return items.filter((n) => {
      if (filter !== "all" && categorize(n) !== filter) return false;
      if (!q) return true;
      return (
        n.title.toLowerCase().includes(q) ||
        n.body.toLowerCase().includes(q) ||
        (n.type ?? "").toLowerCase().includes(q)
      );
    });
  }, [items, filter, query]);

  const unread = items?.filter((n) => !n.read_at).length ?? 0;

  async function markAllRead() {
    if (!user || !items) return;
    const ids = items.filter((i) => !i.read_at).map((i) => i.id);
    if (!ids.length) return;
    const now = new Date().toISOString();
    setItems((prev) => prev?.map((i) => (i.read_at ? i : { ...i, read_at: now })) ?? prev);
    const { error } = await supabase.from("notifications").update({ read_at: now }).in("id", ids);
    if (error) toast.error(error.message);
    else toast.success("All notifications marked as read");
  }

  async function markOneRead(id: string) {
    const now = new Date().toISOString();
    setItems((prev) => prev?.map((i) => (i.id === id ? { ...i, read_at: now } : i)) ?? prev);
    await supabase.from("notifications").update({ read_at: now }).eq("id", id);
  }

  async function deleteOne(id: string) {
    const prev = items;
    setItems((cur) => cur?.filter((i) => i.id !== id) ?? cur);
    const { error } = await supabase.from("notifications").delete().eq("id", id);
    if (error) {
      setItems(prev ?? null);
      toast.error(error.message);
    } else {
      toast.success("Notification deleted");
    }
  }

  const loading = sessionLoading || items === null;

  return (
    <div className="min-h-dvh bg-background">
      <BrandHeader subtitle="Notifications" />
      <main className="mx-auto max-w-4xl px-4 py-6 space-y-6">
        <PageHeader
          title="Notification Center"
          description={unread > 0 ? `${unread} unread notification${unread === 1 ? "" : "s"}` : "You’re all caught up."}
          breadcrumbs={[{ label: "Dashboard", to: "/dashboard" }, { label: "Notifications" }]}
          actions={
            <Button variant="outline" size="sm" onClick={markAllRead} disabled={!unread}>
              <CheckCheck className="mr-2 h-4 w-4" /> Mark all read
            </Button>
          }
        />

        <Card>
          <CardContent className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Search notifications…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <Select value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
              <SelectTrigger className="w-full sm:w-56"><SelectValue /></SelectTrigger>
              <SelectContent>
                {FILTERS.map((f) => (
                  <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {error && (
          <Card className="border-destructive/40 bg-destructive/5">
            <CardContent className="flex items-center gap-3 py-4 text-sm">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              <div className="flex-1">Couldn’t load notifications: {error}</div>
              <Button size="sm" variant="outline" onClick={() => window.location.reload()}>Retry</Button>
            </CardContent>
          </Card>
        )}

        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full rounded-lg" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={BellOff}
            title={items && items.length === 0 ? "No notifications yet" : "No matching notifications"}
            description={
              items && items.length === 0
                ? "You’ll see arrival alerts, route changes, announcements, and emergencies here."
                : "Try clearing the search or switching filters."
            }
          />
        ) : (
          <ul className="space-y-2">
            {filtered.map((n) => (
              <li
                key={n.id}
                className={`group flex gap-3 rounded-lg border bg-card p-3 shadow-sm transition-colors ${
                  n.read_at ? "border-border/60" : "border-primary/40 bg-primary/5"
                } ${n.is_emergency ? "border-l-4 border-l-destructive" : ""}`}
              >
                <div className={`mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-full ${
                  n.is_emergency ? "bg-destructive/15 text-destructive" : "bg-accent/15 text-accent"
                }`}>
                  {n.is_emergency ? <AlertTriangle className="h-4 w-4" /> : <Bell className="h-4 w-4" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="truncate text-sm font-semibold text-foreground">{n.title}</div>
                    {!n.read_at && <Badge variant="secondary" className="text-[10px]">New</Badge>}
                    {n.is_emergency && <Badge variant="destructive" className="text-[10px]">Emergency</Badge>}
                  </div>
                  <div className="mt-0.5 text-xs text-muted-foreground">{n.body}</div>
                  <div className="mt-1 text-[11px] text-muted-foreground">
                    {timeAgo(n.created_at)} · {new Date(n.created_at).toLocaleString()}
                  </div>
                </div>
                <div className="flex shrink-0 flex-col gap-1 sm:flex-row">
                  {!n.read_at && (
                    <Button size="sm" variant="ghost" onClick={() => markOneRead(n.id)} aria-label="Mark as read">
                      <CheckCheck className="h-4 w-4" />
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" onClick={() => deleteOne(n.id)} aria-label="Delete notification">
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </main>
      <AppFooter />
    </div>
  );
}