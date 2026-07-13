import { useEffect, useMemo, useRef, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { BusMap, haversineM } from "@/components/BusMap";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AlertTriangle,
  Play,
  Square,
  Navigation,
  MapPin,
  Signal,
  Wifi,
  WifiOff,
  Battery,
  Rewind,
  Pause,
  PlayCircle,
} from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { emitBusNotification } from "@/lib/notifications.functions";
import { useAppSettings } from "@/lib/app-settings";

type Assignment = {
  bus_id: string;
  buses: { id: string; bus_number: string; route_id: string | null; status: string } | null;
};
type Stop = { name: string; lat: number; lng: number; order?: number };

export function DriverDashboard({ user }: { user: User }) {
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [routeName, setRouteName] = useState<string>("");
  const [stops, setStops] = useState<Stop[]>([]);
  const [tripId, setTripId] = useState<string | null>(null);
  const [pos, setPos] = useState<
    { lat: number; lng: number; speed?: number | null; heading?: number | null; accuracy?: number | null } | null
  >(null);
  const watchIdRef = useRef<number | null>(null);
  const emittedRef = useRef<Set<string>>(new Set());
  const nearStopRef = useRef<Record<string, boolean>>({});
  const prevRef = useRef<{ lat: number; lng: number; t: number } | null>(null);
  const lastMoveRef = useRef<number>(Date.now());
  const reconnectTimerRef = useRef<number | null>(null);
  const reconnectAttemptsRef = useRef<number>(0);
  const pollIntervalRef = useRef<number | null>(null);
  const replayTimerRef = useRef<number | null>(null);
  const [pathPoints, setPathPoints] = useState<{ lat: number; lng: number; t: number }[]>([]);
  const [replayIndex, setReplayIndex] = useState<number>(0);
  const [replayPlaying, setReplayPlaying] = useState<boolean>(false);
  const [replayMode, setReplayMode] = useState<boolean>(false);
  const [connState, setConnState] = useState<"online" | "reconnecting" | "offline">("online");
  const [batteryLow, setBatteryLow] = useState<boolean>(false);
  const [idle, setIdle] = useState<boolean>(false);
  const [deviated, setDeviated] = useState<boolean>(false);
  const [gpsState, setGpsState] = useState<"idle" | "prompting" | "granted" | "denied" | "unavailable">("idle");
  const { settings } = useAppSettings();
  const notify = useServerFn(emitBusNotification);

  useEffect(() => {
    supabase
      .from("driver_assignments")
      .select("bus_id, buses(id,bus_number,route_id,status)")
      .eq("driver_id", user.id)
      .eq("active", true)
      .maybeSingle()
      .then(async ({ data }) => {
        if (!data) return;
        setAssignment(data as unknown as Assignment);
        const routeId = (data as unknown as Assignment).buses?.route_id;
        if (routeId) {
          const { data: r } = await supabase.from("routes").select("name,stops").eq("id", routeId).maybeSingle();
          if (r) {
            setRouteName(r.name);
            setStops(Array.isArray(r.stops) ? (r.stops as Stop[]) : []);
          }
        }
      });

    supabase
      .from("trips")
      .select("id")
      .eq("driver_id", user.id)
      .eq("status", "active")
      .maybeSingle()
      .then(({ data }) => data && setTripId(data.id));
  }, [user.id]);

  const busId = assignment?.buses?.id;

  // Battery-aware update interval
  useEffect(() => {
    let cancelled = false;
    const nav = navigator as Navigator & {
      getBattery?: () => Promise<{
        level: number;
        charging: boolean;
        addEventListener: (e: string, cb: () => void) => void;
      }>;
    };
    if (nav.getBattery) {
      nav
        .getBattery()
        .then((b) => {
          const update = () => {
            if (cancelled) return;
            setBatteryLow(b.level < 0.2 && !b.charging);
          };
          update();
          b.addEventListener("levelchange", update);
          b.addEventListener("chargingchange", update);
        })
        .catch(() => {});
    }
    return () => {
      cancelled = true;
    };
  }, []);

  // Idle detection watchdog (every 30s)
  useEffect(() => {
    if (!tripId) {
      setIdle(false);
      return;
    }
    const t = window.setInterval(() => {
      if (Date.now() - lastMoveRef.current > 3 * 60 * 1000) setIdle(true);
      else setIdle(false);
    }, 30_000);
    return () => window.clearInterval(t);
  }, [tripId]);

  // Continuously share driver's phone location as this bus's location whenever assigned.
  useEffect(() => {
    if (!busId) return;
    if (!("geolocation" in navigator)) {
      setGpsState("unavailable");
      toast.error("This device has no GPS. Location cannot be shared.");
      return;
    }
    setGpsState("prompting");
    startWatch();
    return () => {
      if (watchIdRef.current != null) navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
      if (reconnectTimerRef.current) window.clearTimeout(reconnectTimerRef.current);
      if (pollIntervalRef.current) window.clearInterval(pollIntervalRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busId]);

  // Background/battery-aware polling as a safety net alongside watchPosition
  useEffect(() => {
    if (!busId || gpsState !== "granted") return;
    if (pollIntervalRef.current) window.clearInterval(pollIntervalRef.current);
    const base = Math.max(5, settings.gpsUpdateSeconds || 10);
    const ms = (batteryLow ? base * 2 : base) * 1000;
    pollIntervalRef.current = window.setInterval(() => {
      navigator.geolocation.getCurrentPosition(
        (p) => pushLocation(p.coords),
        () => scheduleReconnect(),
        { enableHighAccuracy: !batteryLow, maximumAge: 5000, timeout: 15000 },
      );
    }, ms);
    return () => {
      if (pollIntervalRef.current) window.clearInterval(pollIntervalRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busId, gpsState, batteryLow, settings.gpsUpdateSeconds]);

  function startWatch() {
    if (!("geolocation" in navigator)) return;
    if (watchIdRef.current != null) navigator.geolocation.clearWatch(watchIdRef.current);
    const id = navigator.geolocation.watchPosition(
      (p) => {
        setGpsState("granted");
        setConnState("online");
        reconnectAttemptsRef.current = 0;
        pushLocation(p.coords);
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          setGpsState("denied");
          toast.error("Location permission denied. Enable it in your browser to share the bus location.");
          return;
        }
        scheduleReconnect();
      },
      { enableHighAccuracy: !batteryLow, maximumAge: 3000, timeout: 15000 },
    );
    watchIdRef.current = id;
  }

  function scheduleReconnect() {
    setConnState("reconnecting");
    const n = ++reconnectAttemptsRef.current;
    const delay = Math.min(30_000, 2000 * 2 ** Math.min(4, n - 1));
    if (reconnectTimerRef.current) window.clearTimeout(reconnectTimerRef.current);
    reconnectTimerRef.current = window.setTimeout(() => {
      startWatch();
    }, delay);
  }

  async function requestLocationAgain() {
    if (!("geolocation" in navigator)) return;
    setGpsState("prompting");
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setGpsState("granted");
        pushLocation(p.coords);
        toast.success("Location sharing enabled");
      },
      (err) => {
        setGpsState(err.code === err.PERMISSION_DENIED ? "denied" : "unavailable");
        toast.error("Enable location in browser settings to continue.");
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 },
    );
  }

  async function pushLocation(coords: GeolocationCoordinates) {
    if (!busId) return;
    const now = Date.now();

    // Derive speed if the browser did not supply one
    let speedKmh: number | null = coords.speed != null ? coords.speed * 3.6 : null;
    if (speedKmh == null && prevRef.current) {
      const dtSec = (now - prevRef.current.t) / 1000;
      if (dtSec > 0.5) {
        const dM = haversineM({ lat: coords.latitude, lng: coords.longitude }, prevRef.current);
        speedKmh = (dM / dtSec) * 3.6;
      }
    }

    // Movement / idle tracking
    if (prevRef.current) {
      const dM = haversineM({ lat: coords.latitude, lng: coords.longitude }, prevRef.current);
      if (dM > 15) lastMoveRef.current = now;
    } else {
      lastMoveRef.current = now;
    }
    prevRef.current = { lat: coords.latitude, lng: coords.longitude, t: now };

    // Route deviation: min distance to any stop
    if (stops.length) {
      const min = stops.reduce(
        (acc, s) => Math.min(acc, haversineM({ lat: coords.latitude, lng: coords.longitude }, s)),
        Number.POSITIVE_INFINITY,
      );
      setDeviated(min > 800);
    }

    const payload = {
      bus_id: busId,
      lat: coords.latitude,
      lng: coords.longitude,
      speed: speedKmh,
      heading: coords.heading ?? null,
      driver_id: user.id,
      updated_at: new Date().toISOString(),
    };
    setPos({
      lat: coords.latitude,
      lng: coords.longitude,
      speed: payload.speed,
      heading: coords.heading,
      accuracy: coords.accuracy ?? null,
    });
    await supabase.from("bus_locations").upsert(payload, { onConflict: "bus_id" });

    if (tripId) {
      setPathPoints((pts) => [...pts, { lat: coords.latitude, lng: coords.longitude, t: now }].slice(-2000));
      for (const s of stops) {
        const d = haversineM({ lat: coords.latitude, lng: coords.longitude }, s);
        // Approach (500m ring)
        if (d <= 500 && d > 60) {
          const key = `${tripId}:approach:${s.name}`;
          if (!emittedRef.current.has(key)) {
            emittedRef.current.add(key);
            notify({ data: { busId, type: "approaching_stop", stopName: s.name, distanceM: Math.round(d) } }).catch(
              () => {},
            );
          }
        }
        // Arrival geofence (60m)
        if (d <= 60) {
          nearStopRef.current[s.name] = true;
          const key = `${tripId}:reached:${s.name}`;
          if (!emittedRef.current.has(key)) {
            emittedRef.current.add(key);
            notify({ data: { busId, type: "reached_stop", stopName: s.name } }).catch(() => {});
          }
        } else if (nearStopRef.current[s.name] && d > 150) {
          // Departure detection
          nearStopRef.current[s.name] = false;
          const key = `${tripId}:depart:${s.name}`;
          if (!emittedRef.current.has(key)) {
            emittedRef.current.add(key);
            notify({ data: { busId, type: "delayed", message: `Bus has departed ${s.name}.` } }).catch(() => {});
          }
        }
      }
    }
  }

  async function startTrip() {
    if (!busId) return toast.error("No bus assigned. Contact admin.");
    if (!navigator.geolocation) return toast.error("Geolocation not available");
    if (gpsState === "denied") return toast.error("Enable location permission first.");
    const { data: yr } = await supabase.from("academic_years").select("id").eq("status", "active").maybeSingle();
    if (!yr?.id) return toast.error("No active academic year. Ask admin to activate one.");
    const { data, error } = await supabase.from("trips").insert({ bus_id: busId, driver_id: user.id, academic_year_id: yr.id }).select("id").single();
    if (error) return toast.error(error.message);
    setTripId(data.id);
    emittedRef.current = new Set();
    nearStopRef.current = {};
    setPathPoints([]);
    await supabase.from("buses").update({ status: "running" }).eq("id", busId);
    notify({ data: { busId, type: "trip_started" } }).catch(() => {});
    toast.success("Trip started · sharing GPS");
  }

  async function endTrip() {
    if (!tripId) return;
    await supabase.from("trips").update({ status: "completed", ended_at: new Date().toISOString() }).eq("id", tripId);
    if (busId) await supabase.from("buses").update({ status: "completed" }).eq("id", busId);
    if (busId) notify({ data: { busId, type: "trip_completed" } }).catch(() => {});
    setTripId(null);
    toast.success("Trip ended");
  }

  async function sendEmergency() {
    if (!busId) return;
    const { error } = await supabase.from("announcements").insert({
      title: `🚨 Emergency · Bus ${assignment?.buses?.bus_number}`,
      body: "Driver has flagged an emergency. Admin has been notified.",
      is_emergency: true,
      created_by: user.id,
    });
    if (error) return toast.error(error.message);
    notify({ data: { busId, type: "sos", message: "Driver has flagged an emergency." } }).catch(() => {});
    toast.success("Emergency alert sent to admin");
  }

  const mapBuses = useMemo(
    () =>
      pos && busId
        ? [
            {
              id: busId,
              bus_number: assignment?.buses?.bus_number ?? "",
              lat: pos.lat,
              lng: pos.lng,
              speed: pos.speed ?? null,
              accuracy: pos.accuracy ?? null,
              heading: pos.heading ?? null,
              updated_at: new Date().toISOString(),
            },
          ]
        : [],
    [pos, busId, assignment],
  );

  const routePath = useMemo(() => stops.map((s) => ({ lat: s.lat, lng: s.lng })), [stops]);
  const replaySlice = useMemo(
    () => pathPoints.slice(0, Math.max(1, replayIndex + 1)).map((p) => ({ lat: p.lat, lng: p.lng })),
    [pathPoints, replayIndex],
  );

  // Replay playback
  useEffect(() => {
    if (!replayPlaying || pathPoints.length < 2) return;
    replayTimerRef.current = window.setInterval(() => {
      setReplayIndex((i) => {
        if (i >= pathPoints.length - 1) {
          setReplayPlaying(false);
          return i;
        }
        return i + 1;
      });
    }, 300);
    return () => {
      if (replayTimerRef.current) window.clearInterval(replayTimerRef.current);
    };
  }, [replayPlaying, pathPoints.length]);

  const accuracyLabel =
    pos?.accuracy == null
      ? "GPS —"
      : pos.accuracy < 15
        ? `Strong ±${Math.round(pos.accuracy)}m`
        : pos.accuracy < 40
          ? `Good ±${Math.round(pos.accuracy)}m`
          : `Weak ±${Math.round(pos.accuracy)}m`;
  const accuracyClass =
    pos?.accuracy == null
      ? "bg-muted text-muted-foreground"
      : pos.accuracy < 15
        ? "bg-green-600 text-white"
        : pos.accuracy < 40
          ? "bg-amber-500 text-white"
          : "bg-destructive text-destructive-foreground";

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Navigation className="h-5 w-5 text-accent" /> Driver Console
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!assignment ? (
            <p className="text-sm text-muted-foreground">
              You have no bus assignment yet. Please contact the transport office.
            </p>
          ) : (
            <>
              {(gpsState === "denied" || gpsState === "unavailable") && (
                <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-3">
                  <div className="flex items-start gap-2">
                    <MapPin className="mt-0.5 h-4 w-4 text-destructive" />
                    <div className="flex-1 space-y-2 text-sm">
                      <div className="font-medium text-destructive">Location sharing is off</div>
                      <p className="text-muted-foreground">
                        Your phone's location is used as this bus's live location. Please enable location access so
                        students and faculty can track Bus {assignment.buses?.bus_number}.
                      </p>
                      <Button size="sm" variant="outline" onClick={requestLocationAgain}>
                        Enable location
                      </Button>
                    </div>
                  </div>
                </div>
              )}
              {gpsState === "prompting" && (
                <div className="rounded-lg border border-border bg-muted/40 p-3 text-sm text-muted-foreground">
                  Requesting location permission… please allow it in the browser prompt.
                </div>
              )}
              {gpsState === "granted" && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="inline-block h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                  Sharing live location as Bus {assignment.buses?.bus_number}
                </div>
              )}
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <Badge className="bg-primary text-primary-foreground">Bus {assignment.buses?.bus_number}</Badge>
                {routeName && <Badge variant="outline">{routeName}</Badge>}
                {tripId ? (
                  <Badge className="bg-green-600 text-white">Trip active</Badge>
                ) : (
                  <Badge variant="secondary">Idle</Badge>
                )}
                <Badge className={accuracyClass}>
                  <Signal className="mr-1 h-3 w-3" />
                  {accuracyLabel}
                </Badge>
                {connState === "online" && (
                  <Badge variant="outline">
                    <Wifi className="mr-1 h-3 w-3" />
                    GPS online
                  </Badge>
                )}
                {connState === "reconnecting" && (
                  <Badge className="bg-amber-500 text-white">
                    <WifiOff className="mr-1 h-3 w-3" />
                    Reconnecting…
                  </Badge>
                )}
                {batteryLow && (
                  <Badge className="bg-amber-500 text-white">
                    <Battery className="mr-1 h-3 w-3" />
                    Battery saver
                  </Badge>
                )}
                {idle && tripId && <Badge variant="destructive">Driver idle</Badge>}
                {deviated && tripId && <Badge variant="destructive">Off-route</Badge>}
                {pos?.speed != null && (
                  <span className="text-muted-foreground">Speed: {pos.speed.toFixed(1)} km/h</span>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {!tripId ? (
                  <Button onClick={startTrip}>
                    <Play className="mr-1 h-4 w-4" /> Start trip
                  </Button>
                ) : (
                  <Button variant="secondary" onClick={endTrip}>
                    <Square className="mr-1 h-4 w-4" /> End trip
                  </Button>
                )}
                <Button variant="destructive" onClick={sendEmergency}>
                  <AlertTriangle className="mr-1 h-4 w-4" /> Send SOS
                </Button>
                {pathPoints.length > 1 && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setReplayMode((v) => !v);
                      setReplayIndex(0);
                      setReplayPlaying(false);
                    }}
                  >
                    <Rewind className="mr-1 h-4 w-4" /> {replayMode ? "Hide replay" : "Replay trip"}
                  </Button>
                )}
              </div>
              <BusMap
                buses={replayMode ? [] : mapBuses}
                stops={stops}
                focusBusId={replayMode ? undefined : busId}
                showTraffic={!!tripId}
                routePath={routePath}
                replayPath={replayMode ? replaySlice : undefined}
              />
              {replayMode && (
                <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/40 p-3">
                  <Button size="sm" variant="outline" onClick={() => setReplayPlaying((p) => !p)}>
                    {replayPlaying ? (
                      <>
                        <Pause className="mr-1 h-3 w-3" /> Pause
                      </>
                    ) : (
                      <>
                        <PlayCircle className="mr-1 h-3 w-3" /> Play
                      </>
                    )}
                  </Button>
                  <input
                    type="range"
                    min={0}
                    max={Math.max(0, pathPoints.length - 1)}
                    value={replayIndex}
                    onChange={(e) => setReplayIndex(Number(e.target.value))}
                    className="flex-1"
                  />
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {replayIndex + 1}/{pathPoints.length}
                  </span>
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                Keep this tab open while driving. Location updates continuously with GPS reconnect and battery-aware
                polling. Uses OpenStreetMap automatically if Google Maps is unavailable.
              </p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
