import type { ReactNode } from "react";
import { haversineKm } from "@/components/BusMap";
import { Bus, MapPin, Milestone, Waves, AlertTriangle } from "lucide-react";

type Kind = "stop" | "toll" | "bridge" | "landmark" | "signal" | "hazard";
type Stop = { name: string; lat: number; lng: number; order?: number; kind?: Kind };
type Loc = { lat: number; lng: number; speed?: number | null; updated_at?: string } | null;

const kindMeta: Record<Kind, { label: string; icon: ReactNode; tone: string }> = {
  stop: { label: "Stop", icon: <MapPin className="h-3 w-3" />, tone: "text-primary" },
  toll: { label: "Toll plaza", icon: <Milestone className="h-3 w-3" />, tone: "text-amber-600" },
  bridge: { label: "Bridge", icon: <Waves className="h-3 w-3" />, tone: "text-sky-600" },
  landmark: { label: "Landmark", icon: <MapPin className="h-3 w-3" />, tone: "text-fuchsia-600" },
  signal: { label: "Signal", icon: <AlertTriangle className="h-3 w-3" />, tone: "text-orange-600" },
  hazard: { label: "Caution", icon: <AlertTriangle className="h-3 w-3" />, tone: "text-destructive" },
};

export function BusRouteTimeline({
  stops,
  loc,
  boardingStop,
  busNumber,
}: {
  stops: Stop[];
  loc: Loc;
  boardingStop?: string;
  busNumber?: string;
}) {
  if (!stops.length) {
    return <p className="text-sm text-muted-foreground">No stops configured on this route.</p>;
  }

  const items = [...stops].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  let nearestIdx = -1;
  let nearestDist = Infinity;
  if (loc) {
    items.forEach((s, i) => {
      const d = haversineKm({ lat: loc.lat, lng: loc.lng }, s);
      if (d < nearestDist) {
        nearestDist = d;
        nearestIdx = i;
      }
    });
  }

  const AT_KM = 0.08; // 80m
  const atItem = nearestIdx >= 0 && nearestDist <= AT_KM;

  // Compute progress between nearest and neighbour to place the bus icon smoothly
  let busBetween: { after: number; progress: number } | null = null;
  if (loc && nearestIdx >= 0 && !atItem) {
    const prev = items[nearestIdx - 1];
    const next = items[nearestIdx + 1];
    const dPrev = prev ? haversineKm({ lat: loc.lat, lng: loc.lng }, prev) : Infinity;
    const dNext = next ? haversineKm({ lat: loc.lat, lng: loc.lng }, next) : Infinity;
    if (dPrev <= dNext && prev) {
      const segment = haversineKm(prev, items[nearestIdx]);
      const progress = segment > 0 ? Math.min(1, dPrev / segment) : 0.5;
      busBetween = { after: nearestIdx - 1, progress };
    } else if (next) {
      const segment = haversineKm(items[nearestIdx], next);
      const done = segment > 0 ? Math.min(1, (segment - dNext) / segment) : 0.5;
      busBetween = { after: nearestIdx, progress: done };
    }
  }

  return (
    <div className="relative">
      <ul className="space-y-0">
        {items.map((s, i) => {
          const kind: Kind = s.kind ?? "stop";
          const isStop = kind === "stop";
          const meta = kindMeta[kind];
          const isBoarding = boardingStop && s.name === boardingStop;
          const isPassed = nearestIdx > i || (nearestIdx === i && atItem);
          const isCurrent = atItem && nearestIdx === i;
          const showBusAfter = busBetween?.after === i;
          const distFromBus = loc ? haversineKm({ lat: loc.lat, lng: loc.lng }, s) : null;

          return (
            <li key={`${s.name}-${i}`} className="relative">
              <div className="flex items-stretch gap-3">
                <div className="relative flex w-6 flex-col items-center">
                  {i > 0 && (
                    <span
                      className={`absolute left-1/2 top-0 h-1/2 w-0.5 -translate-x-1/2 ${
                        isPassed ? "bg-primary" : "bg-border"
                      }`}
                    />
                  )}
                  {i < items.length - 1 && (
                    <span
                      className={`absolute left-1/2 top-1/2 h-1/2 w-0.5 -translate-x-1/2 ${
                        nearestIdx > i ? "bg-primary" : "bg-border"
                      }`}
                    />
                  )}
                  {isStop ? (
                    <span
                      className={`relative z-10 mt-3 h-3.5 w-3.5 rounded-full ring-2 ring-background ${
                        isCurrent
                          ? "bg-accent"
                          : isPassed
                          ? "bg-primary"
                          : isBoarding
                          ? "bg-accent"
                          : "bg-muted-foreground/40"
                      }`}
                    />
                  ) : (
                    <span
                      className={`relative z-10 mt-2.5 flex h-5 w-5 items-center justify-center rounded-full bg-background ring-2 ${
                        isPassed ? "ring-primary/60" : "ring-border"
                      } ${meta.tone}`}
                    >
                      {meta.icon}
                    </span>
                  )}
                </div>

                <div className="min-w-0 flex-1 py-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2">
                      <span
                        className={`truncate ${isStop ? "text-sm font-medium" : "text-xs"} ${
                          isCurrent ? "text-accent" : isStop ? "" : "text-muted-foreground"
                        }`}
                      >
                        {s.name}
                      </span>
                      {!isStop && (
                        <span className={`rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium ${meta.tone}`}>
                          {meta.label}
                        </span>
                      )}
                      {isBoarding && (
                        <span className="rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-medium text-accent">
                          Your stop
                        </span>
                      )}
                      {isCurrent && (
                        <span className="rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-medium text-accent">
                          {isStop ? "Arrived" : "Passing"}
                        </span>
                      )}
                    </div>
                    {distFromBus != null && (
                      <span className="shrink-0 text-[11px] text-muted-foreground">
                        {distFromBus < 1
                          ? `${Math.round(distFromBus * 1000)} m`
                          : `${distFromBus.toFixed(1)} km`}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {showBusAfter && (
                <div className="relative">
                  <div className="relative ml-0 h-10 w-6">
                    <span className="absolute left-1/2 top-0 h-full w-0.5 -translate-x-1/2 bg-primary/40" />
                    <span
                      className="absolute left-1/2 flex h-7 w-7 -translate-x-1/2 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md ring-2 ring-background transition-all duration-500"
                      style={{ top: `${Math.round((busBetween?.progress ?? 0.5) * 100)}%`, transform: "translate(-50%, -50%)" }}
                    >
                      <Bus className="h-4 w-4" />
                    </span>
                  </div>
                  <div className="absolute left-10 top-1 text-xs text-muted-foreground">
                    Bus {busNumber ?? ""} en route
                    {loc?.speed && loc.speed > 1 ? ` · ${Math.round(loc.speed)} km/h` : ""}
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ul>
      {!loc && (
        <p className="mt-3 text-xs text-muted-foreground">Waiting for live location from the driver…</p>
      )}
    </div>
  );
}