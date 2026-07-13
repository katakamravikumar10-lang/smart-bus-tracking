/// <reference types="google.maps" />
import { useEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

export type Bus = {
  id: string;
  bus_number: string;
  lat: number;
  lng: number;
  heading?: number | null;
  speed?: number | null;
  accuracy?: number | null;
  updated_at?: string | null;
};

export type Stop = { name: string; lat: number; lng: number; order?: number };

type BusMapProps = {
  buses: Bus[];
  stops?: Stop[];
  focusBusId?: string;
  className?: string;
  showTraffic?: boolean;
  routePath?: { lat: number; lng: number }[];
  replayPath?: { lat: number; lng: number }[];
};

declare global {
  interface Window {
    __initBusMap?: () => void;
  }
}

const COLLEGE = { lat: 14.1497, lng: 79.8447 };

let mapsPromise: Promise<void> | null = null;
function loadGoogleMaps(): Promise<void> {
  if (typeof window === "undefined") return Promise.reject(new Error("no window"));
  if (window.google?.maps?.Map) return Promise.resolve();
  if (mapsPromise) return mapsPromise;
  mapsPromise = new Promise<void>((resolve, reject) => {
    const key = import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY;
    const channel = import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_TRACKING_ID;
    if (!key) return reject(new Error("Google Maps key missing"));
    const timer = window.setTimeout(() => reject(new Error("Google Maps timeout")), 8000);
    window.__initBusMap = async () => {
      try {
        await google.maps.importLibrary("maps");
        await google.maps.importLibrary("marker");
        window.clearTimeout(timer);
        resolve();
      } catch (e) {
        window.clearTimeout(timer);
        reject(e as Error);
      }
    };
    const s = document.createElement("script");
    s.src = `https://maps.googleapis.com/maps/api/js?key=${key}&loading=async&callback=__initBusMap&channel=${channel}`;
    s.async = true;
    s.onerror = () => {
      window.clearTimeout(timer);
      reject(new Error("Failed to load Google Maps"));
    };
    document.head.appendChild(s);
  }).catch((err) => {
    mapsPromise = null;
    throw err;
  });
  return mapsPromise;
}

export function BusMap(props: BusMapProps) {
  const [mode, setMode] = useState<"loading" | "google" | "osm">("loading");

  useEffect(() => {
    let cancelled = false;
    loadGoogleMaps()
      .then(() => {
        if (!cancelled) setMode("google");
      })
      .catch(() => {
        if (!cancelled) setMode("osm");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const className = props.className ?? "h-[420px] w-full rounded-xl border border-border bg-muted";

  if (mode === "loading") {
    return (
      <div className={className}>
        <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
          Loading map…
        </div>
      </div>
    );
  }
  if (mode === "google") return <GoogleBusMap {...props} />;
  return <OsmBusMap {...props} />;
}

/* ----------------- Google Maps ----------------- */
function GoogleBusMap({ buses, stops = [], focusBusId, className, showTraffic, routePath, replayPath }: BusMapProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<Record<string, google.maps.Marker>>({});
  const stopMarkersRef = useRef<google.maps.Marker[]>([]);
  const routePolyRef = useRef<google.maps.Polyline | null>(null);
  const replayPolyRef = useRef<google.maps.Polyline | null>(null);
  const trafficRef = useRef<google.maps.TrafficLayer | null>(null);
  const infoRef = useRef<google.maps.InfoWindow | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!ref.current || mapRef.current) return;
    mapRef.current = new google.maps.Map(ref.current, {
      center: COLLEGE,
      zoom: 12,
      streetViewControl: false,
      mapTypeControl: false,
      fullscreenControl: false,
    });
    infoRef.current = new google.maps.InfoWindow();
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready || !mapRef.current) return;
    if (showTraffic) {
      if (!trafficRef.current) trafficRef.current = new google.maps.TrafficLayer();
      trafficRef.current.setMap(mapRef.current);
    } else if (trafficRef.current) {
      trafficRef.current.setMap(null);
    }
  }, [ready, showTraffic]);

  useEffect(() => {
    if (!ready || !mapRef.current) return;
    stopMarkersRef.current.forEach((m) => m.setMap(null));
    stopMarkersRef.current = stops.map(
      (s) =>
        new google.maps.Marker({
          position: { lat: s.lat, lng: s.lng },
          map: mapRef.current!,
          title: s.name,
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 6,
            fillColor: "#0B2447",
            fillOpacity: 1,
            strokeColor: "#FFC947",
            strokeWeight: 2,
          },
        }),
    );
  }, [ready, stops]);

  useEffect(() => {
    if (!ready || !mapRef.current) return;
    if (routePolyRef.current) routePolyRef.current.setMap(null);
    if (routePath && routePath.length > 1) {
      routePolyRef.current = new google.maps.Polyline({
        path: routePath,
        strokeColor: "#0B2447",
        strokeOpacity: 0.7,
        strokeWeight: 4,
        map: mapRef.current,
      });
    }
  }, [ready, routePath]);

  useEffect(() => {
    if (!ready || !mapRef.current) return;
    if (replayPolyRef.current) replayPolyRef.current.setMap(null);
    if (replayPath && replayPath.length > 1) {
      replayPolyRef.current = new google.maps.Polyline({
        path: replayPath,
        strokeColor: "#e11d48",
        strokeOpacity: 0.9,
        strokeWeight: 3,
        map: mapRef.current,
      });
    }
  }, [ready, replayPath]);

  useEffect(() => {
    if (!ready || !mapRef.current) return;
    const map = mapRef.current;
    const seen = new Set<string>();
    buses.forEach((bus) => {
      seen.add(bus.id);
      const pos = { lat: bus.lat, lng: bus.lng };
      let m = markersRef.current[bus.id];
      if (m) {
        m.setPosition(pos);
      } else {
        m = new google.maps.Marker({
          position: pos,
          map,
          label: { text: "🚌", fontSize: "18px" },
          title: `Bus ${bus.bus_number}`,
        });
        m.addListener("click", () => {
          if (!infoRef.current) return;
          const speed = bus.speed != null ? `${bus.speed.toFixed(1)} km/h` : "—";
          const acc = bus.accuracy != null ? `±${Math.round(bus.accuracy)} m` : "—";
          const upd = bus.updated_at ? new Date(bus.updated_at).toLocaleTimeString() : "—";
          infoRef.current.setContent(
            `<div style="font:12px/1.4 system-ui"><b>Bus ${bus.bus_number}</b><br/>Speed: ${speed}<br/>GPS: ${acc}<br/>Updated: ${upd}</div>`,
          );
          infoRef.current.open({ anchor: m!, map });
        });
        markersRef.current[bus.id] = m;
      }
    });
    Object.keys(markersRef.current).forEach((id) => {
      if (!seen.has(id)) {
        markersRef.current[id].setMap(null);
        delete markersRef.current[id];
      }
    });
    if (focusBusId && markersRef.current[focusBusId]) {
      map.panTo(markersRef.current[focusBusId].getPosition()!);
      if (map.getZoom()! < 13) map.setZoom(14);
    } else if (buses.length && !focusBusId) {
      const bounds = new google.maps.LatLngBounds();
      buses.forEach((b) => bounds.extend({ lat: b.lat, lng: b.lng }));
      stops.forEach((s) => bounds.extend({ lat: s.lat, lng: s.lng }));
      if (!bounds.isEmpty()) map.fitBounds(bounds, 60);
    }
  }, [ready, buses, focusBusId, stops]);

  return <div ref={ref} className={className ?? "h-[420px] w-full rounded-xl border border-border bg-muted"} />;
}

/* ----------------- OpenStreetMap fallback ----------------- */
function OsmBusMap({ buses, stops = [], focusBusId, className, routePath, replayPath }: BusMapProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<Record<string, L.Marker>>({});
  const stopLayerRef = useRef<L.LayerGroup | null>(null);
  const routeLineRef = useRef<L.Polyline | null>(null);
  const replayLineRef = useRef<L.Polyline | null>(null);

  const busIcon = useMemo(
    () =>
      L.divIcon({
        className: "",
        html: `<div style="font-size:20px;line-height:1">🚌</div>`,
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      }),
    [],
  );

  useEffect(() => {
    if (!ref.current || mapRef.current) return;
    mapRef.current = L.map(ref.current, { zoomControl: true }).setView([COLLEGE.lat, COLLEGE.lng], 12);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap contributors",
      maxZoom: 19,
    }).addTo(mapRef.current);
    stopLayerRef.current = L.layerGroup().addTo(mapRef.current);
    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!mapRef.current || !stopLayerRef.current) return;
    stopLayerRef.current.clearLayers();
    stops.forEach((s) => {
      L.circleMarker([s.lat, s.lng], {
        radius: 6,
        color: "#FFC947",
        weight: 2,
        fillColor: "#0B2447",
        fillOpacity: 1,
      })
        .bindTooltip(s.name)
        .addTo(stopLayerRef.current!);
    });
  }, [stops]);

  useEffect(() => {
    if (!mapRef.current) return;
    if (routeLineRef.current) routeLineRef.current.remove();
    if (routePath && routePath.length > 1) {
      routeLineRef.current = L.polyline(
        routePath.map((p) => [p.lat, p.lng] as [number, number]),
        { color: "#0B2447", weight: 4, opacity: 0.7 },
      ).addTo(mapRef.current);
    }
  }, [routePath]);

  useEffect(() => {
    if (!mapRef.current) return;
    if (replayLineRef.current) replayLineRef.current.remove();
    if (replayPath && replayPath.length > 1) {
      replayLineRef.current = L.polyline(
        replayPath.map((p) => [p.lat, p.lng] as [number, number]),
        { color: "#e11d48", weight: 3, opacity: 0.9 },
      ).addTo(mapRef.current);
    }
  }, [replayPath]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const seen = new Set<string>();
    buses.forEach((bus) => {
      seen.add(bus.id);
      const pos: [number, number] = [bus.lat, bus.lng];
      let m = markersRef.current[bus.id];
      const speed = bus.speed != null ? `${bus.speed.toFixed(1)} km/h` : "—";
      const acc = bus.accuracy != null ? `±${Math.round(bus.accuracy)} m` : "—";
      const upd = bus.updated_at ? new Date(bus.updated_at).toLocaleTimeString() : "—";
      const popup = `<b>Bus ${bus.bus_number}</b><br/>Speed: ${speed}<br/>GPS: ${acc}<br/>Updated: ${upd}`;
      if (m) {
        m.setLatLng(pos);
        m.setPopupContent(popup);
      } else {
        m = L.marker(pos, { icon: busIcon, title: `Bus ${bus.bus_number}` })
          .bindPopup(popup)
          .addTo(map);
        markersRef.current[bus.id] = m;
      }
    });
    Object.keys(markersRef.current).forEach((id) => {
      if (!seen.has(id)) {
        markersRef.current[id].remove();
        delete markersRef.current[id];
      }
    });
    if (focusBusId && markersRef.current[focusBusId]) {
      const ll = markersRef.current[focusBusId].getLatLng();
      map.panTo(ll);
      if (map.getZoom() < 13) map.setZoom(14);
    } else if (buses.length && !focusBusId) {
      const pts: [number, number][] = [];
      buses.forEach((b) => pts.push([b.lat, b.lng]));
      stops.forEach((s) => pts.push([s.lat, s.lng]));
      if (pts.length) map.fitBounds(pts, { padding: [40, 40] });
    }
  }, [buses, focusBusId, stops, busIcon]);

  return <div ref={ref} className={className ?? "h-[420px] w-full rounded-xl border border-border bg-muted"} />;
}

export function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) *
      Math.cos((b.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

export function haversineM(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  return haversineKm(a, b) * 1000;
}