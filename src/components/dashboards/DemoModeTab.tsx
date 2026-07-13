import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { seedDemoData, clearDemoData } from "@/lib/demo.functions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Database, Play, Square, Trash2, FlaskConical } from "lucide-react";
import { toast } from "sonner";
import { useAppSettings } from "@/lib/app-settings";
import { audit } from "@/lib/audit";

type BusRow = { id: string; bus_number: string; route_id: string | null; is_demo: boolean };
type RouteRow = { id: string; name: string; stops: { name: string; lat: number; lng: number }[]; is_demo: boolean };
type SimBus = {
  bus_id: string;
  bus_number: string;
  stops: { lat: number; lng: number; name: string }[];
  segment: number; // index of current segment start
  progress: number; // 0..1 along segment
  speedKmh: number;
  lastStopNotified: number;
};

const TICK_MS = 4000;

function haversineM(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371000;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) *
      Math.cos((b.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

export function DemoModeTab({ onDataChange }: { onDataChange?: () => void } = {}) {
  const seed = useServerFn(seedDemoData);
  const clear = useServerFn(clearDemoData);
  const [busy, setBusy] = useState<null | "seed" | "clear">(null);
  const [simulating, setSimulating] = useState(false);
  const simRef = useRef<{ timer: number | null; buses: SimBus[] }>({ timer: null, buses: [] });
  const { settings } = useAppSettings();
  const demoEnabled = settings.demoModeEnabled;

  async function onSeed() {
    if (!demoEnabled) return toast.error("Enable Demo Mode in Settings first");
    setBusy("seed");
    try {
      const res = await seed();
      toast.success(`Loaded ${res.accounts} accounts, ${res.buses} buses, ${res.routes} routes`);
      audit("demo.seed", { entityType: "demo", details: { accounts: res.accounts, buses: res.buses, routes: res.routes } });
      onDataChange?.();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function onClear() {
    if (!demoEnabled) return toast.error("Enable Demo Mode in Settings first");
    stopSimulation();
    setBusy("clear");
    try {
      const res = await clear();
      toast.success(`Removed ${res.removedUsers} users, ${res.removedBuses} buses`);
      audit("demo.clear", { entityType: "demo", details: { removedUsers: res.removedUsers, removedBuses: res.removedBuses } });
      onDataChange?.();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function startSimulation() {
    if (!demoEnabled) return toast.error("Enable Demo Mode in Settings first");
    // Load demo buses + their routes
    const { data: buses } = await supabase
      .from("buses")
      .select("id,bus_number,route_id,is_demo,status")
      .eq("is_demo", true)
      .neq("status", "maintenance");
    if (!buses?.length) return toast.error("Load demo data first");

    const routeIds = Array.from(new Set(buses.map((b) => b.route_id).filter(Boolean))) as string[];
    const { data: routes } = await supabase.from("routes").select("id,name,stops").in("id", routeIds);
    const routeMap = new Map<string, RouteRow>();
    (routes ?? []).forEach((r) => routeMap.set(r.id, r as unknown as RouteRow));

    const simBuses: SimBus[] = [];
    for (const b of buses as BusRow[]) {
      if (!b.route_id) continue;
      const r = routeMap.get(b.route_id);
      if (!r || !Array.isArray(r.stops) || r.stops.length < 2) continue;
      simBuses.push({
        bus_id: b.id,
        bus_number: b.bus_number,
        stops: r.stops,
        segment: 0,
        progress: Math.random() * 0.3,
        speedKmh: 20 + Math.random() * 30,
        lastStopNotified: -1,
      });
    }
    if (!simBuses.length) return toast.error("No demo buses with routes to simulate");

    simRef.current.buses = simBuses;
    setSimulating(true);
    toast.success(`Simulating ${simBuses.length} buses`);
    audit("demo.simulator.start", { entityType: "demo", details: { buses: simBuses.length } });

    const tick = async () => {
      const updates: { bus_id: string; lat: number; lng: number; speed: number; heading: number }[] = [];
      const arrivals: { bus: string; stop: string }[] = [];
      for (const sb of simRef.current.buses) {
        const a = sb.stops[sb.segment];
        const b = sb.stops[sb.segment + 1];
        if (!b) {
          // Loop back to start
          sb.segment = 0;
          sb.progress = 0;
          continue;
        }
        const segMeters = haversineM(a, b);
        const meters = (sb.speedKmh * 1000 / 3600) * (TICK_MS / 1000);
        sb.progress += segMeters === 0 ? 1 : meters / segMeters;
        if (sb.progress >= 1) {
          sb.segment += 1;
          sb.progress = 0;
          if (sb.lastStopNotified !== sb.segment && sb.stops[sb.segment]) {
            arrivals.push({ bus: sb.bus_number, stop: sb.stops[sb.segment].name });
            sb.lastStopNotified = sb.segment;
          }
        }
        const lat = a.lat + (b.lat - a.lat) * sb.progress;
        const lng = a.lng + (b.lng - a.lng) * sb.progress;
        const heading = (Math.atan2(b.lng - a.lng, b.lat - a.lat) * 180) / Math.PI;
        updates.push({ bus_id: sb.bus_id, lat, lng, speed: sb.speedKmh, heading });
      }
      if (updates.length) {
        await supabase.from("bus_locations").upsert(
          updates.map((u) => ({ ...u, updated_at: new Date().toISOString() })),
          { onConflict: "bus_id" },
        );
      }
      arrivals.slice(0, 2).forEach((a) => toast.message(`Bus ${a.bus} arriving at ${a.stop}`));
    };

    tick();
    simRef.current.timer = window.setInterval(tick, TICK_MS);
  }

  function stopSimulation() {
    if (simRef.current.timer !== null) {
      window.clearInterval(simRef.current.timer);
      simRef.current.timer = null;
      audit("demo.simulator.stop", { entityType: "demo" });
    }
    simRef.current.buses = [];
    setSimulating(false);
  }

  useEffect(() => {
    return () => {
      if (simRef.current.timer !== null) window.clearInterval(simRef.current.timer);
    };
  }, []);

  // Stop simulator immediately if demo mode is switched off.
  useEffect(() => {
    if (!demoEnabled && simRef.current.timer !== null) {
      window.clearInterval(simRef.current.timer);
      simRef.current.timer = null;
      simRef.current.buses = [];
      setSimulating(false);
    }
  }, [demoEnabled]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FlaskConical className="h-5 w-5 text-accent" /> Demo Mode
          {simulating && <Badge className="bg-emerald-500 text-white">Simulator running</Badge>}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Seed realistic demo accounts, buses, routes, and trips for testing and demonstrations.
          Demo records are tagged and never mixed with production data. Demo account passwords are
          issued privately to administrators — contact your system administrator to obtain them.
        </p>

        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <Button onClick={onSeed} disabled={busy !== null}>
            <Database className="mr-1 h-4 w-4" />
            {busy === "seed" ? "Loading…" : "Load Demo Data"}
          </Button>

          <Button onClick={startSimulation} disabled={simulating} variant="secondary">
            <Play className="mr-1 h-4 w-4" /> Start GPS Simulation
          </Button>

          <Button onClick={stopSimulation} disabled={!simulating} variant="outline">
            <Square className="mr-1 h-4 w-4" /> Stop GPS Simulation
          </Button>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" disabled={busy !== null}>
                <Trash2 className="mr-1 h-4 w-4" />
                {busy === "clear" ? "Clearing…" : "Clear Demo Data"}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Clear all demo data?</AlertDialogTitle>
                <AlertDialogDescription>
                  This removes every demo user, bus, route, trip, and announcement (anything tagged
                  as demo). Real production data is left untouched. The GPS simulator will also be
                  stopped.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={onClear}>Yes, clear demo data</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>

        <div className="rounded-lg border border-border p-3 text-xs text-muted-foreground">
          Demo accounts: <code>admin@nec.demo</code>, <code>driver1–3@nec.demo</code>,{" "}
          <code>faculty1–2@nec.demo</code>, <code>student1–5@nec.demo</code>.
        </div>
      </CardContent>
    </Card>
  );
}