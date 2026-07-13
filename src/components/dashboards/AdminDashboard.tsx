import { useEffect, useMemo, useState } from "react";
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
import {
  Bus,
  Route as RouteIcon,
  Users,
  Megaphone,
  Trash2,
  FlaskConical,
  ArrowLeft,
  ArrowRight,
  GraduationCap,
  BookOpen,
  History,
  MessageSquareWarning,
  Eye,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import { DemoModeTab } from "@/components/dashboards/DemoModeTab";
import { AnalyticsTab } from "@/components/dashboards/AnalyticsTab";
import { AcademicYearsTab } from "@/components/dashboards/AcademicYearsTab";
import { PromoteStudentsTab } from "@/components/dashboards/PromoteStudentsTab";
import { ImportStudentsTab } from "@/components/dashboards/ImportStudentsTab";
import { BarChart3, Clock, Activity } from "lucide-react";
import { useAppSettings } from "@/lib/app-settings";
import { audit } from "@/lib/audit";
import { StatCard } from "@/components/StatCard";
import { FleetCharts } from "@/components/FleetCharts";
import { DataTable, type Column } from "@/components/DataTable";
import { StatusBadge } from "@/components/StatusBadge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type BusStatus = "idle" | "running" | "delayed" | "maintenance" | "completed";
type BusRow = { id: string; bus_number: string; capacity: number; route_id: string | null; status: BusStatus; active: boolean };
type RouteRow = { id: string; name: string; description: string | null; stops: Stop[]; active: boolean };
type Stop = { name: string; lat: number; lng: number; order?: number };
type Loc = { bus_id: string; lat: number; lng: number; updated_at: string };
type Person = { id: string; full_name: string | null; email: string | null; phone: string | null; department?: string | null; roll_no?: string | null; employee_id?: string | null; license_no?: string | null };
type Trip = { id: string; bus_id: string; driver_id: string; started_at: string; ended_at: string | null; status: string; notes: string | null };
type Feedback = { id: string; user_id: string; bus_id: string | null; subject: string; message: string; resolved: boolean; created_at: string };
type Announcement = { id: string; title: string; body: string; created_at: string; is_emergency: boolean; target_role: string | null; route_id: string | null };

export function AdminDashboard({ user }: { user: User }) {
  void user;
  const [buses, setBuses] = useState<BusRow[]>([]);
  const [routes, setRoutes] = useState<RouteRow[]>([]);
  const [locs, setLocs] = useState<Record<string, Loc>>({});
  const [drivers, setDrivers] = useState<Person[]>([]);
  const [students, setStudents] = useState<Person[]>([]);
  const [faculty, setFaculty] = useState<Person[]>([]);
  const [driverAssignments, setDriverAssignments] = useState<{ id: string; driver_id: string; bus_id: string; active: boolean }[]>([]);
  const [studentAssignments, setStudentAssignments] = useState<{ id: string; user_id: string; bus_id: string; boarding_stop: string | null }[]>([]);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);
  const { settings } = useAppSettings();
  const demoEnabled = settings.demoModeEnabled;
  const [tabHistory, setTabHistory] = useState<string[]>(() => {
    if (typeof window === "undefined") return ["buses"];
    try {
      const raw = window.sessionStorage.getItem("admin.dashboard.tabHistory");
      if (raw) {
        const parsed = JSON.parse(raw) as string[];
        if (Array.isArray(parsed) && parsed.length) return parsed;
      }
    } catch { /* ignore */ }
    return ["buses"];
  });
  const [tabIndex, setTabIndex] = useState(() => {
    if (typeof window === "undefined") return 0;
    const raw = window.sessionStorage.getItem("admin.dashboard.tabIndex");
    const n = raw ? Number(raw) : 0;
    return Number.isFinite(n) && n >= 0 ? n : 0;
  });
  const currentTab = tabHistory[tabIndex];

  // If demo mode is turned off while sitting on the demo tab, fall back to buses.
  useEffect(() => {
    if (!demoEnabled && currentTab === "demo") {
      setTabHistory((h) => {
        const next = h.map((t) => (t === "demo" ? "buses" : t));
        return next;
      });
    }
  }, [demoEnabled, currentTab]);

  function goToTab(v: string) {
    if (v === currentTab) return;
    const next = tabHistory.slice(0, tabIndex + 1);
    next.push(v);
    setTabHistory(next);
    setTabIndex(next.length - 1);
  }

  // Persist tab state so returning from Profile / Settings restores context.
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.sessionStorage.setItem("admin.dashboard.tabHistory", JSON.stringify(tabHistory));
      window.sessionStorage.setItem("admin.dashboard.tabIndex", String(tabIndex));
    } catch { /* ignore quota */ }
  }, [tabHistory, tabIndex]);

  async function refreshAll() {
    setLoading(true);
    const [b, r, l, da, sa, ur, tr, fb] = await Promise.all([
      supabase.from("buses").select("*").order("bus_number"),
      supabase.from("routes").select("*").order("name"),
      supabase.from("bus_locations").select("*"),
      supabase.from("driver_assignments").select("*"),
      supabase.from("student_assignments").select("*"),
      supabase.from("user_roles").select("user_id,role"),
      supabase.from("trips").select("*").order("started_at", { ascending: false }).limit(200),
      supabase.from("feedback").select("*").order("created_at", { ascending: false }).limit(200),
    ]);
    setBuses((b.data ?? []) as BusRow[]);
    setRoutes(((r.data ?? []) as unknown as RouteRow[]).map((x) => ({ ...x, stops: Array.isArray(x.stops) ? x.stops : [] })));
    const map: Record<string, Loc> = {};
    (l.data ?? []).forEach((x) => (map[(x as Loc).bus_id] = x as Loc));
    setLocs(map);
    setDriverAssignments(da.data ?? []);
    setStudentAssignments(sa.data ?? []);
    setTrips((tr.data ?? []) as Trip[]);
    setFeedback((fb.data ?? []) as Feedback[]);
    const roleRows = ur.data ?? [];
    const byRole = (name: string) => roleRows.filter((x) => x.role === name).map((x) => x.user_id);
    const driverIds = byRole("driver");
    const studentIds = byRole("student");
    const facultyIds = byRole("faculty");
    const allIds = Array.from(new Set([...driverIds, ...studentIds, ...facultyIds]));
    if (allIds.length) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("id,full_name,email,phone,department,roll_no,employee_id,license_no")
        .in("id", allIds);
      const list = (profs ?? []) as Person[];
      const byId = new Map(list.map((p) => [p.id, p]));
      setDrivers(driverIds.map((id) => byId.get(id)).filter(Boolean) as Person[]);
      setStudents(studentIds.map((id) => byId.get(id)).filter(Boolean) as Person[]);
      setFaculty(facultyIds.map((id) => byId.get(id)).filter(Boolean) as Person[]);
    } else {
      setDrivers([]);
      setStudents([]);
      setFaculty([]);
    }
    setLoading(false);
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

  const activeBuses = buses.filter((b) => b.active).length;
  const delayedBuses = buses.filter((b) => b.status === "delayed").length;
  const todayKey = new Date().toISOString().slice(0, 10);
  const weekAgo = Date.now() - 7 * 86400_000;
  const monthAgo = Date.now() - 30 * 86400_000;
  const tripsToday = trips.filter((t) => t.started_at.slice(0, 10) === todayKey).length;
  const tripsWeek = trips.filter((t) => new Date(t.started_at).getTime() >= weekAgo).length;
  const tripsMonth = trips.filter((t) => new Date(t.started_at).getTime() >= monthAgo).length;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total buses" value={buses.length} icon={Bus} tone="primary" hint={`${routes.length} routes configured`} />
        <StatCard
          label="Active buses"
          value={activeBuses}
          icon={RouteIcon}
          tone="success"
          hint={`${buses.length ? Math.round((activeBuses / buses.length) * 100) : 0}% of fleet`}
        />
        <StatCard label="Live now" value={Object.keys(locs).length} icon={FlaskConical} tone="accent" hint="Reporting GPS in real time" />
        <StatCard label="Delayed buses" value={delayedBuses} icon={Clock} tone={delayedBuses > 0 ? "warning" : "success"} hint={delayedBuses === 0 ? "On schedule" : "Attention needed"} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Students" value={students.length} icon={GraduationCap} tone="primary" hint={`${studentAssignments.length} assignments`} />
        <StatCard label="Faculty" value={faculty.length} icon={BookOpen} tone="accent" hint="Registered users" />
        <StatCard label="Drivers" value={drivers.length} icon={Users} tone="warning" hint={`${driverAssignments.filter((a) => a.active).length} assigned`} />
        <StatCard label="Trips today" value={tripsToday} icon={Activity} tone="success" hint={`${tripsWeek} this week · ${tripsMonth} this month`} />
      </div>

      <FleetCharts buses={buses.map((b) => ({ status: b.status, active: b.active }))} />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Bus className="h-5 w-5 text-accent" /> Live Fleet Map</CardTitle>
        </CardHeader>
        <CardContent>
          <BusMap buses={mapBuses} />
        </CardContent>
      </Card>

      <Tabs value={currentTab} onValueChange={goToTab}>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" className="h-9 w-9 shrink-0" onClick={() => setTabIndex((i) => Math.max(0, i - 1))} disabled={tabIndex === 0} aria-label="Previous tab">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" className="h-9 w-9 shrink-0" onClick={() => setTabIndex((i) => Math.min(tabHistory.length - 1, i + 1))} disabled={tabIndex >= tabHistory.length - 1} aria-label="Next tab">
            <ArrowRight className="h-4 w-4" />
          </Button>
          <div className="min-w-0 flex-1 overflow-x-auto">
            <TabsList className="w-max">
              <TabsTrigger value="buses"><Bus className="mr-1 h-4 w-4" />Buses</TabsTrigger>
              <TabsTrigger value="routes"><RouteIcon className="mr-1 h-4 w-4" />Routes</TabsTrigger>
              <TabsTrigger value="drivers"><Users className="mr-1 h-4 w-4" />Drivers</TabsTrigger>
              <TabsTrigger value="students"><GraduationCap className="mr-1 h-4 w-4" />Students</TabsTrigger>
              <TabsTrigger value="faculty"><BookOpen className="mr-1 h-4 w-4" />Faculty</TabsTrigger>
              <TabsTrigger value="years"><CalendarDays className="mr-1 h-4 w-4" />Academic Years</TabsTrigger>
              <TabsTrigger value="promote"><ArrowUpRight className="mr-1 h-4 w-4" />Promote</TabsTrigger>
              <TabsTrigger value="import"><Upload className="mr-1 h-4 w-4" />Import</TabsTrigger>
              <TabsTrigger value="announce"><Megaphone className="mr-1 h-4 w-4" />Announcements</TabsTrigger>
              <TabsTrigger value="trips"><History className="mr-1 h-4 w-4" />Trip History</TabsTrigger>
              <TabsTrigger value="analytics"><BarChart3 className="mr-1 h-4 w-4" />Analytics</TabsTrigger>
              <TabsTrigger value="reports"><MessageSquareWarning className="mr-1 h-4 w-4" />Reports</TabsTrigger>
              {demoEnabled && (
                <TabsTrigger value="demo"><FlaskConical className="mr-1 h-4 w-4" />Demo Mode</TabsTrigger>
              )}
            </TabsList>
          </div>
        </div>

        <TabsContent value="buses"><BusesTab buses={buses} routes={routes} loading={loading} onChange={refreshAll} /></TabsContent>
        <TabsContent value="routes"><RoutesTab routes={routes} loading={loading} onChange={refreshAll} /></TabsContent>
        <TabsContent value="drivers"><DriversTab drivers={drivers} buses={buses} assignments={driverAssignments} loading={loading} onChange={refreshAll} /></TabsContent>
        <TabsContent value="students"><StudentsTab students={students} buses={buses} assignments={studentAssignments} loading={loading} /></TabsContent>
        <TabsContent value="faculty"><FacultyTab faculty={faculty} loading={loading} /></TabsContent>
        <TabsContent value="years"><AcademicYearsTab /></TabsContent>
        <TabsContent value="promote"><PromoteStudentsTab /></TabsContent>
        <TabsContent value="import"><ImportStudentsTab /></TabsContent>
        <TabsContent value="announce"><AnnouncementsTab routes={routes} /></TabsContent>
        <TabsContent value="trips"><TripsTab trips={trips} buses={buses} drivers={drivers} loading={loading} /></TabsContent>
        <TabsContent value="analytics"><AnalyticsTab buses={buses} routes={routes} drivers={drivers} /></TabsContent>
        <TabsContent value="reports"><ReportsTab feedback={feedback} buses={buses} loading={loading} onChange={refreshAll} /></TabsContent>
        {demoEnabled && (
          <TabsContent value="demo"><DemoModeTab onDataChange={refreshAll} /></TabsContent>
        )}
      </Tabs>
    </div>
  );
}

function BusesTab({ buses, routes, loading, onChange }: { buses: BusRow[]; routes: RouteRow[]; loading: boolean; onChange: () => void }) {
  const [busNumber, setBusNumber] = useState("");
  const [capacity, setCapacity] = useState(40);
  const [routeId, setRouteId] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [routeFilter, setRouteFilter] = useState("all");

  async function add() {
    if (!busNumber.trim()) return toast.error("Enter bus number");
    const after = { bus_number: busNumber.trim(), capacity, route_id: routeId || null };
    const { data: created, error } = await supabase.from("buses").insert(after).select("id").single();
    if (error) return toast.error(error.message);
    audit("bus.create", { entityType: "bus", entityId: created?.id, after });
    setBusNumber("");
    onChange();
    toast.success("Bus added");
  }

  async function update(id: string, patch: { route_id?: string | null; status?: BusStatus; active?: boolean }) {
    const before = buses.find((b) => b.id === id);
    const { error } = await supabase.from("buses").update(patch).eq("id", id);
    if (error) return toast.error(error.message);
    audit("bus.update", { entityType: "bus", entityId: id, before, after: patch });
    onChange();
  }

  async function remove(id: string) {
    if (!confirm("Delete this bus?")) return;
    const before = buses.find((b) => b.id === id);
    const { error } = await supabase.from("buses").delete().eq("id", id);
    if (error) return toast.error(error.message);
    audit("bus.delete", { entityType: "bus", entityId: id, before });
    onChange();
  }

  const filtered = useMemo(() => {
    return buses.filter((b) => {
      if (statusFilter !== "all" && b.status !== statusFilter) return false;
      if (routeFilter !== "all" && (b.route_id ?? "none") !== routeFilter) return false;
      return true;
    });
  }, [buses, statusFilter, routeFilter]);

  const columns: Column<BusRow>[] = [
    { key: "bus_number", header: "Bus", sortValue: (b) => b.bus_number, csv: (b) => b.bus_number, accessor: (b) => <Badge className="bg-primary text-primary-foreground">Bus {b.bus_number}</Badge> },
    { key: "capacity", header: "Capacity", sortValue: (b) => b.capacity, csv: (b) => b.capacity, accessor: (b) => <span className="tabular-nums">{b.capacity}</span> },
    {
      key: "route", header: "Route",
      sortValue: (b) => routes.find((r) => r.id === b.route_id)?.name ?? "",
      csv: (b) => routes.find((r) => r.id === b.route_id)?.name ?? "",
      accessor: (b) => (
        <Select value={b.route_id ?? "none"} onValueChange={(v) => update(b.id, { route_id: v === "none" ? null : v })}>
          <SelectTrigger className="h-8 w-full min-w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="none">— No route —</SelectItem>
            {routes.map((r) => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
          </SelectContent>
        </Select>
      ),
    },
    { key: "status", header: "Status", sortValue: (b) => b.status, csv: (b) => b.status, accessor: (b) => <StatusBadge status={b.status} /> },
    { key: "active", header: "Active", sortValue: (b) => (b.active ? 1 : 0), csv: (b) => (b.active ? "yes" : "no"),
      accessor: (b) => (
        <Button variant={b.active ? "outline" : "secondary"} size="sm" onClick={() => update(b.id, { active: !b.active })}>
          {b.active ? "Deactivate" : "Activate"}
        </Button>
      ),
    },
    { key: "actions", header: "", accessor: (b) => (
      <Button variant="ghost" size="sm" onClick={() => remove(b.id)} aria-label="Delete bus"><Trash2 className="h-4 w-4" /></Button>
    ), className: "w-10" },
  ];

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
      <DataTable
        rows={filtered}
        columns={columns}
        loading={loading}
        filters={
          <>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-9 w-36"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                {["idle", "running", "delayed", "maintenance", "completed"].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={routeFilter} onValueChange={setRouteFilter}>
              <SelectTrigger className="h-9 w-44"><SelectValue placeholder="Route" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All routes</SelectItem>
                <SelectItem value="none">No route</SelectItem>
                {routes.map((r) => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </>
        }
        searchKeys={(b) => `${b.bus_number} ${routes.find((r) => r.id === b.route_id)?.name ?? ""} ${b.status}`}
        csvFilename="buses"
        pdfTitle="Bus Fleet"
        emptyMessage="No buses match these filters."
      />
    </CardContent></Card>
  );
}

function RoutesTab({ routes, loading, onChange }: { routes: RouteRow[]; loading: boolean; onChange: () => void }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedId, setSelectedId] = useState<string>("");
  const selected = routes.find((r) => r.id === selectedId);
  const [stopName, setStopName] = useState("");
  const [stopLat, setStopLat] = useState("");
  const [stopLng, setStopLng] = useState("");

  async function createRoute() {
    if (!name.trim()) return toast.error("Enter route name");
    const after = { name: name.trim(), description: description || null, stops: [] };
    const { data, error } = await supabase.from("routes").insert(after).select("id").single();
    if (error) return toast.error(error.message);
    audit("route.create", { entityType: "route", entityId: data.id, after });
    setName(""); setDescription("");
    setSelectedId(data.id);
    onChange();
  }
  async function addStop() {
    if (!selected) return;
    const lat = parseFloat(stopLat), lng = parseFloat(stopLng);
    if (!stopName.trim() || Number.isNaN(lat) || Number.isNaN(lng)) return toast.error("Enter stop name and valid lat/lng");
    const newStop = { name: stopName.trim(), lat, lng, order: selected.stops.length };
    const newStops = [...selected.stops, newStop];
    const { error } = await supabase.from("routes").update({ stops: newStops }).eq("id", selected.id);
    if (error) return toast.error(error.message);
    audit("route.stop.add", { entityType: "route", entityId: selected.id, after: newStop, details: { totalStops: newStops.length } });
    setStopName(""); setStopLat(""); setStopLng("");
    onChange();
  }
  async function removeStop(idx: number) {
    if (!selected) return;
    const removed = selected.stops[idx];
    const newStops = selected.stops.filter((_, i) => i !== idx);
    await supabase.from("routes").update({ stops: newStops }).eq("id", selected.id);
    audit("route.stop.remove", { entityType: "route", entityId: selected.id, before: removed, details: { totalStops: newStops.length } });
    onChange();
  }
  async function removeRoute(id: string) {
    if (!confirm("Delete this route?")) return;
    const before = routes.find((r) => r.id === id);
    await supabase.from("routes").delete().eq("id", id);
    audit("route.delete", { entityType: "route", entityId: id, before });
    if (selectedId === id) setSelectedId("");
    onChange();
  }
  async function toggleActive(r: RouteRow) {
    await supabase.from("routes").update({ active: !r.active }).eq("id", r.id);
    audit("route.update", { entityType: "route", entityId: r.id, before: { active: r.active }, after: { active: !r.active } });
    onChange();
  }

  const columns: Column<RouteRow>[] = [
    { key: "name", header: "Route", sortValue: (r) => r.name, csv: (r) => r.name, accessor: (r) => <span className="font-medium">{r.name}</span> },
    { key: "description", header: "Description", sortValue: (r) => r.description ?? "", csv: (r) => r.description ?? "", accessor: (r) => <span className="text-muted-foreground">{r.description ?? "—"}</span> },
    { key: "stops", header: "Stops", sortValue: (r) => r.stops.length, csv: (r) => r.stops.length, accessor: (r) => <span className="tabular-nums">{r.stops.length}</span> },
    { key: "status", header: "Status", sortValue: (r) => (r.active ? 1 : 0), csv: (r) => (r.active ? "active" : "inactive"), accessor: (r) => <StatusBadge status={r.active ? "active" : "inactive"} /> },
    { key: "actions", header: "Actions", className: "w-40 text-right",
      accessor: (r) => (
        <div className="flex justify-end gap-1">
          <Button variant="ghost" size="sm" onClick={() => setSelectedId(r.id)} aria-label="View route"><Eye className="h-4 w-4" /></Button>
          <Button variant="ghost" size="sm" onClick={() => toggleActive(r)}>{r.active ? "Disable" : "Enable"}</Button>
          <Button variant="ghost" size="sm" onClick={() => removeRoute(r.id)} aria-label="Delete route"><Trash2 className="h-4 w-4" /></Button>
        </div>
      ) },
  ];

  return (
    <Card><CardContent className="space-y-4 pt-6">
      <div className="grid gap-3 sm:grid-cols-3">
        <Input placeholder="Route name (e.g. Gudur - Nellore)" value={name} onChange={(e) => setName(e.target.value)} />
        <Input placeholder="Description" value={description} onChange={(e) => setDescription(e.target.value)} />
        <Button onClick={createRoute}>Create route</Button>
      </div>
      <DataTable
        rows={routes}
        columns={columns}
        loading={loading}
        searchKeys={(r) => `${r.name} ${r.description ?? ""}`}
        csvFilename="routes"
        pdfTitle="Routes"
        emptyMessage="No routes yet."
      />
      {selected && (
        <div className="space-y-3 rounded-lg border border-border p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium">{selected.name}</div>
              <div className="text-xs text-muted-foreground">{selected.description}</div>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setSelectedId("")}>Close</Button>
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
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">Or select a route to edit its stops:</Label>
        <Select value={selectedId} onValueChange={setSelectedId}>
          <SelectTrigger className="max-w-md"><SelectValue placeholder="Choose a route to edit" /></SelectTrigger>
          <SelectContent>
            {routes.map((r) => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
    </CardContent></Card>
  );
}

function DriversTab({ drivers, buses, assignments, loading, onChange }: { drivers: Person[]; buses: BusRow[]; assignments: { id: string; driver_id: string; bus_id: string; active: boolean }[]; loading: boolean; onChange: () => void }) {
  const [busFilter, setBusFilter] = useState("all");
  const [viewing, setViewing] = useState<Person | null>(null);

  async function assign(driverId: string, busId: string) {
    const prev = assignments.find((x) => x.driver_id === driverId && x.active);
    await supabase.from("driver_assignments").update({ active: false }).eq("driver_id", driverId);
    const { error } = await supabase.from("driver_assignments").upsert({ driver_id: driverId, bus_id: busId, active: true }, { onConflict: "driver_id,bus_id" });
    if (error) return toast.error(error.message);
    audit("driver.assign", { entityType: "driver_assignment", entityId: driverId, before: prev, after: { driver_id: driverId, bus_id: busId, active: true } });
    onChange();
    toast.success("Assigned");
  }
  async function unassign(id: string) {
    const before = assignments.find((x) => x.id === id);
    await supabase.from("driver_assignments").update({ active: false }).eq("id", id);
    audit("driver.unassign", { entityType: "driver_assignment", entityId: id, before });
    onChange();
  }

  function currentBusOf(driverId: string) {
    const a = assignments.find((x) => x.driver_id === driverId && x.active);
    return a ? { assignment: a, bus: buses.find((b) => b.id === a.bus_id) ?? null } : null;
  }

  const filtered = useMemo(() => {
    if (busFilter === "all") return drivers;
    if (busFilter === "unassigned") return drivers.filter((d) => !currentBusOf(d.id));
    return drivers.filter((d) => currentBusOf(d.id)?.bus?.id === busFilter);
  }, [drivers, busFilter, assignments]);

  const columns: Column<Person>[] = [
    { key: "name", header: "Driver", sortValue: (d) => d.full_name ?? "", csv: (d) => d.full_name ?? "",
      accessor: (d) => <span className="font-medium">{d.full_name ?? "(no name)"}</span> },
    { key: "email", header: "Email", sortValue: (d) => d.email ?? "", csv: (d) => d.email ?? "",
      accessor: (d) => <span className="text-muted-foreground">{d.email ?? "—"}</span> },
    { key: "phone", header: "Phone", sortValue: (d) => d.phone ?? "", csv: (d) => d.phone ?? "",
      accessor: (d) => <span className="tabular-nums">{d.phone ?? "—"}</span> },
    { key: "license", header: "License", sortValue: (d) => d.license_no ?? "", csv: (d) => d.license_no ?? "",
      accessor: (d) => <span className="text-muted-foreground">{d.license_no ?? "—"}</span> },
    { key: "bus", header: "Bus",
      sortValue: (d) => currentBusOf(d.id)?.bus?.bus_number ?? "",
      csv: (d) => currentBusOf(d.id)?.bus?.bus_number ?? "",
      accessor: (d) => {
        const cur = currentBusOf(d.id);
        return (
          <Select value={cur?.bus?.id ?? ""} onValueChange={(v) => assign(d.id, v)}>
            <SelectTrigger className="h-8 w-44"><SelectValue placeholder="Assign bus" /></SelectTrigger>
            <SelectContent>
              {buses.map((b) => <SelectItem key={b.id} value={b.id}>Bus {b.bus_number}</SelectItem>)}
            </SelectContent>
          </Select>
        );
      },
    },
    { key: "status", header: "Status",
      sortValue: (d) => (currentBusOf(d.id) ? 1 : 0),
      csv: (d) => (currentBusOf(d.id) ? "assigned" : "unassigned"),
      accessor: (d) => <StatusBadge status={currentBusOf(d.id) ? "active" : "inactive"} /> },
    { key: "actions", header: "", className: "w-24 text-right",
      accessor: (d) => {
        const cur = currentBusOf(d.id);
        return (
          <div className="flex justify-end gap-1">
            <Button variant="ghost" size="sm" aria-label="View" onClick={() => setViewing(d)}><Eye className="h-4 w-4" /></Button>
            {cur && <Button variant="ghost" size="sm" onClick={() => unassign(cur.assignment.id)}>Unassign</Button>}
          </div>
        );
      } },
  ];

  return (
    <Card><CardContent className="space-y-4 pt-6">
      <DataTable
        rows={filtered}
        columns={columns}
        loading={loading}
        searchKeys={(d) => `${d.full_name ?? ""} ${d.email ?? ""} ${d.phone ?? ""} ${d.license_no ?? ""}`}
        csvFilename="drivers"
        pdfTitle="Drivers"
        emptyMessage="No drivers registered yet."
        filters={
          <Select value={busFilter} onValueChange={setBusFilter}>
            <SelectTrigger className="h-9 w-44"><SelectValue placeholder="Bus" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All drivers</SelectItem>
              <SelectItem value="unassigned">Unassigned</SelectItem>
              {buses.map((b) => <SelectItem key={b.id} value={b.id}>Bus {b.bus_number}</SelectItem>)}
            </SelectContent>
          </Select>
        }
      />
      <PersonDialog person={viewing} onClose={() => setViewing(null)} role="Driver" />
    </CardContent></Card>
  );
}

function StudentsTab({ students, buses, assignments, loading }: { students: Person[]; buses: BusRow[]; assignments: { id: string; user_id: string; bus_id: string; boarding_stop: string | null }[]; loading: boolean }) {
  const [busFilter, setBusFilter] = useState("all");
  const [deptFilter, setDeptFilter] = useState("all");
  const [viewing, setViewing] = useState<Person | null>(null);

  const departments = Array.from(new Set(students.map((s) => s.department).filter(Boolean))) as string[];

  function busOf(userId: string) {
    const a = assignments.find((x) => x.user_id === userId);
    return a ? buses.find((b) => b.id === a.bus_id) ?? null : null;
  }

  const filtered = useMemo(() => {
    return students.filter((s) => {
      if (deptFilter !== "all" && s.department !== deptFilter) return false;
      if (busFilter === "all") return true;
      if (busFilter === "unassigned") return !busOf(s.id);
      return busOf(s.id)?.id === busFilter;
    });
  }, [students, busFilter, deptFilter, assignments]);

  const columns: Column<Person>[] = [
    { key: "name", header: "Student", sortValue: (s) => s.full_name ?? "", csv: (s) => s.full_name ?? "", accessor: (s) => <span className="font-medium">{s.full_name ?? "(no name)"}</span> },
    { key: "roll", header: "Roll no", sortValue: (s) => s.roll_no ?? "", csv: (s) => s.roll_no ?? "", accessor: (s) => <span className="tabular-nums">{s.roll_no ?? "—"}</span> },
    { key: "dept", header: "Department", sortValue: (s) => s.department ?? "", csv: (s) => s.department ?? "", accessor: (s) => <span className="text-muted-foreground">{s.department ?? "—"}</span> },
    { key: "email", header: "Email", sortValue: (s) => s.email ?? "", csv: (s) => s.email ?? "", accessor: (s) => <span className="text-muted-foreground">{s.email ?? "—"}</span> },
    { key: "bus", header: "Bus",
      sortValue: (s) => busOf(s.id)?.bus_number ?? "",
      csv: (s) => busOf(s.id)?.bus_number ?? "",
      accessor: (s) => {
        const b = busOf(s.id);
        return b ? <Badge className="bg-primary text-primary-foreground">Bus {b.bus_number}</Badge> : <StatusBadge status="inactive" />;
      } },
    { key: "actions", header: "", className: "w-16 text-right",
      accessor: (s) => <Button variant="ghost" size="sm" aria-label="View" onClick={() => setViewing(s)}><Eye className="h-4 w-4" /></Button> },
  ];

  return (
    <Card><CardContent className="space-y-4 pt-6">
      <DataTable
        rows={filtered}
        columns={columns}
        loading={loading}
        searchKeys={(s) => `${s.full_name ?? ""} ${s.email ?? ""} ${s.roll_no ?? ""} ${s.department ?? ""}`}
        csvFilename="students"
        pdfTitle="Students"
        emptyMessage="No students match these filters."
        filters={
          <>
            <Select value={deptFilter} onValueChange={setDeptFilter}>
              <SelectTrigger className="h-9 w-40"><SelectValue placeholder="Department" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All departments</SelectItem>
                {departments.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={busFilter} onValueChange={setBusFilter}>
              <SelectTrigger className="h-9 w-40"><SelectValue placeholder="Bus" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All buses</SelectItem>
                <SelectItem value="unassigned">Unassigned</SelectItem>
                {buses.map((b) => <SelectItem key={b.id} value={b.id}>Bus {b.bus_number}</SelectItem>)}
              </SelectContent>
            </Select>
          </>
        }
      />
      <PersonDialog person={viewing} onClose={() => setViewing(null)} role="Student" />
    </CardContent></Card>
  );
}

function FacultyTab({ faculty, loading }: { faculty: Person[]; loading: boolean }) {
  const [deptFilter, setDeptFilter] = useState("all");
  const [viewing, setViewing] = useState<Person | null>(null);
  const departments = Array.from(new Set(faculty.map((s) => s.department).filter(Boolean))) as string[];
  const filtered = deptFilter === "all" ? faculty : faculty.filter((f) => f.department === deptFilter);

  const columns: Column<Person>[] = [
    { key: "name", header: "Name", sortValue: (f) => f.full_name ?? "", csv: (f) => f.full_name ?? "", accessor: (f) => <span className="font-medium">{f.full_name ?? "(no name)"}</span> },
    { key: "empid", header: "Employee ID", sortValue: (f) => f.employee_id ?? "", csv: (f) => f.employee_id ?? "", accessor: (f) => <span className="tabular-nums">{f.employee_id ?? "—"}</span> },
    { key: "dept", header: "Department", sortValue: (f) => f.department ?? "", csv: (f) => f.department ?? "", accessor: (f) => <span className="text-muted-foreground">{f.department ?? "—"}</span> },
    { key: "email", header: "Email", sortValue: (f) => f.email ?? "", csv: (f) => f.email ?? "", accessor: (f) => <span className="text-muted-foreground">{f.email ?? "—"}</span> },
    { key: "phone", header: "Phone", sortValue: (f) => f.phone ?? "", csv: (f) => f.phone ?? "", accessor: (f) => <span className="tabular-nums">{f.phone ?? "—"}</span> },
    { key: "actions", header: "", className: "w-16 text-right",
      accessor: (f) => <Button variant="ghost" size="sm" aria-label="View" onClick={() => setViewing(f)}><Eye className="h-4 w-4" /></Button> },
  ];

  return (
    <Card><CardContent className="space-y-4 pt-6">
      <DataTable
        rows={filtered}
        columns={columns}
        loading={loading}
        searchKeys={(f) => `${f.full_name ?? ""} ${f.email ?? ""} ${f.employee_id ?? ""} ${f.department ?? ""}`}
        csvFilename="faculty"
        pdfTitle="Faculty"
        emptyMessage="No faculty records yet."
        filters={
          <Select value={deptFilter} onValueChange={setDeptFilter}>
            <SelectTrigger className="h-9 w-40"><SelectValue placeholder="Department" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All departments</SelectItem>
              {departments.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
            </SelectContent>
          </Select>
        }
      />
      <PersonDialog person={viewing} onClose={() => setViewing(null)} role="Faculty" />
    </CardContent></Card>
  );
}

function TripsTab({ trips, buses, drivers, loading }: { trips: Trip[]; buses: BusRow[]; drivers: Person[]; loading: boolean }) {
  const [statusFilter, setStatusFilter] = useState("all");
  const [busFilter, setBusFilter] = useState("all");
  const [driverFilter, setDriverFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("");

  const filtered = useMemo(() => {
    return trips.filter((t) => {
      if (statusFilter !== "all" && t.status !== statusFilter) return false;
      if (busFilter !== "all" && t.bus_id !== busFilter) return false;
      if (driverFilter !== "all" && t.driver_id !== driverFilter) return false;
      if (dateFilter && !t.started_at.startsWith(dateFilter)) return false;
      return true;
    });
  }, [trips, statusFilter, busFilter, driverFilter, dateFilter]);

  function busName(id: string) { return buses.find((b) => b.id === id)?.bus_number ?? "—"; }
  function driverName(id: string) { return drivers.find((d) => d.id === id)?.full_name ?? "—"; }
  function duration(t: Trip) {
    if (!t.ended_at) return "In progress";
    const ms = new Date(t.ended_at).getTime() - new Date(t.started_at).getTime();
    const m = Math.round(ms / 60000);
    return m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m}m`;
  }

  const columns: Column<Trip>[] = [
    { key: "started", header: "Started", sortValue: (t) => t.started_at, csv: (t) => new Date(t.started_at).toLocaleString(),
      accessor: (t) => <span className="tabular-nums text-sm">{new Date(t.started_at).toLocaleString()}</span> },
    { key: "bus", header: "Bus", sortValue: (t) => busName(t.bus_id), csv: (t) => busName(t.bus_id),
      accessor: (t) => <Badge className="bg-primary text-primary-foreground">Bus {busName(t.bus_id)}</Badge> },
    { key: "driver", header: "Driver", sortValue: (t) => driverName(t.driver_id), csv: (t) => driverName(t.driver_id),
      accessor: (t) => <span>{driverName(t.driver_id)}</span> },
    { key: "duration", header: "Duration", sortValue: (t) => t.ended_at ? new Date(t.ended_at).getTime() - new Date(t.started_at).getTime() : 0, csv: duration, accessor: (t) => <span className="tabular-nums text-sm">{duration(t)}</span> },
    { key: "status", header: "Status", sortValue: (t) => t.status, csv: (t) => t.status, accessor: (t) => <StatusBadge status={t.status} /> },
    { key: "notes", header: "Notes", sortValue: (t) => t.notes ?? "", csv: (t) => t.notes ?? "",
      accessor: (t) => <span className="text-muted-foreground text-sm">{t.notes ?? "—"}</span> },
  ];

  return (
    <Card><CardContent className="space-y-4 pt-6">
      <DataTable
        rows={filtered}
        columns={columns}
        loading={loading}
        searchKeys={(t) => `${busName(t.bus_id)} ${driverName(t.driver_id)} ${t.status} ${t.notes ?? ""}`}
        csvFilename="trip-history"
        pdfTitle="Trip History"
        emptyMessage="No trips match these filters."
        pageSize={15}
        filters={
          <>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-9 w-36"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                {["running", "completed", "delayed"].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={busFilter} onValueChange={setBusFilter}>
              <SelectTrigger className="h-9 w-36"><SelectValue placeholder="Bus" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All buses</SelectItem>
                {buses.map((b) => <SelectItem key={b.id} value={b.id}>Bus {b.bus_number}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={driverFilter} onValueChange={setDriverFilter}>
              <SelectTrigger className="h-9 w-40"><SelectValue placeholder="Driver" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All drivers</SelectItem>
                {drivers.map((d) => <SelectItem key={d.id} value={d.id}>{d.full_name ?? d.email}</SelectItem>)}
              </SelectContent>
            </Select>
            <Input type="date" className="h-9 w-40" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} />
          </>
        }
      />
    </CardContent></Card>
  );
}

function ReportsTab({ feedback, buses, loading, onChange }: { feedback: Feedback[]; buses: BusRow[]; loading: boolean; onChange: () => void }) {
  const [statusFilter, setStatusFilter] = useState("all");
  const [busFilter, setBusFilter] = useState("all");
  const [viewing, setViewing] = useState<Feedback | null>(null);

  async function resolve(id: string, resolved: boolean) {
    await supabase.from("feedback").update({ resolved }).eq("id", id);
    audit("report.resolve", { entityType: "feedback", entityId: id, after: { resolved } });
    onChange();
  }
  async function remove(id: string) {
    if (!confirm("Delete this report?")) return;
    const before = feedback.find((f) => f.id === id);
    await supabase.from("feedback").delete().eq("id", id);
    audit("report.delete", { entityType: "feedback", entityId: id, before });
    onChange();
  }

  const filtered = useMemo(() => {
    return feedback.filter((f) => {
      if (statusFilter === "resolved" && !f.resolved) return false;
      if (statusFilter === "open" && f.resolved) return false;
      if (busFilter !== "all" && (f.bus_id ?? "none") !== busFilter) return false;
      return true;
    });
  }, [feedback, statusFilter, busFilter]);

  function busName(id: string | null) { return id ? buses.find((b) => b.id === id)?.bus_number ?? "—" : "—"; }

  const columns: Column<Feedback>[] = [
    { key: "created", header: "Submitted", sortValue: (f) => f.created_at, csv: (f) => new Date(f.created_at).toLocaleString(),
      accessor: (f) => <span className="tabular-nums text-sm">{new Date(f.created_at).toLocaleString()}</span> },
    { key: "subject", header: "Subject", sortValue: (f) => f.subject, csv: (f) => f.subject, accessor: (f) => <span className="font-medium">{f.subject}</span> },
    { key: "bus", header: "Bus", sortValue: (f) => busName(f.bus_id), csv: (f) => busName(f.bus_id),
      accessor: (f) => f.bus_id ? <Badge className="bg-primary text-primary-foreground">Bus {busName(f.bus_id)}</Badge> : <span className="text-muted-foreground">—</span> },
    { key: "status", header: "Status", sortValue: (f) => (f.resolved ? 1 : 0), csv: (f) => (f.resolved ? "resolved" : "open"),
      accessor: (f) => <StatusBadge status={f.resolved ? "resolved" : "open"} /> },
    { key: "actions", header: "", className: "w-32 text-right",
      accessor: (f) => (
        <div className="flex justify-end gap-1">
          <Button variant="ghost" size="sm" aria-label="View" onClick={() => setViewing(f)}><Eye className="h-4 w-4" /></Button>
          <Button variant="ghost" size="sm" aria-label={f.resolved ? "Reopen" : "Resolve"} onClick={() => resolve(f.id, !f.resolved)}>
            <CheckCircle2 className={`h-4 w-4 ${f.resolved ? "text-emerald-500" : ""}`} />
          </Button>
          <Button variant="ghost" size="sm" aria-label="Delete" onClick={() => remove(f.id)}><Trash2 className="h-4 w-4" /></Button>
        </div>
      ) },
  ];

  return (
    <Card><CardContent className="space-y-4 pt-6">
      <DataTable
        rows={filtered}
        columns={columns}
        loading={loading}
        searchKeys={(f) => `${f.subject} ${f.message} ${busName(f.bus_id)}`}
        csvFilename="reports"
        pdfTitle="Reports & Feedback"
        emptyMessage="No reports match these filters."
        filters={
          <>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-9 w-36"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
              </SelectContent>
            </Select>
            <Select value={busFilter} onValueChange={setBusFilter}>
              <SelectTrigger className="h-9 w-36"><SelectValue placeholder="Bus" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All buses</SelectItem>
                <SelectItem value="none">Unspecified</SelectItem>
                {buses.map((b) => <SelectItem key={b.id} value={b.id}>Bus {b.bus_number}</SelectItem>)}
              </SelectContent>
            </Select>
          </>
        }
      />
      <Dialog open={!!viewing} onOpenChange={(o) => !o && setViewing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{viewing?.subject}</DialogTitle>
            <DialogDescription>
              {viewing && new Date(viewing.created_at).toLocaleString()} · Bus {busName(viewing?.bus_id ?? null)}
            </DialogDescription>
          </DialogHeader>
          <div className="whitespace-pre-wrap text-sm text-muted-foreground">{viewing?.message}</div>
          <DialogFooter>
            {viewing && (
              <Button onClick={() => { resolve(viewing.id, !viewing.resolved); setViewing(null); }}>
                {viewing.resolved ? "Mark as open" : "Mark as resolved"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </CardContent></Card>
  );
}

function AnnouncementsTab({ routes }: { routes: RouteRow[] }) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [role, setRole] = useState<string>("all");
  const [routeId, setRouteId] = useState<string>("");
  const [emergency, setEmergency] = useState(false);
  const [list, setList] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [audienceFilter, setAudienceFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");

  async function load() {
    setLoading(true);
    const { data } = await supabase.from("announcements").select("id,title,body,created_at,is_emergency,target_role,route_id").order("created_at", { ascending: false }).limit(200);
    setList((data ?? []) as Announcement[]);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function send() {
    if (!title.trim() || !body.trim()) return toast.error("Fill title and body");
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return toast.error("You must be signed in");
    const payload = {
      title: title.trim(), body: body.trim(),
      target_role: role === "all" ? null : (role as "student" | "faculty" | "driver"),
      route_id: routeId || null,
      is_emergency: emergency,
      created_by: u.user.id,
    };
    const { data: created, error } = await supabase.from("announcements").insert(payload).select("id").single();
    if (error) return toast.error(error.message);
    audit(emergency ? "announcement.emergency" : "announcement.broadcast", {
      entityType: "announcement",
      entityId: created?.id,
      after: payload,
    });
    setTitle(""); setBody(""); setEmergency(false);
    load();
    toast.success("Sent");
  }

  async function remove(id: string) {
    if (!confirm("Delete this announcement?")) return;
    const before = list.find((a) => a.id === id);
    await supabase.from("announcements").delete().eq("id", id);
    audit("announcement.delete", { entityType: "announcement", entityId: id, before });
    load();
  }

  const filtered = useMemo(() => {
    return list.filter((a) => {
      if (audienceFilter !== "all" && (a.target_role ?? "all") !== audienceFilter) return false;
      if (typeFilter === "emergency" && !a.is_emergency) return false;
      if (typeFilter === "normal" && a.is_emergency) return false;
      return true;
    });
  }, [list, audienceFilter, typeFilter]);

  function routeName(id: string | null) { return id ? routes.find((r) => r.id === id)?.name ?? "—" : "All routes"; }

  const columns: Column<Announcement>[] = [
    { key: "created", header: "Sent", sortValue: (a) => a.created_at, csv: (a) => new Date(a.created_at).toLocaleString(),
      accessor: (a) => <span className="tabular-nums text-sm">{new Date(a.created_at).toLocaleString()}</span> },
    { key: "title", header: "Title", sortValue: (a) => a.title, csv: (a) => a.title,
      accessor: (a) => <span className="font-medium">{a.title}</span> },
    { key: "audience", header: "Audience", sortValue: (a) => a.target_role ?? "all", csv: (a) => a.target_role ?? "all",
      accessor: (a) => <Badge variant="outline" className="capitalize">{a.target_role ?? "Everyone"}</Badge> },
    { key: "route", header: "Route", sortValue: (a) => routeName(a.route_id), csv: (a) => routeName(a.route_id),
      accessor: (a) => <span className="text-muted-foreground">{routeName(a.route_id)}</span> },
    { key: "type", header: "Type", sortValue: (a) => (a.is_emergency ? 1 : 0), csv: (a) => (a.is_emergency ? "emergency" : "normal"),
      accessor: (a) => <StatusBadge status={a.is_emergency ? "emergency" : "active"} /> },
    { key: "actions", header: "", className: "w-10",
      accessor: (a) => <Button variant="ghost" size="sm" onClick={() => remove(a.id)}><Trash2 className="h-4 w-4" /></Button> },
  ];

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
      <DataTable
        rows={filtered}
        columns={columns}
        loading={loading}
        searchKeys={(a) => `${a.title} ${a.body} ${routeName(a.route_id)} ${a.target_role ?? ""}`}
        csvFilename="announcements"
        pdfTitle="Announcements"
        emptyMessage="No announcements match these filters."
        filters={
          <>
            <Select value={audienceFilter} onValueChange={setAudienceFilter}>
              <SelectTrigger className="h-9 w-36"><SelectValue placeholder="Audience" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All audiences</SelectItem>
                <SelectItem value="student">Students</SelectItem>
                <SelectItem value="faculty">Faculty</SelectItem>
                <SelectItem value="driver">Drivers</SelectItem>
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="h-9 w-36"><SelectValue placeholder="Type" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="emergency">Emergency</SelectItem>
              </SelectContent>
            </Select>
          </>
        }
      />
    </CardContent></Card>
  );
}

function PersonDialog({ person, onClose, role }: { person: Person | null; onClose: () => void; role: string }) {
  return (
    <Dialog open={!!person} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{person?.full_name ?? "(no name)"}</DialogTitle>
          <DialogDescription>{role} · {person?.email ?? "—"}</DialogDescription>
        </DialogHeader>
        <dl className="grid grid-cols-2 gap-3 text-sm">
          <div><dt className="text-xs text-muted-foreground">Phone</dt><dd>{person?.phone ?? "—"}</dd></div>
          <div><dt className="text-xs text-muted-foreground">Department</dt><dd>{person?.department ?? "—"}</dd></div>
          {person?.roll_no && <div><dt className="text-xs text-muted-foreground">Roll no</dt><dd>{person.roll_no}</dd></div>}
          {person?.employee_id && <div><dt className="text-xs text-muted-foreground">Employee ID</dt><dd>{person.employee_id}</dd></div>}
          {person?.license_no && <div><dt className="text-xs text-muted-foreground">License</dt><dd>{person.license_no}</dd></div>}
        </dl>
      </DialogContent>
    </Dialog>
  );
}