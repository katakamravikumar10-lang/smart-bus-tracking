import { useRef, useState } from "react";
import * as XLSX from "xlsx";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, FileSpreadsheet, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAcademicYears } from "@/lib/academic-year";
import { audit } from "@/lib/audit";

type Row = {
  name?: string; roll_number?: string; department?: string; branch?: string;
  year?: string | number; section?: string; bus?: string; boarding_point?: string;
  phone?: string; email?: string;
};

type Summary = { total: number; inserted: number; updated: number; skipped: number; errors: number; errorDetails: { row: number; reason: string }[] };

function normalize(k: string) { return k.toLowerCase().replace(/[^a-z0-9]/g, "_"); }

export function ImportStudentsTab() {
  const { years, active } = useAcademicYears();
  const [targetYear, setTargetYear] = useState<string>(active?.id ?? "");
  const [summary, setSummary] = useState<Summary | null>(null);
  const [running, setRunning] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = async (f: File) => {
    if (!targetYear) return toast.error("Select target academic year");
    setRunning(true);
    setSummary(null);
    try {
      const buf = await f.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
      const rows: Row[] = raw.map((r) => {
        const out: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(r)) out[normalize(k)] = v;
        return {
          name: String(out.name ?? out.full_name ?? "").trim(),
          roll_number: String(out.roll_number ?? out.roll_no ?? out.roll ?? "").trim(),
          department: String(out.department ?? "").trim(),
          branch: String(out.branch ?? "").trim(),
          year: (out.year ?? out.year_of_study ?? "") as string | number,
          section: String(out.section ?? "").trim(),
          bus: String(out.bus ?? out.bus_number ?? "").trim(),
          boarding_point: String(out.boarding_point ?? out.boarding_stop ?? "").trim(),
          phone: String(out.phone ?? "").trim(),
          email: String(out.email ?? "").trim(),
        };
      });

      const sum: Summary = { total: rows.length, inserted: 0, updated: 0, skipped: 0, errors: 0, errorDetails: [] };
      const seen = new Set<string>();

      for (let i = 0; i < rows.length; i++) {
        const r = rows[i];
        if (!r.roll_number) { sum.skipped++; sum.errorDetails.push({ row: i + 2, reason: "Missing roll number" }); continue; }
        if (seen.has(r.roll_number)) { sum.skipped++; sum.errorDetails.push({ row: i + 2, reason: `Duplicate roll ${r.roll_number} in file` }); continue; }
        seen.add(r.roll_number);

        const yearNum = typeof r.year === "number" ? r.year : parseInt(String(r.year || "0"), 10) || null;

        // Try to find existing profile by roll_no
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: existing } = await (supabase.from("profiles") as any)
          .select("id").eq("roll_no", r.roll_number).maybeSingle();

        const patch = {
          full_name: r.name || null,
          department: r.department || null,
          branch: r.branch || null,
          year_of_study: yearNum,
          section: r.section || null,
          phone: r.phone || null,
          email: r.email || null,
          academic_year_id: targetYear,
          student_status: "active",
        };

        if (existing) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { error } = await (supabase.from("profiles") as any).update(patch).eq("id", existing.id);
          if (error) { sum.errors++; sum.errorDetails.push({ row: i + 2, reason: error.message }); }
          else sum.updated++;
        } else {
          // Cannot create auth.users from client — record as error requiring signup
          sum.errors++;
          sum.errorDetails.push({ row: i + 2, reason: `Roll ${r.roll_number} has no matching account; ask student to sign up first` });
        }
      }

      setSummary(sum);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: userData } = await supabase.auth.getUser();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from("student_imports" as any) as any).insert({
        academic_year_id: targetYear,
        imported_by: userData.user?.id,
        total: sum.total, inserted: sum.inserted, updated: sum.updated, skipped: sum.skipped,
        errors: sum.errors, error_details: sum.errorDetails,
      });
      audit("students.bulk_import", { entityType: "profiles", details: { ...sum, errorDetails: undefined } });
      toast.success(`Import complete: ${sum.updated} updated, ${sum.errors} errors`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Import failed");
    } finally {
      setRunning(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Upload className="h-5 w-5" /> Bulk Import Students</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">Accepted columns: Name, Roll Number, Department, Branch, Year, Section, Bus, Boarding Point, Phone, Email. CSV / XLSX.</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <Label>Target academic year</Label>
              <Select value={targetYear} onValueChange={setTargetYear}>
                <SelectTrigger><SelectValue placeholder="Select year" /></SelectTrigger>
                <SelectContent>
                  {years.filter((y) => y.status !== "archived").map((y) => (
                    <SelectItem key={y.id} value={y.id}>{y.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-2">
              <Label>File</Label>
              <input
                ref={fileRef}
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleFile(f); }}
                className="block w-full text-sm border rounded-md p-2"
                disabled={running}
              />
            </div>
          </div>
          {running && <p className="text-sm flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Importing…</p>}
        </CardContent>
      </Card>

      {summary && (
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><FileSpreadsheet className="h-5 w-5" /> Import Summary</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-sm">
              <div><p className="text-muted-foreground">Total</p><p className="text-2xl font-semibold">{summary.total}</p></div>
              <div><p className="text-muted-foreground">Inserted</p><p className="text-2xl font-semibold">{summary.inserted}</p></div>
              <div><p className="text-muted-foreground">Updated</p><p className="text-2xl font-semibold">{summary.updated}</p></div>
              <div><p className="text-muted-foreground">Skipped</p><p className="text-2xl font-semibold">{summary.skipped}</p></div>
              <div><p className="text-muted-foreground">Errors</p><p className="text-2xl font-semibold">{summary.errors}</p></div>
            </div>
            {summary.errorDetails.length > 0 && (
              <div className="mt-4 max-h-64 overflow-auto text-xs">
                <table className="w-full">
                  <thead><tr className="text-left text-muted-foreground"><th className="p-1">Row</th><th className="p-1">Reason</th></tr></thead>
                  <tbody>{summary.errorDetails.map((e, i) => <tr key={i} className="border-t"><td className="p-1">{e.row}</td><td className="p-1">{e.reason}</td></tr>)}</tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}