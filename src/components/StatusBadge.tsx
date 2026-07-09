import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const TONES: Record<string, string> = {
  running: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
  active: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
  completed: "bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30",
  resolved: "bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30",
  idle: "bg-slate-500/15 text-slate-700 dark:text-slate-300 border-slate-500/30",
  delayed: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30",
  pending: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30",
  open: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30",
  maintenance: "bg-orange-500/15 text-orange-700 dark:text-orange-300 border-orange-500/30",
  inactive: "bg-muted text-muted-foreground border-border",
  emergency: "bg-destructive/15 text-destructive border-destructive/30",
};

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  const key = (status ?? "").toLowerCase();
  const tone = TONES[key] ?? "bg-muted text-muted-foreground border-border";
  return (
    <Badge variant="outline" className={cn("border font-medium capitalize", tone, className)}>
      {status}
    </Badge>
  );
}