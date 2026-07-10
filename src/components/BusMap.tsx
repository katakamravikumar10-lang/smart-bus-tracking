/// <reference types="google.maps" />
import { useEffect, useRef, useState } from "react";

type Bus = {
  id: string;
  bus_number: string;
  lat: number;
  lng: number;
  heading?: number | null;
  speed?: number | null;
};

type Stop = { name: string; lat: number; lng: number; order?: number };

declare global {
  interface Window {
    __initBusMap?: () => void;
  }
}

let mapsPromise: Promise<void> | null = null;
function loadMaps(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.google?.maps?.Map) return Promise.resolve();
  if (mapsPromise) return mapsPromise;
  mapsPromise = new Promise((resolve, reject) => {
    const key = import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY;
    const channel = import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_TRACKING_ID;
    window.__initBusMap = async () => {
      try {
        await google.maps.importLibrary("maps");
        await google.maps.importLibrary("marker");
        resolve();
      } catch (e) {
        reject(e);
      }
    };
    const s = document.createElement("script");
    s.src = `https://maps.googleapis.com/maps/api/js?key=${key}&loading=async&callback=__initBusMap&channel=${channel}`;
    s.async = true;
    s.onerror = () => reject(new Error("Failed to load Google Maps"));
    document.head.appendChild(s);
  });
  return mapsPromise;
}

// Narayana Engineering College, Gudur approx coords
const COLLEGE = { lat: 14.1497, lng: 79.8447 };

export function BusMap({
  buses,
  stops = [],
  focusBusId,
  className,
}: {
  buses: Bus[];
  stops?: Stop[];
  focusBusId?: string;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<Record<string, google.maps.Marker>>({});
  const stopMarkersRef = useRef<google.maps.Marker[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    loadMaps().then(() => {
      if (cancelled || !ref.current) return;
      mapRef.current = new google.maps.Map(ref.current, {
        center: COLLEGE,
        zoom: 12,
        disableDefaultUI: false,
        streetViewControl: false,
        mapTypeControl: false,
        fullscreenControl: false,
      });
      setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Stops
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

  // Buses
  useEffect(() => {
    if (!ready || !mapRef.current) return;
    const map = mapRef.current;
    const seen = new Set<string>();
    buses.forEach((bus) => {
      seen.add(bus.id);
      const pos = { lat: bus.lat, lng: bus.lng };
      const existing = markersRef.current[bus.id];
      if (existing) {
        existing.setPosition(pos);
      } else {
        markersRef.current[bus.id] = new google.maps.Marker({
          position: pos,
          map,
          label: { text: "🚌", fontSize: "18px" },
          title: `Bus ${bus.bus_number}`,
        });
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