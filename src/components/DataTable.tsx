import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowUpDown, ChevronLeft, ChevronRight, Download, FileText, Inbox, Printer, Search } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { audit } from "@/lib/audit";

export type Column<T> = {
  key: string;
  header: string;
  accessor: (row: T) => React.ReactNode;
  sortValue?: (row: T) => string | number;
  csv?: (row: T) => string | number;
  className?: string;
};

export function DataTable<T>({
  rows,
  columns,
  searchable = true,
  searchKeys,
  pageSize = 10,
  csvFilename,
  emptyMessage = "No records yet.",
  loading = false,
  filters,
  pdfTitle,
  exportFormats = ["csv", "excel", "pdf", "print"],
}: {
  rows: T[];
  columns: Column<T>[];
  searchable?: boolean;
  searchKeys?: (row: T) => string;
  pageSize?: number;
  csvFilename?: string;
  emptyMessage?: string;
  loading?: boolean;
  filters?: React.ReactNode;
  pdfTitle?: string;
  exportFormats?: Array<"csv" | "excel" | "pdf" | "print">;
}) {
  const [q, setQ] = useState("");
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(0);

  const filtered = useMemo(() => {
    if (!q.trim() || !searchable) return rows;
    const needle = q.trim().toLowerCase();
    return rows.filter((r) => (searchKeys ? searchKeys(r) : JSON.stringify(r)).toLowerCase().includes(needle));
  }, [rows, q, searchable, searchKeys]);

  const sorted = useMemo(() => {
    if (!sortKey) return filtered;
    const col = columns.find((c) => c.key === sortKey);
    if (!col?.sortValue) return filtered;
    const copy = [...filtered];
    copy.sort((a, b) => {
      const av = col.sortValue!(a);
      const bv = col.sortValue!(b);
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
    return copy;
  }, [filtered, sortKey, sortDir, columns]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const clampedPage = Math.min(page, totalPages - 1);
  const pageRows = sorted.slice(clampedPage * pageSize, clampedPage * pageSize + pageSize);

  function toggleSort(k: string) {
    if (sortKey === k) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else {
      setSortKey(k);
      setSortDir("asc");
    }
  }

  function exportCsv() {
    const header = columns.map((c) => `"${c.header.replace(/"/g, '""')}"`).join(",");
    const body = sorted
      .map((r) =>
        columns
          .map((c) => {
            const v = c.csv ? c.csv(r) : (c.sortValue ? c.sortValue(r) : "");
            return `"${String(v).replace(/"/g, '""')}"`;
          })
          .join(","),
      )
      .join("\n");
    const blob = new Blob([header + "\n" + body], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = (csvFilename ?? "export") + ".csv";
    a.click();
    URL.revokeObjectURL(url);
    audit("report.export", { entityType: "export", entityId: csvFilename, details: { format: "csv", rows: sorted.length, title: pdfTitle ?? csvFilename } });
  }

  function exportableColumns() {
    return columns.filter((c) => c.csv || c.sortValue);
  }

  function exportExcel() {
    const exportCols = exportableColumns();
    const header = exportCols.map((c) => c.header);
    const body = sorted.map((r) =>
      exportCols.map((c) => (c.csv ? c.csv(r) : c.sortValue ? c.sortValue(r) : "")),
    );
    const aoa = [header, ...body];
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    // Auto column widths
    ws["!cols"] = header.map((_, idx) => ({
      wch: Math.min(
        40,
        Math.max(
          10,
          ...aoa.map((row) => String(row[idx] ?? "").length + 2),
        ),
      ),
    }));
    const wb = XLSX.utils.book_new();
    const sheetName = (pdfTitle ?? csvFilename ?? "Export").slice(0, 31);
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    XLSX.writeFile(wb, (csvFilename ?? "export") + ".xlsx");
    audit("report.export", { entityType: "export", entityId: csvFilename, details: { format: "xlsx", rows: sorted.length, title: pdfTitle ?? csvFilename } });
  }

  function exportPdf() {
    const exportCols = exportableColumns();
    const doc = new jsPDF({ orientation: "landscape" });
    doc.setFontSize(14);
    doc.text(pdfTitle ?? csvFilename ?? "Export", 14, 14);
    doc.setFontSize(9);
    doc.text(`Generated ${new Date().toLocaleString()} · ${sorted.length} rows`, 14, 20);
    autoTable(doc, {
      startY: 26,
      head: [exportCols.map((c) => c.header)],
      body: sorted.map((r) =>
        exportCols.map((c) => String(c.csv ? c.csv(r) : c.sortValue ? c.sortValue(r) : "")),
      ),
      styles: { fontSize: 9, cellPadding: 3 },
      headStyles: { fillColor: [30, 58, 138] },
    });
    doc.save((csvFilename ?? "export") + ".pdf");
    audit("report.export", { entityType: "export", entityId: csvFilename, details: { format: "pdf", rows: sorted.length, title: pdfTitle ?? csvFilename } });
  }

  function printTable() {
    const exportCols = exportableColumns();
    const w = window.open("", "_blank", "width=900,height=700");
    if (!w) return;
    const title = pdfTitle ?? csvFilename ?? "Export";
    const head = exportCols.map((c) => `<th style="text-align:left;padding:6px 8px;border-bottom:2px solid #333;background:#f3f4f6">${c.header}</th>`).join("");
    const body = sorted
      .map(
        (r) =>
          `<tr>${exportCols
            .map((c) => `<td style="padding:6px 8px;border-bottom:1px solid #e5e7eb">${String(c.csv ? c.csv(r) : c.sortValue ? c.sortValue(r) : "")}</td>`)
            .join("")}</tr>`,
      )
      .join("");
    w.document.write(`<html><head><title>${title}</title></head><body style="font-family:system-ui,sans-serif;padding:24px">
      <h2 style="margin:0 0 4px">${title}</h2>
      <div style="color:#666;font-size:12px;margin-bottom:16px">Generated ${new Date().toLocaleString()} · ${sorted.length} rows</div>
      <table style="width:100%;border-collapse:collapse;font-size:12px"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>
      <script>window.onload=()=>{window.print();}</script>
    </body></html>`);
    w.document.close();
    audit("report.export", { entityType: "export", entityId: csvFilename, details: { format: "print", rows: sorted.length, title: pdfTitle ?? csvFilename } });
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {searchable && (
          <div className="relative min-w-0 flex-1 sm:max-w-xs">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search…"
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(0);
              }}
              className="pl-8"
            />
          </div>
        )}
        {filters && <div className="flex flex-wrap items-center gap-2">{filters}</div>}
        <div className="ml-auto flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            {sorted.length} {sorted.length === 1 ? "row" : "rows"}
          </span>
          {csvFilename && exportFormats.includes("csv") && (
            <Button variant="outline" size="sm" onClick={exportCsv} disabled={sorted.length === 0}>
              <Download className="mr-1.5 h-3.5 w-3.5" /> Export CSV
            </Button>
          )}
          {csvFilename && exportFormats.includes("excel") && (
            <Button variant="outline" size="sm" onClick={exportExcel} disabled={sorted.length === 0}>
              <FileSpreadsheet className="mr-1.5 h-3.5 w-3.5" /> Excel
            </Button>
          )}
          {exportFormats.includes("pdf") && (
            <Button variant="outline" size="sm" onClick={exportPdf} disabled={sorted.length === 0}>
              <FileText className="mr-1.5 h-3.5 w-3.5" /> PDF
            </Button>
          )}
          {exportFormats.includes("print") && (
            <Button variant="outline" size="sm" onClick={printTable} disabled={sorted.length === 0}>
              <Printer className="mr-1.5 h-3.5 w-3.5" /> Print
            </Button>
          )}
        </div>
      </div>
      <div className="rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40">
              {columns.map((c) => (
                <TableHead key={c.key} className={c.className}>
                  {c.sortValue ? (
                    <button
                      type="button"
                      onClick={() => toggleSort(c.key)}
                      className="inline-flex items-center gap-1 font-semibold hover:text-foreground"
                    >
                      {c.header}
                      <ArrowUpDown className="h-3 w-3 opacity-60" />
                    </button>
                  ) : (
                    c.header
                  )}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && (
              Array.from({ length: 4 }).map((_, i) => (
                <TableRow key={`sk-${i}`}>
                  {columns.map((c) => (
                    <TableCell key={c.key}><Skeleton className="h-4 w-24" /></TableCell>
                  ))}
                </TableRow>
              ))
            )}
            {!loading && pageRows.length === 0 && (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-40 text-center">
                  <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
                      <Inbox className="h-7 w-7 opacity-60" />
                    </div>
                    <div className="text-sm">{emptyMessage}</div>
                  </div>
                </TableCell>
              </TableRow>
            )}
            {!loading && pageRows.map((r, i) => (
              <TableRow key={i}>
                {columns.map((c) => (
                  <TableCell key={c.key} className={c.className}>
                    {c.accessor(r)}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            Page {clampedPage + 1} of {totalPages}
          </span>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="sm" onClick={() => setPage(Math.max(0, clampedPage - 1))} disabled={clampedPage === 0}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(Math.min(totalPages - 1, clampedPage + 1))}
              disabled={clampedPage >= totalPages - 1}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}