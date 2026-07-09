import { useEffect, useState } from "react";

export type Language = "en" | "te";

export type AppSettings = {
  notifyBusArrival: boolean;
  notifyRouteChange: boolean;
  notifyAnnouncements: boolean;
  notifyEmergency: boolean;
  pushEnabled: boolean;
  language: Language;
  gpsUpdateSeconds: number;
};

const STORAGE_KEY = "nbt-app-settings";

export const defaultSettings: AppSettings = {
  notifyBusArrival: true,
  notifyRouteChange: true,
  notifyAnnouncements: true,
  notifyEmergency: true,
  pushEnabled: false,
  language: "en",
  gpsUpdateSeconds: 10,
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
  }, []);

  function update<K extends keyof AppSettings>(key: K, value: AppSettings[K]) {
    setSettings((prev) => {
      const next = { ...prev, [key]: value };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  }

  return { settings, update, hydrated };
}