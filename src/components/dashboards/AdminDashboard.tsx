import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { BusMap } from "@/components/BusMap";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Bus, Route as RouteIcon, Users, Megaphone, Trash2, FlaskConical } from "lucide-react";
import { toast } from "sonner";
import { DemoModeTab } from "@/components/dashboards/DemoModeTab";

type BusStatus = "idle" | "running" | "delayed" | "maintenance" | "completed";
type BusRow = { id: string; bus_number: string; capacity: number; route_id: string | null; status: BusStatus; active: boolean };
type RouteRow = { id: string; name: string; description: string | null; stops: Stop[]; active: boolean };
type Stop = { name: string; lat: number; lng: number; order?: number };
type Loc = { bus_id: string; lat: number; lng: number; updated_at: string };
type Person = { id: string; full_name: string | null; email: string | null; phone: string | null };

export function AdminDashboard({ user }: { user: User }) {
  void user;
  const [buses, setBuses] = useState<BusRow[]>([]);
  const [routes, setRoutes] = useState<RouteRow[]>([]);
  const [locs, setLocs] = useState<Record<string, Loc>>({});
  const [drivers, setDrivers] = useState<Person[]>([]);
  const [driverAssignments, setDriverAssignments] = useState<{ id: string; driver_id: string; bus_id: string; active: boolean }[]>([]);

  async function refreshAll() {
    const [b, r, l, da, ur] = await Promise.all([
      supabase.from("buses").select("*").order("bus_number"),
      supabase.from("routes").select("*").order("name"),
      supabase.from("bus_locations").select("*"),
      supabase.from("driver_assignments").select("*"),
      supabase.from("user_roles").select("user_id").eq("role", "driver"),
    ]);
    setBuses((b.data ?? []) as BusRow[]);
    setRoutes(((r.data ?? []) as unknown as RouteRow[]).map((x) => ({ ...x, stops: Array.isArray(x.stops) ? x.stops : [] })));
    const map: Record<string, Loc> = {};
    (l.data ?? []).forEach((x) => (map[(x as Loc).bus_id] = x as Loc));
    setLocs(map);
    setDriverAssignments(da.data ?? []);
    const driverIds = (ur.data ?? []).map((x) => x.user_id);
    if (driverIds.length) {
      const { data: profs } = await supabase.from("profiles").select("id,full_name,email,phone").in("id", driverIds);
      setDrivers((profs ?? []) as Person[]);
    } else setDrivers([]);
  }

  useEffect(() => {
    refreshAll();
    const ch = supabase
      .channel("admin-locs")
      .on("postgres_changes", { event: "*", schema: "public", table: "bus_locations" }, (payload) => {
        const n = payload.new as Loc;
        if (n?.bus_id) setLocs((prev) => ({ ...prev, [n.bus_id]: n }));
      })
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, []);

  const mapBuses = Object.values(locs).map((l) => {
    const b = buses.find((bb) => bb.id === l.bus_id);
    return { id: l.bus_id, bus_number: b?.bus_number ?? "", lat: l.lat, lng: l.lng };
  });

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-4">
        <Stat label="Total buses" value={buses.length} />
        <Stat label="RUNNING BUSES" value={buses.filter((b) => b.active).length} />
        <Stat label="Live now" value={Object.keys(locs).length} />
        <Stat label="Drivers" value={drivers.length} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Bus className="h-5 w-5 text-accent" /> Live Fleet Map</CardTitle>
        </CardHeader>
        <CardContent>
          <BusMap buses={mapBuses} />
        </CardContent>
      </Card>

      <Tabs defaultValue="buses">
        <div className="w-full overflow-x-auto">
          <TabsList className="w-max">
            <TabsTrigger value="buses"><Bus className="mr-1 h-4 w-4" />Buses</TabsTrigger>
            <TabsTrigger value="routes"><RouteIcon className="mr-1 h-4 w-4" />Routes</TabsTrigger>
            <TabsTrigger value="drivers"><Users className="mr-1 h-4 w-4" />Drivers</TabsTrigger>
            <TabsTrigger value="announce"><Megaphone className="mr-1 h-4 w-4" />Announcements</TabsTrigger>
            <TabsTrigger value="demo"><FlaskConical className="mr-1 h-4 w-4" />Demo Mode</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="buses"><BusesTab buses={buses} routes={routes} onChange={refreshAll} /></TabsContent>
        <TabsContent value="routes"><RoutesTab routes={routes} onChange={refreshAll} /></TabsContent>
        <TabsContent value="drivers">
          <DriversTab drivers={drivers} buses={buses} assignments={driverAssignments} onChange={refreshAll} />
        </TabsContent>
        <TabsContent value="announce"><AnnouncementsTab routes={routes} /></TabsContent>
        <TabsContent value="demo"><DemoModeTab onDataChange={refreshAll} /></TabsContent>
      </Tabs>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-1 text-3xl font-bold text-primary">{value}</div>
    </div>
  );
}

function BusesTab({ buses, routes, onChange }: { buses: BusRow[]; routes: RouteRow[]; onChange: () => void }) {
  const [busNumber, setBusNumber] = useState("");
  const [capacity, setCapacity] = useState(40);
  const [routeId, setRouteId] = useState("");

  async function add() {
    if (!busNumber.trim()) return toast.error("Enter bus number");
    const { error } = await supabase.from("buses").insert({ bus_number: busNumber.trim(), capacity, route_id: routeId || null });
    if (error) return toast.error(error.message);
    setBusNumber("");
    onChange();
    toast.success("Bus added");
  }

  async function update(id: string, patch: { route_id?: string | null; status?: BusStatus; active?: boolean }) {
    const { error } = await supabase.from("buses").update(patch).eq("id", id);
    if (error) return toast.error(error.message);
    onChange();
  }

  async function remove(id: string) {
    if (!confirm("Delete this bus?")) return;
    const { error } = await supabase.from("buses").delete().eq("id", id);
    if (error) return toast.error(error.message);
    onChange();
  }

  return (
    <Card><CardContent className="space-y-4 pt-6">
      <div className="grid gap-3 sm:grid-cols-4">
        <Input placeholder="Bus number (e.g. NEC-01)" value={busNumber} onChange={(e) => setBusNumber(e.target.value)} />
        <Input type="number" placeholder="Capacity" value={capacity} onChange={(e) => setCapacity(parseInt(e.target.value) || 40)} />
        <Select value={routeId} onValueChange={setRouteId}>
          <SelectTrigger><SelectValue placeholder="Route (optional)" /></SelectTrigger>
          <SelectContent>
            {routes.map((r) => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button onClick={add}>Add bus</Button>
      </div>
      <div className="space-y-2">
        {buses.map((b) => (
          <div key={b.id} className="flex flex-wrap items-center gap-2 rounded-lg border border-border p-3">
            <Badge className="bg-primary text-primary-foreground">Bus {b.bus_number}</Badge>
            <Select value={b.route_id ?? "none"} onValueChange={(v) => update(b.id, { route_id: v === "none" ? null : v })}>
              <SelectTrigger className="w-52"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">— No route —</SelectItem>
                {routes.map((r) => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={b.status} onValueChange={(v) => update(b.id, { status: v as BusRow["status"] })}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                {["idle", "running", "delayed", "maintenance", "completed"].map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant={b.active ? "outline" : "secondary"} size="sm" onClick={() => update(b.id, { active: !b.active })}>
              {b.active ? "Deactivate" : "Activate"}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => remove(b.id)}><Trash2 className="h-4 w-4" /></Button>
          </div>
        ))}
        {buses.length === 0 && <p className="text-sm text-muted-foreground">No buses yet.</p>}
      </div>
    </CardContent></Card>
  );
}

function RoutesTab({ routes, onChange }: { routes: RouteRow[]; onChange: () => void }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedId, setSelectedId] = useState<string>("");
  const selected = routes.find((r) => r.id === selectedId);
  const [stopName, setStopName] = useState("");
  const [stopLat, setStopLat] = useState("");
  const [stopLng, setStopLng] = useState("");

  async function createRoute() {
    if (!name.trim()) return toast.error("Enter route name");
    const { data, error } = await supabase.from("routes").insert({ name: name.trim(), description: description || null, stops: [] }).select("id").single();
    if (error) return toast.error(error.message);
    setName(""); setDescription("");
    setSelectedId(data.id);
    onChange();
  }

  async function addStop() {
    if (!selected) return;
    const lat = parseFloat(stopLat), lng = parseFloat(stopLng);
    if (!stopName.trim() || Number.isNaN(lat) || Number.isNaN(lng)) return toast.error("Enter stop name and valid lat/lng");
    const newStops = [...selected.stops, { name: stopName.trim(), lat, lng, order: selected.stops.length }];
    const { error } = await supabase.from("routes").update({ stops: newStops }).eq("id", selected.id);
    if (error) return toast.error(error.message);
    setStopName(""); setStopLat(""); setStopLng("");
    onChange();
  }

  async function removeStop(idx: number) {
    if (!selected) return;
    const newStops = selected.stops.filter((_, i) => i !== idx);
    await supabase.from("routes").update({ stops: newStops }).eq("id", selected.id);
    onChange();
  }

  async function removeRoute() {
    if (!selected) return;
    if (!confirm("Delete this route?")) return;
    await supabase.from("routes").delete().eq("id", selected.id);
    setSelectedId("");
    onChange();
  }

  return (
    <Card><CardContent className="space-y-4 pt-6">
      <div className="grid gap-3 sm:grid-cols-3">
        <Input placeholder="Route name (e.g. Gudur - Nellore)" value={name} onChange={(e) => setName(e.target.value)} />
        <Input placeholder="Description" value={description} onChange={(e) => setDescription(e.target.value)} />
        <Button onClick={createRoute}>Create route</Button>
      </div>
      <div className="space-y-1.5">
        <Label>Select route</Label>
        <Select value={selectedId} onValueChange={setSelectedId}>
          <SelectTrigger><SelectValue placeholder="Choose a route to edit" /></SelectTrigger>
          <SelectContent>
            {routes.map((r) => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      {selected && (
        <div className="space-y-3 rounded-lg border border-border p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium">{selected.name}</div>
              <div className="text-xs text-muted-foreground">{selected.description}</div>
            </div>
            <Button variant="ghost" size="sm" onClick={removeRoute}><Trash2 className="h-4 w-4" /></Button>
          </div>
          <div className="grid gap-2 sm:grid-cols-4">
            <Input placeholder="Stop name" value={stopName} onChange={(e) => setStopName(e.target.value)} />
            <Input placeholder="Latitude" value={stopLat} onChange={(e) => setStopLat(e.target.value)} />
            <Input placeholder="Longitude" value={stopLng} onChange={(e) => setStopLng(e.target.value)} />
            <Button onClick={addStop}>Add stop</Button>
          </div>
          <div className="space-y-1">
            {selected.stops.map((s, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <span>{i + 1}. {s.name} <span className="text-muted-foreground">({s.lat.toFixed(4)}, {s.lng.toFixed(4)})</span></span>
                <Button variant="ghost" size="sm" onClick={() => removeStop(i)}><Trash2 className="h-4 w-4" /></Button>
              </div>
            ))}
            {selected.stops.length === 0 && <p className="text-sm text-muted-foreground">No stops yet.</p>}
          </div>
        </div>
      )}
    </CardContent></Card>
  );
}

function DriversTab({
  drivers, buses, assignments, onChange,
}: {
  drivers: Person[]; buses: BusRow[]; assignments: { id: string; driver_id: string; bus_id: string; active: boolean }[]; onChange: () => void;
}) {
  async function assign(driverId: string, busId: string) {
    // deactivate existing assignments for this driver
    await supabase.from("driver_assignments").update({ active: false }).eq("driver_id", driverId);
    const { error } = await supabase.from("driver_assignments").upsert({ driver_id: driverId, bus_id: busId, active: true }, { onConflict: "driver_id,bus_id" });
    if (error) return toast.error(error.message);
    onChange();
    toast.success("Assigned");
  }
  async function unassign(id: string) {
    await supabase.from("driver_assignments").update({ active: false }).eq("id", id);
    onChange();
  }

  return (
    <Card><CardContent className="space-y-3 pt-6">
      {drivers.length === 0 && <p className="text-sm text-muted-foreground">No drivers registered yet. Ask drivers to sign up as "Driver" from the auth screen.</p>}
      {drivers.map((d) => {
        const current = assignments.find((a) => a.driver_id === d.id && a.active);
        const currentBus = current ? buses.find((b) => b.id === current.bus_id) : null;
        return (
          <div key={d.id} className="flex flex-wrap items-center gap-3 rounded-lg border border-border p-3">
            <div className="min-w-40">
              <div className="font-medium">{d.full_name ?? "(no name)"}</div>
              <div className="text-xs text-muted-foreground">{d.email} · {d.phone ?? "no phone"}</div>
            </div>
            <Select value={current?.bus_id ?? ""} onValueChange={(v) => assign(d.id, v)}>
              <SelectTrigger className="w-56"><SelectValue placeholder="Assign bus" /></SelectTrigger>
              <SelectContent>
                {buses.map((b) => <SelectItem key={b.id} value={b.id}>Bus {b.bus_number}</SelectItem>)}
              </SelectContent>
            </Select>
            {currentBus && (
              <>
                <Badge className="bg-primary text-primary-foreground">Bus {currentBus.bus_number}</Badge>
                <Button variant="ghost" size="sm" onClick={() => current && unassign(current.id)}>Unassign</Button>
              </>
            )}
          </div>
        );
      })}
    </CardContent></Card>
  );
}

function AnnouncementsTab({ routes }: { routes: RouteRow[] }) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [role, setRole] = useState<string>("all");
  const [routeId, setRouteId] = useState<string>("");
  const [emergency, setEmergency] = useState(false);
  const [list, setList] = useState<{ id: string; title: string; body: string; created_at: string; is_emergency: boolean }[]>([]);

  async function load() {
    const { data } = await supabase.from("announcements").select("id,title,body,created_at,is_emergency").order("created_at", { ascending: false }).limit(20);
    setList(data ?? []);
  }
  useEffect(() => { load(); }, []);

  async function send() {
    if (!title.trim() || !body.trim()) return toast.error("Fill title and body");
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return toast.error("You must be signed in");
    const { error } = await supabase.from("announcements").insert({
      title: title.trim(), body: body.trim(),
      target_role: role === "all" ? null : (role as "student" | "faculty" | "driver"),
      route_id: routeId || null,
      is_emergency: emergency,
      created_by: u.user.id,
    });
    if (error) return toast.error(error.message);
    setTitle(""); setBody(""); setEmergency(false);
    load();
    toast.success("Sent");
  }

  return (
    <Card><CardContent className="space-y-4 pt-6">
      <div className="grid gap-2 sm:grid-cols-2">
        <Input placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} />
        <div className="grid grid-cols-2 gap-2">
          <Select value={role} onValueChange={setRole}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Everyone</SelectItem>
              <SelectItem value="student">Students</SelectItem>
              <SelectItem value="faculty">Faculty</SelectItem>
              <SelectItem value="driver">Drivers</SelectItem>
            </SelectContent>
          </Select>
          <Select value={routeId} onValueChange={setRouteId}>
            <SelectTrigger><SelectValue placeholder="Any route" /></SelectTrigger>
            <SelectContent>
              {routes.map((r) => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>
      <Textarea placeholder="Message" value={body} onChange={(e) => setBody(e.target.value)} maxLength={1000} rows={3} />
      <div className="flex items-center gap-2">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={emergency} onChange={(e) => setEmergency(e.target.checked)} /> Emergency
        </label>
        <div className="ml-auto"><Button onClick={send}>Send</Button></div>
      </div>
      <div className="space-y-2">
        {list.map((a) => (
          <div key={a.id} className={`rounded-lg border p-3 ${a.is_emergency ? "border-destructive/50 bg-destructive/5" : "border-border"}`}>
            <div className="flex items-center justify-between">
              <div className="font-medium">{a.title}</div>
              <span className="text-[11px] text-muted-foreground">{new Date(a.created_at).toLocaleString()}</span>
            </div>
            <div className="text-sm text-muted-foreground">{a.body}</div>
          </div>
        ))}
      </div>
    </CardContent></Card>
  );
}