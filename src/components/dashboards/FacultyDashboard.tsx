import { useEffect, useMemo, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { BusMap, haversineKm } from "@/components/BusMap";
import { BusRouteTimeline } from "@/components/BusRouteTimeline";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Bus, Bell, MapPin } from "lucide-react";
import { toast } from "sonner";

type BusRow = { id: string; bus_number: string; route_id: string | null; status: string };
type RouteRow = { id: string; name: string; stops: unknown };
type Loc = { bus_id: string; lat: number; lng: number; heading: number | null; speed: number | null; updated_at: string };
type Stop = { name: string; lat: number; lng: number; order?: number };

export function FacultyDashboard({ user }: { user: User }) {
  const [buses, setBuses] = useState<BusRow[]>([]);
  const [routes, setRoutes] = useState<RouteRow[]>([]);
  const [locs, setLocs] = useState<Record<string, Loc>>({});
  const [announcements, setAnnouncements] = useState<{ id: string; title: string; body: string; created_at: string; is_emergency: boolean }[]>([]);
  const [assignedBusId, setAssignedBusId] = useState<string | null>(null);
  const [boardingStop, setBoardingStop] = useState<string>("");

  useEffect(() => {
    supabase.from("buses").select("*").eq("active", true).then(({ data }) => setBuses(data ?? []));
    supabase.from("routes").select("id,name,stops").then(({ data }) => setRoutes(data ?? []));
    supabase.from("student_assignments").select("bus_id,boarding_stop").eq("user_id", user.id).maybeSingle().then(({ data }) => {
      if (data) {
        setAssignedBusId(data.bus_id);
        setBoardingStop(data.boarding_stop ?? "");
      }
    });
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
  }, [user.id]);

  const myBus = buses.find((b) => b.id === assignedBusId) ?? null;
  const myRoute = routes.find((r) => r.id === myBus?.route_id) ?? null;
  const stops = useMemo<Stop[]>(() => (Array.isArray(myRoute?.stops) ? (myRoute!.stops as Stop[]) : []), [myRoute]);
  const myLoc = assignedBusId ? locs[assignedBusId] ?? null : null;
  const boardingCoords = stops.find((s) => s.name === boardingStop) ?? null;
  const distanceKm = myLoc && boardingCoords ? haversineKm({ lat: myLoc.lat, lng: myLoc.lng }, boardingCoords) : null;
  const etaMin = distanceKm && myLoc?.speed && myLoc.speed > 2 ? Math.round((distanceKm / myLoc.speed) * 60) : null;

  async function saveAssignment(busId: string, stop: string) {
    const { error } = await supabase.from("student_assignments").upsert({ user_id: user.id, bus_id: busId, boarding_stop: stop || null }, { onConflict: "user_id" });
    if (error) return toast.error(error.message);
    setAssignedBusId(busId);
    setBoardingStop(stop);
    toast.success("Assignment saved");
  }

  const mapBuses = Object.values(locs).map((l) => {
    const b = buses.find((bb) => bb.id === l.bus_id);
    return { id: l.bus_id, bus_number: b?.bus_number ?? "", lat: l.lat, lng: l.lng };
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Bus className="h-5 w-5 text-accent" /> Your Bus</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Assigned bus</Label>
              <Select value={assignedBusId ?? ""} onValueChange={(v) => saveAssignment(v, boardingStop)}>
                <SelectTrigger><SelectValue placeholder="Select a bus" /></SelectTrigger>
                <SelectContent>
                  {buses.map((b) => {
                    const r = routes.find((rr) => rr.id === b.route_id);
                    return (
                      <SelectItem key={b.id} value={b.id}>
                        Bus {b.bus_number} {r ? `· ${r.name}` : ""}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Boarding stop</Label>
              <Select
                value={boardingStop || ""}
                onValueChange={(v) => assignedBusId && saveAssignment(assignedBusId, v)}
                disabled={!stops.length}
              >
                <SelectTrigger><SelectValue placeholder={stops.length ? "Select stop" : "No stops on this route"} /></SelectTrigger>
                <SelectContent>
                  {stops.map((s) => (
                    <SelectItem key={s.name} value={s.name}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {myBus ? (
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <Badge variant="secondary" className="bg-primary text-primary-foreground">Bus {myBus.bus_number}</Badge>
              <Badge variant="outline">Status: {myBus.status}</Badge>
              {distanceKm != null && (
                <span className="text-muted-foreground">
                  <MapPin className="mr-1 inline h-4 w-4 text-accent" />
                  {distanceKm.toFixed(2)} km from your stop{etaMin != null ? ` · ETA ~${etaMin} min` : ""}
                </span>
              )}
              {myLoc && (
                <span className="text-xs text-muted-foreground">
                  Last update: {new Date(myLoc.updated_at).toLocaleTimeString()}
                </span>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Pick your bus above to start tracking your daily commute.</p>
          )}

          {myBus && stops.length > 0 && (
            <div className="rounded-lg border border-border bg-card p-3">
              <div className="mb-2 text-sm font-medium">Route stops · live tracking</div>
              <BusRouteTimeline
                stops={stops}
                loc={myLoc}
                boardingStop={boardingStop}
                busNumber={myBus.bus_number}
              />
            </div>
          )}
        </CardContent>
      </Card>

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