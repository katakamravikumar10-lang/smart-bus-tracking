import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type Tone = "primary" | "accent" | "success" | "warning" | "danger" | "muted";

const toneMap: Record<Tone, { icon: string; ring: string }> = {
  primary: { icon: "bg-primary/10 text-primary", ring: "ring-primary/20" },
  accent: { icon: "bg-accent/10 text-accent", ring: "ring-accent/20" },
  success: { icon: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400", ring: "ring-emerald-500/20" },
  warning: { icon: "bg-amber-500/10 text-amber-600 dark:text-amber-400", ring: "ring-amber-500/20" },
  danger: { icon: "bg-destructive/10 text-destructive", ring: "ring-destructive/20" },
  muted: { icon: "bg-muted text-muted-foreground", ring: "ring-border" },
};

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "primary",
  trend,
}: {
  label: string;
  value: number | string;
  hint?: string;
  icon?: LucideIcon;
  tone?: Tone;
  trend?: { direction: "up" | "down" | "flat"; text: string };
}) {
  const t = toneMap[tone];
  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-xl border border-border bg-card p-4 shadow-sm transition-all hover:shadow-md",
        "ring-1 ring-transparent hover:ring-2",
        t.ring,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {label}
          </div>
          <div className="mt-1.5 text-2xl font-bold leading-none text-foreground sm:text-3xl">
            {value}
          </div>
          {(hint || trend) && (
            <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
              {trend && (
                <span
                  className={cn(
                    "inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium",
                    trend.direction === "up" && "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
                    trend.direction === "down" && "bg-destructive/10 text-destructive",
                    trend.direction === "flat" && "bg-muted text-muted-foreground",
                  )}
                >
                  {trend.direction === "up" ? "▲" : trend.direction === "down" ? "▼" : "◆"} {trend.text}
                </span>
              )}
              {hint && <span className="truncate">{hint}</span>}
            </div>
          )}
        </div>
        {Icon && (
          <div className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-lg", t.icon)}>
            <Icon className="h-5 w-5" />
          </div>
        )}
      </div>
    </div>
  );
}