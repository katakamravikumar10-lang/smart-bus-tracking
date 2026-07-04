import { useEffect, useMemo, useRef, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { BusMap } from "@/components/BusMap";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Play, Square, Navigation, MapPin } from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { emitBusNotification } from "@/lib/notifications.functions";

type Assignment = { bus_id: string; buses: { id: string; bus_number: string; route_id: string | null; status: string } | null };
type Stop = { name: string; lat: number; lng: number; order?: number };

export function DriverDashboard({ user }: { user: User }) {
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [routeName, setRouteName] = useState<string>("");
  const [stops, setStops] = useState<Stop[]>([]);
  const [tripId, setTripId] = useState<string | null>(null);
  const [pos, setPos] = useState<{ lat: number; lng: number; speed?: number | null; heading?: number | null } | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const emittedRef = useRef<Set<string>>(new Set());
  const [gpsState, setGpsState] = useState<"idle" | "prompting" | "granted" | "denied" | "unavailable">("idle");
  const notify = useServerFn(emitBusNotification);

  function haversineM(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
    const R = 6371000;
    const toRad = (d: number) => (d * Math.PI) / 180;
    const dLat = toRad(b.lat - a.lat);
    const dLng = toRad(b.lng - a.lng);
    const s = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(s));
  }

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

  // Continuously share driver's phone location as this bus's location whenever assigned.
  useEffect(() => {
    if (!busId) return;
    if (!("geolocation" in navigator)) {
      setGpsState("unavailable");
      toast.error("This device has no GPS. Location cannot be shared.");
      return;
    }
    setGpsState("prompting");
    const id = navigator.geolocation.watchPosition(
      (p) => {
        setGpsState("granted");
        pushLocation(p.coords);
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          setGpsState("denied");
          toast.error("Location permission denied. Enable it in your browser to share the bus location.");
        } else {
          toast.error("GPS: " + err.message);
        }
      },
      { enableHighAccuracy: true, maximumAge: 3000, timeout: 15000 },
    );
    watchIdRef.current = id;
    return () => {
      if (watchIdRef.current != null) navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    };
  }, [busId]);

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
    const payload = {
      bus_id: busId,
      lat: coords.latitude,
      lng: coords.longitude,
      speed: coords.speed ? coords.speed * 3.6 : null, // m/s -> km/h
      heading: coords.heading ?? null,
      driver_id: user.id,
      updated_at: new Date().toISOString(),
    };
    setPos({ lat: coords.latitude, lng: coords.longitude, speed: payload.speed, heading: coords.heading });
    await supabase.from("bus_locations").upsert(payload, { onConflict: "bus_id" });

    // Auto proximity alerts to registered students/faculty per stop
    if (tripId) {
      for (const s of stops) {
        const d = haversineM({ lat: coords.latitude, lng: coords.longitude }, s);
        if (d <= 500 && d > 60) {
          const key = `${tripId}:approach:${s.name}`;
          if (!emittedRef.current.has(key)) {
            emittedRef.current.add(key);
            notify({ data: { busId, type: "approaching_stop", stopName: s.name, distanceM: Math.round(d) } }).catch(() => {});
          }
        }
        if (d <= 60) {
          const key = `${tripId}:reached:${s.name}`;
          if (!emittedRef.current.has(key)) {
            emittedRef.current.add(key);
            notify({ data: { busId, type: "reached_stop", stopName: s.name } }).catch(() => {});
          }
        }
      }
    }
  }

  async function startTrip() {
    if (!busId) return toast.error("No bus assigned. Contact admin.");
    if (!navigator.geolocation) return toast.error("Geolocation not available");
    if (gpsState === "denied") return toast.error("Enable location permission first.");
    const { data, error } = await supabase.from("trips").insert({ bus_id: busId, driver_id: user.id }).select("id").single();
    if (error) return toast.error(error.message);
    setTripId(data.id);
    emittedRef.current = new Set();
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

  const mapBuses = useMemo(() => (pos && busId ? [{ id: busId, bus_number: assignment?.buses?.bus_number ?? "", lat: pos.lat, lng: pos.lng }] : []), [pos, busId, assignment]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Navigation className="h-5 w-5 text-accent" /> Driver Console</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!assignment ? (
            <p className="text-sm text-muted-foreground">You have no bus assignment yet. Please contact the transport office.</p>
          ) : (
            <>
              {(gpsState === "denied" || gpsState === "unavailable") && (
                <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-3">
                  <div className="flex items-start gap-2">
                    <MapPin className="mt-0.5 h-4 w-4 text-destructive" />
                    <div className="flex-1 space-y-2 text-sm">
                      <div className="font-medium text-destructive">Location sharing is off</div>
                      <p className="text-muted-foreground">
                        Your phone's location is used as this bus's live location. Please enable location access so students and faculty can track Bus {assignment.buses?.bus_number}.
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
              <div className="flex flex-wrap items-center gap-3 text-sm">
                <Badge className="bg-primary text-primary-foreground">Bus {assignment.buses?.bus_number}</Badge>
                {routeName && <Badge variant="outline">{routeName}</Badge>}
                {tripId ? <Badge className="bg-green-600 text-white">Trip active</Badge> : <Badge variant="secondary">Idle</Badge>}
                {pos?.speed != null && <span className="text-muted-foreground">Speed: {pos.speed.toFixed(1)} km/h</span>}
              </div>
              <div className="flex flex-wrap gap-2">
                {!tripId ? (
                  <Button onClick={startTrip}><Play className="mr-1 h-4 w-4" /> Start trip</Button>
                ) : (
                  <Button variant="secondary" onClick={endTrip}><Square className="mr-1 h-4 w-4" /> End trip</Button>
                )}
                <Button variant="destructive" onClick={sendEmergency}>
                  <AlertTriangle className="mr-1 h-4 w-4" /> Send SOS
                </Button>
              </div>
              <BusMap buses={mapBuses} stops={stops} focusBusId={busId} />
              <p className="text-xs text-muted-foreground">
                Keep this tab open while driving. Location updates automatically while a trip is active.
              </p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}