import { useEffect, useMemo, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { haversineKm } from "@/components/BusMap";
import { BusRouteTimeline } from "@/components/BusRouteTimeline";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Bus, MapPin, Bell, MessageSquare } from "lucide-react";
import { toast } from "sonner";

type BusRow = { id: string; bus_number: string; route_id: string | null; status: string };
type RouteRow = { id: string; name: string; stops: unknown };
type Loc = { bus_id: string; lat: number; lng: number; heading: number | null; speed: number | null; updated_at: string };
type Stop = { name: string; lat: number; lng: number; order?: number };

export function StudentDashboard({ user }: { user: User }) {
  const [buses, setBuses] = useState<BusRow[]>([]);
  const [routes, setRoutes] = useState<RouteRow[]>([]);
  const [assignedBusId, setAssignedBusId] = useState<string | null>(null);
  const [boardingStop, setBoardingStop] = useState<string>("");
  const [loc, setLoc] = useState<Loc | null>(null);
  const [announcements, setAnnouncements] = useState<{ id: string; title: string; body: string; created_at: string; is_emergency: boolean }[]>([]);

  useEffect(() => {
    supabase.from("buses").select("*").eq("active", true).then(({ data }) => setBuses(data ?? []));
    supabase.from("routes").select("id,name,stops").eq("active", true).then(({ data }) => setRoutes(data ?? []));
    supabase.from("student_assignments").select("bus_id,boarding_stop").eq("user_id", user.id).maybeSingle().then(({ data }) => {
      if (data) {
        setAssignedBusId(data.bus_id);
        setBoardingStop(data.boarding_stop ?? "");
      }
    });
    supabase
      .from("announcements")
      .select("id,title,body,created_at,is_emergency")
      .order("created_at", { ascending: false })
      .limit(10)
      .then(({ data }) => setAnnouncements(data ?? []));
  }, [user.id]);

  const bus = buses.find((b) => b.id === assignedBusId) ?? null;
  const route = routes.find((r) => r.id === bus?.route_id) ?? null;
  const stops = useMemo<Stop[]>(() => (Array.isArray(route?.stops) ? (route!.stops as Stop[]) : []), [route]);

  // Live location
  useEffect(() => {
    if (!assignedBusId) return;
    supabase.from("bus_locations").select("*").eq("bus_id", assignedBusId).maybeSingle().then(({ data }) => data && setLoc(data as Loc));
    const ch = supabase
      .channel("bus-loc-" + assignedBusId)
      .on("postgres_changes", { event: "*", schema: "public", table: "bus_locations", filter: `bus_id=eq.${assignedBusId}` }, (payload) => {
        setLoc(payload.new as Loc);
      })
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [assignedBusId]);

  // Realtime announcements
  useEffect(() => {
    const ch = supabase
      .channel("student-announce")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "announcements" }, (payload) => {
        const a = payload.new as { id: string; title: string; body: string; created_at: string; is_emergency: boolean };
        setAnnouncements((prev) => [a, ...prev].slice(0, 10));
        toast(a.title, { description: a.body });
      })
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, []);

  const boardingCoords = stops.find((s) => s.name === boardingStop) ?? null;
  const distanceKm = loc && boardingCoords ? haversineKm({ lat: loc.lat, lng: loc.lng }, boardingCoords) : null;
  const etaMin = distanceKm && loc?.speed && loc.speed > 2 ? Math.round((distanceKm / loc.speed) * 60) : null;

  async function saveAssignment(busId: string, stop: string) {
    const { error } = await supabase.from("student_assignments").upsert({ user_id: user.id, bus_id: busId, boarding_stop: stop || null }, { onConflict: "user_id" });
    if (error) return toast.error(error.message);
    setAssignedBusId(busId);
    setBoardingStop(stop);
    toast.success("Assignment saved");
  }

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

          {bus ? (
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <Badge variant="secondary" className="bg-primary text-primary-foreground">Bus {bus.bus_number}</Badge>
              <Badge variant="outline">Status: {bus.status}</Badge>
              {distanceKm != null && (
                <span className="text-muted-foreground">
                  <MapPin className="mr-1 inline h-4 w-4 text-accent" />
                  {distanceKm.toFixed(2)} km from your stop{etaMin != null ? ` · ETA ~${etaMin} min` : ""}
                </span>
              )}
              {loc && (
                <span className="text-xs text-muted-foreground">
                  Last update: {new Date(loc.updated_at).toLocaleTimeString()}
                </span>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Pick your bus above to start tracking.</p>
          )}

          {bus && stops.length > 0 && (
            <div className="rounded-lg border border-border bg-card p-3">
              <div className="mb-2 text-sm font-medium">Route stops · live tracking</div>
              <BusRouteTimeline
                stops={stops}
                loc={loc}
                boardingStop={boardingStop}
                busNumber={bus.bus_number}
              />
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
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

        <FeedbackCard user={user} buses={buses} />
      </div>
    </div>
  );
}

function FeedbackCard({ user, buses }: { user: User; buses: BusRow[] }) {
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [busId, setBusId] = useState<string>("");
  const [loading, setLoading] = useState(false);

  async function submit() {
    if (!subject.trim() || !message.trim()) return toast.error("Fill subject and message");
    setLoading(true);
    const { error } = await supabase.from("feedback").insert({
      user_id: user.id,
      subject: subject.trim(),
      message: message.trim(),
      bus_id: busId || null,
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    setSubject("");
    setMessage("");
    setBusId("");
    toast.success("Feedback sent");
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><MessageSquare className="h-5 w-5 text-accent" /> Report an issue</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-1.5">
          <Label>Bus (optional)</Label>
          <Select value={busId} onValueChange={setBusId}>
            <SelectTrigger><SelectValue placeholder="No specific bus" /></SelectTrigger>
            <SelectContent>
              {buses.map((b) => (
                <SelectItem key={b.id} value={b.id}>Bus {b.bus_number}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Subject</Label>
          <Input value={subject} onChange={(e) => setSubject(e.target.value)} maxLength={100} />
        </div>
        <div className="space-y-1.5">
          <Label>Message</Label>
          <Textarea value={message} onChange={(e) => setMessage(e.target.value)} maxLength={1000} rows={3} />
        </div>
        <Button onClick={submit} disabled={loading} className="w-full">
          {loading ? "Sending…" : "Send feedback"}
        </Button>
      </CardContent>
    </Card>
  );
}