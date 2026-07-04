import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { BusMap } from "@/components/BusMap";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bus, Bell } from "lucide-react";
import { toast } from "sonner";

type BusRow = { id: string; bus_number: string; route_id: string | null; status: string };
type RouteRow = { id: string; name: string; stops: unknown };
type Loc = { bus_id: string; lat: number; lng: number; updated_at: string };

export function FacultyDashboard({ user }: { user: User }) {
  const [buses, setBuses] = useState<BusRow[]>([]);
  const [routes, setRoutes] = useState<RouteRow[]>([]);
  const [locs, setLocs] = useState<Record<string, Loc>>({});
  const [announcements, setAnnouncements] = useState<{ id: string; title: string; body: string; created_at: string; is_emergency: boolean }[]>([]);
  void user;

  useEffect(() => {
    supabase.from("buses").select("*").eq("active", true).then(({ data }) => setBuses(data ?? []));
    supabase.from("routes").select("id,name,stops").then(({ data }) => setRoutes(data ?? []));
    supabase.from("bus_locations").select("*").then(({ data }) => {
      const map: Record<string, Loc> = {};
      (data ?? []).forEach((l) => (map[(l as Loc).bus_id] = l as Loc));
      setLocs(map);
    });
    supabase
      .from("announcements")
      .select("id,title,body,created_at,is_emergency")
      .order("created_at", { ascending: false })
      .limit(10)
      .then(({ data }) => setAnnouncements(data ?? []));

    const ch = supabase
      .channel("faculty-locs")
      .on("postgres_changes", { event: "*", schema: "public", table: "bus_locations" }, (payload) => {
        const n = payload.new as Loc;
        if (n?.bus_id) setLocs((prev) => ({ ...prev, [n.bus_id]: n }));
      })
      .subscribe();
    const annCh = supabase
      .channel("faculty-announce")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "announcements" }, (payload) => {
        const a = payload.new as { id: string; title: string; body: string; created_at: string; is_emergency: boolean };
        setAnnouncements((prev) => [a, ...prev].slice(0, 10));
        toast(a.title, { description: a.body });
      })
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
      supabase.removeChannel(annCh);
    };
  }, []);

  const mapBuses = Object.values(locs).map((l) => {
    const b = buses.find((bb) => bb.id === l.bus_id);
    return { id: l.bus_id, bus_number: b?.bus_number ?? "", lat: l.lat, lng: l.lng };
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Bus className="h-5 w-5 text-accent" /> Live College Fleet</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2 text-sm">
            {buses.map((b) => {
              const r = routes.find((rr) => rr.id === b.route_id);
              const live = !!locs[b.id];
              return (
                <Badge key={b.id} variant={live ? "default" : "outline"} className={live ? "bg-primary" : ""}>
                  Bus {b.bus_number}{r ? ` · ${r.name}` : ""} {live ? "🟢" : "⚪"}
                </Badge>
              );
            })}
          </div>
          <BusMap buses={mapBuses} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Bell className="h-5 w-5 text-accent" /> Announcements</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {announcements.length === 0 && <p className="text-sm text-muted-foreground">No announcements.</p>}
          {announcements.map((a) => (
            <div key={a.id} className={`rounded-lg border p-3 ${a.is_emergency ? "border-destructive/50 bg-destructive/5" : "border-border"}`}>
              <div className="flex items-center justify-between">
                <div className="font-medium">{a.title}</div>
                <span className="text-[11px] text-muted-foreground">{new Date(a.created_at).toLocaleString()}</span>
              </div>
              <div className="text-sm text-muted-foreground">{a.body}</div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}