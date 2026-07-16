import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { CalendarDays, CheckCircle2, Archive, Lock, Plus, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useAcademicYears, type AcademicYear } from "@/lib/academic-year";
import { audit } from "@/lib/audit";

export function AcademicYearsTab() {
  const { years, loading, refresh } = useAcademicYears();
  const [name, setName] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [saving, setSaving] = useState(false);

  const create = async () => {
    if (!name || !start || !end) {
      toast.error("Fill name, start date, and end date");
      return;
    }
    setSaving(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase.from("academic_years" as any) as any)
      .insert({ name, start_date: start, end_date: end, status: "upcoming" })
      .select()
      .single();
    setSaving(false);
    if (error) return toast.error(error.message);
    audit("academic_year.create", { entityType: "academic_year", entityId: data.id, after: data });
    toast.success("Academic year created");
    setName(""); setStart(""); setEnd("");
    void refresh();
  };

  const activate = async (y: AcademicYear) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tbl = supabase.from("academic_years" as any) as any;
    // Deactivate current active first
    await tbl.update({ status: "upcoming" }).eq("status", "active");
    const { error } = await tbl.update({ status: "active" }).eq("id", y.id);
    if (error) return toast.error(error.message);
    audit("academic_year.activate", { entityType: "academic_year", entityId: y.id, after: { status: "active" } });
    toast.success(`${y.name} is now active`);
    void refresh();
  };

  const archive = async (y: AcademicYear) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from("academic_years" as any) as any)
      .update({ status: "archived", locked: true })
      .eq("id", y.id);
    if (error) return toast.error(error.message);
    audit("academic_year.archive", { entityType: "academic_year", entityId: y.id });
    toast.success(`${y.name} archived`);
    void refresh();
  };

  const toggleLock = async (y: AcademicYear) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from("academic_years" as any) as any)
      .update({ locked: !y.locked })
      .eq("id", y.id);
    if (error) return toast.error(error.message);
    audit("academic_year.lock", { entityType: "academic_year", entityId: y.id, after: { locked: !y.locked } });
    void refresh();
  };

  const togglePromotions = async (y: AcademicYear) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from("academic_years" as any) as any)
      .update({ promotions_enabled: !y.promotions_enabled })
      .eq("id", y.id);
    if (error) return toast.error(error.message);
    audit("academic_year.promotions_toggle", { entityType: "academic_year", entityId: y.id, after: { promotions_enabled: !y.promotions_enabled } });
    void refresh();
  };

  const remove = async (y: AcademicYear) => {
    if (y.status !== "archived") {
      toast.error("Only archived years can be deleted");
      return;
    }
    if (!window.confirm(`Delete academic year "${y.name}"? This cannot be undone.`)) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from("academic_years" as any) as any)
      .delete()
      .eq("id", y.id);
    if (error) return toast.error(error.message);
    audit("academic_year.delete", { entityType: "academic_year", entityId: y.id, before: y });
    toast.success(`${y.name} deleted`);
    void refresh();
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Plus className="h-5 w-5" /> Create Academic Year</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div><Label>Name</Label><Input placeholder="2026-2027" value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div><Label>Start date</Label><Input type="date" value={start} onChange={(e) => setStart(e.target.value)} /></div>
          <div><Label>End date</Label><Input type="date" value={end} onChange={(e) => setEnd(e.target.value)} /></div>
          <div className="flex items-end"><Button onClick={create} disabled={saving} className="w-full">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create"}</Button></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><CalendarDays className="h-5 w-5" /> Academic Years</CardTitle></CardHeader>
        <CardContent>
          {loading ? <p className="text-sm text-muted-foreground">Loading…</p> : years.length === 0 ? (
            <p className="text-sm text-muted-foreground">No academic years yet. Create the first one above.</p>
          ) : (
            <div className="space-y-2">
              {years.map((y) => (
                <div key={y.id} className="flex flex-col md:flex-row md:items-center gap-3 rounded-md border p-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{y.name}</span>
                      <Badge variant={y.status === "active" ? "default" : y.status === "archived" ? "secondary" : "outline"}>
                        {y.status}
                      </Badge>
                      {y.locked && <Badge variant="secondary"><Lock className="mr-1 h-3 w-3" />Locked</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground">{y.start_date} → {y.end_date}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="flex items-center gap-2 text-xs"><Switch checked={y.promotions_enabled} onCheckedChange={() => void togglePromotions(y)} disabled={y.status === "archived"} /> Promotions</div>
                    <div className="flex items-center gap-2 text-xs"><Switch checked={y.locked} onCheckedChange={() => void toggleLock(y)} disabled={y.status === "archived"} /> Lock</div>
                    {y.status !== "active" && y.status !== "archived" && (
                      <Button size="sm" onClick={() => void activate(y)}><CheckCircle2 className="mr-1 h-4 w-4" />Activate</Button>
                    )}
                    {y.status !== "archived" && (
                      <Button size="sm" variant="outline" onClick={() => void archive(y)}><Archive className="mr-1 h-4 w-4" />Archive</Button>
                    )}
                    {y.status === "archived" && (
                      <Button size="sm" variant="destructive" onClick={() => void remove(y)}><Trash2 className="mr-1 h-4 w-4" />Delete</Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}