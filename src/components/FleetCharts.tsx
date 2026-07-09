import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, XAxis, YAxis } from "recharts";
import { Activity, PieChart as PieIcon } from "lucide-react";

type BusStatusRow = { status: string; active: boolean };

const STATUS_COLORS: Record<string, string> = {
  running: "hsl(142 71% 45%)",
  idle: "hsl(215 16% 55%)",
  delayed: "hsl(38 92% 50%)",
  maintenance: "hsl(0 84% 60%)",
  completed: "hsl(217 91% 60%)",
};

const pieConfig: ChartConfig = {
  count: { label: "Buses" },
};

const barConfig: ChartConfig = {
  trips: { label: "Trips", color: "hsl(var(--primary))" },
};

export function FleetCharts({ buses }: { buses: BusStatusRow[] }) {
  const [trips, setTrips] = useState<{ day: string; trips: number }[]>([]);

  useEffect(() => {
    (async () => {
      const since = new Date();
      since.setDate(since.getDate() - 6);
      since.setHours(0, 0, 0, 0);
      const { data } = await supabase
        .from("trips")
        .select("started_at")
        .gte("started_at", since.toISOString());
      const buckets: Record<string, number> = {};
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        d.setHours(0, 0, 0, 0);
        buckets[d.toISOString().slice(0, 10)] = 0;
      }
      (data ?? []).forEach((t) => {
        const k = new Date(t.started_at).toISOString().slice(0, 10);
        if (k in buckets) buckets[k]++;
      });
      setTrips(
        Object.entries(buckets).map(([k, v]) => ({
          day: new Date(k).toLocaleDateString(undefined, { weekday: "short" }),
          trips: v,
        })),
      );
    })();
  }, []);

  const statusCounts = buses.reduce<Record<string, number>>((acc, b) => {
    const key = b.active ? b.status : "idle";
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});
  const pieData = Object.entries(statusCounts).map(([status, count]) => ({ status, count }));
  const total = pieData.reduce((s, x) => s + x.count, 0);

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <PieIcon className="h-4 w-4 text-accent" /> Fleet status
          </CardTitle>
        </CardHeader>
        <CardContent>
          {total === 0 ? (
            <div className="grid h-56 place-items-center text-sm text-muted-foreground">
              No buses yet
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4 sm:flex-row">
              <ChartContainer config={pieConfig} className="mx-auto aspect-square h-56 w-56">
                <PieChart>
                  <ChartTooltip content={<ChartTooltipContent nameKey="status" />} />
                  <Pie data={pieData} dataKey="count" nameKey="status" innerRadius={50} outerRadius={80} strokeWidth={2}>
                    {pieData.map((d) => (
                      <Cell key={d.status} fill={STATUS_COLORS[d.status] ?? "hsl(var(--muted-foreground))"} />
                    ))}
                  </Pie>
                </PieChart>
              </ChartContainer>
              <div className="space-y-2 text-sm">
                {pieData.map((d) => (
                  <div key={d.status} className="flex items-center gap-2">
                    <span
                      className="h-3 w-3 rounded-full"
                      style={{ background: STATUS_COLORS[d.status] ?? "var(--muted-foreground)" }}
                    />
                    <span className="capitalize">{d.status}</span>
                    <span className="ml-auto font-semibold tabular-nums">{d.count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Activity className="h-4 w-4 text-accent" /> Trips · last 7 days
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={barConfig} className="h-56 w-full">
            <BarChart data={trips} margin={{ left: -20, right: 8, top: 8, bottom: 0 }}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="day" tickLine={false} axisLine={false} className="text-xs" />
              <YAxis allowDecimals={false} tickLine={false} axisLine={false} className="text-xs" />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="trips" fill="var(--color-trips)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  );
}