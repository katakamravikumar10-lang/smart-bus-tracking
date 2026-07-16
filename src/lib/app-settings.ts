import { useEffect, useState } from "react";

export type Language = "en" | "te";
export type MapProvider = "google" | "osm";

export type AppSettings = {
  notifyBusArrival: boolean;
  notifyRouteChange: boolean;
  notifyAnnouncements: boolean;
  notifyEmergency: boolean;
  pushEnabled: boolean;
  language: Language;
  gpsUpdateSeconds: number;
  demoModeEnabled: boolean;
  mapProvider: MapProvider;
};

const STORAGE_KEY = "nbt-app-settings";
const CHANGE_EVENT = "nbt-app-settings-change";

function envDefaultMapProvider(): MapProvider {
  const v = (import.meta.env.VITE_MAP_PROVIDER as string | undefined)?.toLowerCase();
  return v === "osm" ? "osm" : v === "google" ? "google" : "google";
}

export const defaultSettings: AppSettings = {
  notifyBusArrival: true,
  notifyRouteChange: true,
  notifyAnnouncements: true,
  notifyEmergency: true,
  pushEnabled: false,
  language: "en",
  gpsUpdateSeconds: 10,
  demoModeEnabled: false,
  mapProvider: envDefaultMapProvider(),
};

function readStored(): AppSettings {
  if (typeof localStorage === "undefined") return defaultSettings;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultSettings;
    return { ...defaultSettings, ...(JSON.parse(raw) as Partial<AppSettings>) };
  } catch {
    return defaultSettings;
  }
}

export function useAppSettings() {
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setSettings(readStored());
    setHydrated(true);
    const onChange = () => setSettings(readStored());
    window.addEventListener(CHANGE_EVENT, onChange);
    window.addEventListener("storage", onChange);
    return () => {
      window.removeEventListener(CHANGE_EVENT, onChange);
      window.removeEventListener("storage", onChange);
    };
  }, []);

  function update<K extends keyof AppSettings>(key: K, value: AppSettings[K]) {
    setSettings((prev) => {
      const next = { ...prev, [key]: value };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        window.dispatchEvent(new Event(CHANGE_EVENT));
      } catch {
        /* ignore */
      }
      return next;
    });
  }

  return { settings, update, hydrated };
}