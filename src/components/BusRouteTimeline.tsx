import { haversineKm } from "@/components/BusMap";
import { Bus } from "lucide-react";

type Stop = { name: string; lat: number; lng: number; order?: number };
type Loc = { lat: number; lng: number; speed?: number | null; updated_at?: string } | null;

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

  // Find nearest stop index to the current bus location
  let nearestIdx = -1;
  let nearestDist = Infinity;
  if (loc) {
    stops.forEach((s, i) => {
      const d = haversineKm({ lat: loc.lat, lng: loc.lng }, s);
      if (d < nearestDist) {
        nearestDist = d;
        nearestIdx = i;
      }
    });
  }

  // Decide whether bus is "at" the nearest stop or between nearest and next
  const AT_STOP_KM = 0.08; // 80m
  const atStop = nearestIdx >= 0 && nearestDist <= AT_STOP_KM;

  // Determine progress: place bus icon before or after nearestIdx
  // If the previous stop is closer to the bus than the next, put bus between prev and nearest.
  let busBetween: { after: number } | null = null;
  if (loc && nearestIdx >= 0 && !atStop) {
    const prev = stops[nearestIdx - 1];
    const next = stops[nearestIdx + 1];
    const dPrev = prev ? haversineKm({ lat: loc.lat, lng: loc.lng }, prev) : Infinity;
    const dNext = next ? haversineKm({ lat: loc.lat, lng: loc.lng }, next) : Infinity;
    if (dPrev < dNext) {
      busBetween = { after: nearestIdx - 1 };
    } else {
      busBetween = { after: nearestIdx };
    }
  }

  return (
    <div className="relative">
      <ul className="space-y-0">
        {stops.map((s, i) => {
          const isBoarding = boardingStop && s.name === boardingStop;
          const isPassed = nearestIdx > i || (nearestIdx === i && atStop);
          const isCurrent = atStop && nearestIdx === i;
          const showBusAfter = busBetween?.after === i;
          const distFromBus = loc ? haversineKm({ lat: loc.lat, lng: loc.lng }, s) : null;

          return (
            <li key={`${s.name}-${i}`} className="relative">
              <div className="flex items-stretch gap-3">
                {/* Rail column */}
                <div className="relative flex w-6 flex-col items-center">
                  {/* top connector */}
                  {i > 0 && (
                    <span
                      className={`absolute left-1/2 top-0 h-1/2 w-0.5 -translate-x-1/2 ${
                        isPassed ? "bg-primary" : "bg-border"
                      }`}
                    />
                  )}
                  {/* bottom connector */}
                  {i < stops.length - 1 && (
                    <span
                      className={`absolute left-1/2 top-1/2 h-1/2 w-0.5 -translate-x-1/2 ${
                        nearestIdx > i ? "bg-primary" : "bg-border"
                      }`}
                    />
                  )}
                  {/* stop dot */}
                  <span
                    className={`relative z-10 mt-3 h-3 w-3 rounded-full ring-2 ring-background ${
                      isCurrent
                        ? "bg-accent"
                        : isPassed
                        ? "bg-primary"
                        : isBoarding
                        ? "bg-accent"
                        : "bg-muted-foreground/40"
                    }`}
                  />
                </div>

                {/* Content */}
                <div className="min-w-0 flex-1 py-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 truncate">
                      <span className={`truncate text-sm font-medium ${isCurrent ? "text-accent" : ""}`}>
                        {s.name}
                      </span>
                      {isBoarding && (
                        <span className="rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-medium text-accent">
                          Your stop
                        </span>
                      )}
                      {isCurrent && (
                        <span className="rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-medium text-accent">
                          Arrived
                        </span>
                      )}
                    </div>
                    {distFromBus != null && (
                      <span className="shrink-0 text-[11px] text-muted-foreground">
                        {distFromBus < 1 ? `${Math.round(distFromBus * 1000)} m` : `${distFromBus.toFixed(1)} km`}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Live bus indicator between stops */}
              {showBusAfter && (
                <div className="relative flex items-center gap-3 pl-0">
                  <div className="relative flex w-6 justify-center">
                    <span className="absolute left-1/2 top-0 h-full w-0.5 -translate-x-1/2 bg-primary/40" />
                    <span className="relative z-10 my-1 flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md ring-2 ring-background">
                      <Bus className="h-4 w-4" />
                    </span>
                  </div>
                  <div className="py-1 text-xs text-muted-foreground">
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