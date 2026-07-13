import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { GraduationCap, ArrowRight, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAcademicYears } from "@/lib/academic-year";
import { audit } from "@/lib/audit";

type StudentRow = { id: string; full_name: string | null; roll_no: string | null; branch: string | null; year_of_study: number | null; section: string | null; student_status: string; academic_year_id: string | null };

export function PromoteStudentsTab() {
  const { years, active, refresh } = useAcademicYears();
  const [fromYear, setFromYear] = useState<string>("1");
  const [targetYearId, setTargetYearId] = useState<string>("");
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [running, setRunning] = useState(false);

  useEffect(() => { if (active) setTargetYearId(active.id); }, [active]);

  const load = async () => {
    setLoading(true);
    const yr = fromYear === "final" ? 4 : parseInt(fromYear, 10);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase.from("profiles") as any)
      .select("id, full_name, roll_no, branch, year_of_study, section, student_status, academic_year_id")
      .eq("student_status", "active")
      .eq("year_of_study", yr);
    setLoading(false);
    if (error) return toast.error(error.message);
    setStudents((data ?? []) as StudentRow[]);
  };

  const preview = useMemo(() => {
    const graduate = fromYear === "final";
    return students.map((s) => ({
      ...s,
      next_year: graduate ? null : (s.year_of_study ?? 0) + 1,
      next_status: graduate ? "graduated" : "active",
    }));
  }, [students, fromYear]);

  const promote = async () => {
    if (!targetYearId) return toast.error("Select target academic year");
    if (preview.length === 0) return toast.error("No students to promote");
    setRunning(true);
    const graduate = fromYear === "final";
    let ok = 0, fail = 0;
    for (const s of preview) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.from("profiles") as any)
        .update({
          year_of_study: graduate ? s.year_of_study : (s.next_year as number),
          student_status: s.next_status,
          academic_year_id: graduate ? s.academic_year_id : targetYearId,
        })
        .eq("id", s.id);
      if (error) { fail++; continue; }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from("student_promotions" as any) as any).insert({
        student_id: s.id,
        from_year_of_study: s.year_of_study,
        to_year_of_study: graduate ? s.year_of_study : s.next_year,
        from_academic_year_id: s.academic_year_id,
        to_academic_year_id: graduate ? s.academic_year_id : targetYearId,
        action: graduate ? "graduate" : "promote",
      });
      ok++;
    }
    setRunning(false);
    audit(graduate ? "students.graduate" : "students.promote", { entityType: "profiles", details: { ok, fail, from_year: fromYear, to_year_id: targetYearId } });
    toast.success(`Processed ${ok} students${fail ? `, ${fail} failed` : ""}`);
    setStudents([]);
    void refresh();
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><GraduationCap className="h-5 w-5" /> Promote / Graduate Students</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div>
            <Label>Promote students in year</Label>
            <Select value={fromYear} onValueChange={setFromYear}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1st Year → 2nd Year</SelectItem>
                <SelectItem value="2">2nd Year → 3rd Year</SelectItem>
                <SelectItem value="3">3rd Year → 4th Year</SelectItem>
                <SelectItem value="final">Final Year → Graduated</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Target academic year</Label>
            <Select value={targetYearId} onValueChange={setTargetYearId}>
              <SelectTrigger><SelectValue placeholder="Select year" /></SelectTrigger>
              <SelectContent>
                {years.filter((y) => y.status !== "archived").map((y) => (
                  <SelectItem key={y.id} value={y.id}>{y.name} ({y.status})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end"><Button variant="outline" onClick={load} className="w-full">Preview</Button></div>
          <div className="flex items-end"><Button onClick={promote} disabled={running || preview.length === 0} className="w-full">{running ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Confirm <ArrowRight className="ml-1 h-4 w-4" /></>}</Button></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Preview ({preview.length})</CardTitle></CardHeader>
        <CardContent>
          {loading ? <p className="text-sm text-muted-foreground">Loading…</p> : preview.length === 0 ? (
            <p className="text-sm text-muted-foreground">Click Preview to see affected students.</p>
          ) : (
            <div className="max-h-96 overflow-auto text-sm">
              <table className="w-full">
                <thead className="text-left text-xs text-muted-foreground"><tr><th className="p-2">Roll</th><th className="p-2">Name</th><th className="p-2">Branch</th><th className="p-2">Section</th><th className="p-2">Change</th></tr></thead>
                <tbody>
                  {preview.map((s) => (
                    <tr key={s.id} className="border-t">
                      <td className="p-2 font-mono text-xs">{s.roll_no ?? "-"}</td>
                      <td className="p-2">{s.full_name ?? "-"}</td>
                      <td className="p-2">{s.branch ?? "-"}</td>
                      <td className="p-2">{s.section ?? "-"}</td>
                      <td className="p-2"><Badge variant={s.next_status === "graduated" ? "secondary" : "default"}>{s.year_of_study ?? "-"} → {s.next_year ?? "Graduated"}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}