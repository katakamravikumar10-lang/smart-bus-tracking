import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DataTable, type Column } from "@/components/DataTable";
import { StatusBadge } from "@/components/StatusBadge";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  XAxis,
  YAxis,
} from "recharts";
import { Activity, BarChart3, Clock, TrendingUp, RotateCw } from "lucide-react";

type BusRow = { id: string; bus_number: string; route_id: string | null };
type RouteRow = { id: string; name: string };
type Person = { id: string; full_name: string | null; email: string | null };
type Trip = {
  id: string;
  bus_id: string;
  driver_id: string;
  started_at: string;
  ended_at: string | null;
  status: string;
  notes: string | null;
};

function ymd(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x.toISOString().slice(0, 10);
}
function daysAgo(n: number) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - n);
  return d;
}

export function AnalyticsTab({
  buses,
  routes,
  drivers,
}: {
  buses: BusRow[];
  routes: RouteRow[];
  drivers: Person[];
}) {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [from, setFrom] = useState<string>(ymd(daysAgo(29)));
  const [to, setTo] = useState<string>(ymd(new Date()));
  const [busFilter, setBusFilter] = useState("all");
  const [driverFilter, setDriverFilter] = useState("all");
  const [routeFilter, setRouteFilter] = useState("all");

  async function load() {
    setLoading(true);
    const fromIso = new Date(from).toISOString();
    const toDate = new Date(to);
    toDate.setHours(23, 59, 59, 999);
    const { data } = await supabase
      .from("trips")
      .select("*")
      .gte("started_at", fromIso)
      .lte("started_at", toDate.toISOString())
      .order("started_at", { ascending: false })
      .limit(2000);
    setTrips((data ?? []) as Trip[]);
    setLoading(false);
  }
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [from, to]);

  const filtered = useMemo(() => {
    return trips.filter((t) => {
      if (busFilter !== "all" && t.bus_id !== busFilter) return false;
      if (driverFilter !== "all" && t.driver_id !== driverFilter) return false;
      if (routeFilter !== "all") {
        const b = buses.find((bb) => bb.id === t.bus_id);
        if ((b?.route_id ?? "") !== routeFilter) return false;
      }
      return true;
    });
  }, [trips, busFilter, driverFilter, routeFilter, buses]);

  // Daily usage series
  const daily = useMemo(() => {
    const buckets: Record<string, number> = {};
    const start = new Date(from);
    const end = new Date(to);
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      buckets[ymd(d)] = 0;
    }
    filtered.forEach((t) => {
      const k = ymd(new Date(t.started_at));
      if (k in buckets) buckets[k]++;
    });
    return Object.entries(buckets).map(([k, v]) => ({
      day: new Date(k).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
      trips: v,
    }));
  }, [filtered, from, to]);

  // Route popularity
  const routePop = useMemo(() => {
    const map = new Map<string, number>();
    filtered.forEach((t) => {
      const b = buses.find((bb) => bb.id === t.bus_id);
      const rid = b?.route_id ?? "unassigned";
      map.set(rid, (map.get(rid) ?? 0) + 1);
    });
    return Array.from(map.entries())
      .map(([rid, count]) => ({
        route: rid === "unassigned" ? "Unassigned" : routes.find((r) => r.id === rid)?.name ?? "—",
        trips: count,
      }))
      .sort((a, b) => b.trips - a.trips)
      .slice(0, 8);
  }, [filtered, buses, routes]);

  // Delay analysis
  const delayData = useMemo(() => {
    const counts: Record<string, number> = { completed: 0, running: 0, delayed: 0, cancelled: 0 };
    filtered.forEach((t) => {
      counts[t.status] = (counts[t.status] ?? 0) + 1;
    });
    return Object.entries(counts).map(([status, count]) => ({ status, count }));
  }, [filtered]);

  // Driver performance: avg trip duration + trip count
  const driverPerf = useMemo(() => {
    const map = new Map<string, { count: number; totalMs: number }>();
    filtered.forEach((t) => {
      const cur = map.get(t.driver_id) ?? { count: 0, totalMs: 0 };
      cur.count++;
      if (t.ended_at) cur.totalMs += new Date(t.ended_at).getTime() - new Date(t.started_at).getTime();
      map.set(t.driver_id, cur);
    });
    return Array.from(map.entries())
      .map(([id, v]) => ({
        driver: drivers.find((d) => d.id === id)?.full_name ?? "—",
        trips: v.count,
        avgMin: v.count ? Math.round(v.totalMs / v.count / 60000) : 0,
      }))
      .sort((a, b) => b.trips - a.trips)
      .slice(0, 8);
  }, [filtered, drivers]);

  // Bus utilization
  const busUtil = useMemo(() => {
    const map = new Map<string, number>();
    filtered.forEach((t) => map.set(t.bus_id, (map.get(t.bus_id) ?? 0) + 1));
    return Array.from(map.entries())
      .map(([id, count]) => ({
        bus: `Bus ${buses.find((b) => b.id === id)?.bus_number ?? "—"}`,
        trips: count,
      }))
      .sort((a, b) => b.trips - a.trips)
      .slice(0, 10);
  }, [filtered, buses]);

  function busName(id: string) {
    return buses.find((b) => b.id === id)?.bus_number ?? "—";
  }
  function driverName(id: string) {
    return drivers.find((d) => d.id === id)?.full_name ?? "—";
  }
  function routeName(busId: string) {
    const rid = buses.find((b) => b.id === busId)?.route_id;
    return routes.find((r) => r.id === rid)?.name ?? "—";
  }
  function duration(t: Trip) {
    if (!t.ended_at) return "In progress";
    const m = Math.round((new Date(t.ended_at).getTime() - new Date(t.started_at).getTime()) / 60000);
    return m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m}m`;
  }

  const columns: Column<Trip>[] = [
    {
      key: "started",
      header: "Started",
      sortValue: (t) => t.started_at,
      csv: (t) => new Date(t.started_at).toLocaleString(),
      accessor: (t) => <span className="tabular-nums text-sm">{new Date(t.started_at).toLocaleString()}</span>,
    },
    {
      key: "bus",
      header: "Bus",
      sortValue: (t) => busName(t.bus_id),
      csv: (t) => busName(t.bus_id),
      accessor: (t) => <Badge className="bg-primary text-primary-foreground">Bus {busName(t.bus_id)}</Badge>,
    },
    {
      key: "route",
      header: "Route",
      sortValue: (t) => routeName(t.bus_id),
      csv: (t) => routeName(t.bus_id),
      accessor: (t) => <span className="text-muted-foreground text-sm">{routeName(t.bus_id)}</span>,
    },
    {
      key: "driver",
      header: "Driver",
      sortValue: (t) => driverName(t.driver_id),
      csv: (t) => driverName(t.driver_id),
      accessor: (t) => <span className="text-sm">{driverName(t.driver_id)}</span>,
    },
    {
      key: "duration",
      header: "Duration",
      sortValue: (t) =>
        t.ended_at ? new Date(t.ended_at).getTime() - new Date(t.started_at).getTime() : 0,
      csv: duration,
      accessor: (t) => <span className="tabular-nums text-sm">{duration(t)}</span>,
    },
    {
      key: "status",
      header: "Status",
      sortValue: (t) => t.status,
      csv: (t) => t.status,
      accessor: (t) => <StatusBadge status={t.status} />,
    },
  ];

  const barConfig: ChartConfig = { trips: { label: "Trips", color: "hsl(var(--primary))" } };
  const perfConfig: ChartConfig = {
    trips: { label: "Trips", color: "hsl(var(--primary))" },
    avgMin: { label: "Avg minutes", color: "hsl(var(--accent))" },
  };

  const STATUS_COLORS: Record<string, string> = {
    completed: "hsl(217 91% 60%)",
    running: "hsl(142 71% 45%)",
    delayed: "hsl(38 92% 50%)",
    cancelled: "hsl(0 84% 60%)",
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="grid gap-3 pt-6 sm:grid-cols-6">
          <div className="space-y-1.5">
            <Label className="text-xs">From</Label>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">To</Label>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Bus</Label>
            <Select value={busFilter} onValueChange={setBusFilter}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All buses</SelectItem>
                {buses.map((b) => (
                  <SelectItem key={b.id} value={b.id}>Bus {b.bus_number}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Driver</Label>
            <Select value={driverFilter} onValueChange={setDriverFilter}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All drivers</SelectItem>
                {drivers.map((d) => (
                  <SelectItem key={d.id} value={d.id}>{d.full_name ?? d.email ?? "—"}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Route</Label>
            <Select value={routeFilter} onValueChange={setRouteFilter}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All routes</SelectItem>
                {routes.map((r) => (
                  <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end">
            <Button variant="outline" onClick={load} className="w-full">
              <RotateCw className="mr-1 h-4 w-4" /> Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="h-4 w-4 text-accent" /> Daily usage
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={barConfig} className="h-56 w-full">
              <LineChart data={daily} margin={{ left: -20, right: 8, top: 8, bottom: 0 }}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="day" tickLine={false} axisLine={false} className="text-xs" />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} className="text-xs" />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line type="monotone" dataKey="trips" stroke="var(--color-trips)" strokeWidth={2} dot={false} />
              </LineChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <BarChart3 className="h-4 w-4 text-accent" /> Route popularity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={barConfig} className="h-56 w-full">
              <BarChart data={routePop} margin={{ left: -20, right: 8, top: 8, bottom: 0 }}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="route" tickLine={false} axisLine={false} className="text-xs" interval={0} angle={-15} height={40} />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} className="text-xs" />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="trips" fill="var(--color-trips)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Clock className="h-4 w-4 text-accent" /> Delay analysis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={barConfig} className="h-56 w-full">
              <BarChart data={delayData} margin={{ left: -20, right: 8, top: 8, bottom: 0 }}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="status" tickLine={false} axisLine={false} className="text-xs" />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} className="text-xs" />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                  {delayData.map((d) => (
                    <Cell key={d.status} fill={STATUS_COLORS[d.status] ?? "hsl(var(--muted-foreground))"} />
                  ))}
                </Bar>
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Activity className="h-4 w-4 text-accent" /> Driver performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={perfConfig} className="h-56 w-full">
              <BarChart data={driverPerf} margin={{ left: -20, right: 8, top: 8, bottom: 0 }}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="driver" tickLine={false} axisLine={false} className="text-xs" interval={0} angle={-15} height={40} />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} className="text-xs" />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="trips" fill="var(--color-trips)" radius={[6, 6, 0, 0]} />
                <Bar dataKey="avgMin" fill="var(--color-avgMin)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <BarChart3 className="h-4 w-4 text-accent" /> Bus utilization
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={barConfig} className="h-64 w-full">
            <BarChart data={busUtil} margin={{ left: -20, right: 8, top: 8, bottom: 0 }}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="bus" tickLine={false} axisLine={false} className="text-xs" />
              <YAxis allowDecimals={false} tickLine={false} axisLine={false} className="text-xs" />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="trips" fill="var(--color-trips)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filtered trips</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            rows={filtered}
            columns={columns}
            loading={loading}
            searchKeys={(t) =>
              `${busName(t.bus_id)} ${routeName(t.bus_id)} ${driverName(t.driver_id)} ${t.status} ${t.notes ?? ""}`
            }
            csvFilename={`analytics-${from}-to-${to}`}
            pdfTitle="Trip Analytics Report"
            emptyMessage="No trips in this range match the filters."
            pageSize={15}
          />
        </CardContent>
      </Card>
    </div>
  );
}