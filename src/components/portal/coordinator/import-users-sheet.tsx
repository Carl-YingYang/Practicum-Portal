"use client";

import * as React from "react";
import { useAppStore } from "@/store/use-app-store";
import { SlideOver } from "@/components/portal/shared/slide-over";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/portal/shared/badges";
import { toast } from "sonner";
import {
  Upload,
  FileSpreadsheet,
  Download,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Loader2,
  RotateCcw,
  FileDown,
} from "lucide-react";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import type { Student, Supervisor } from "@/lib/types";

interface ImportUsersSheetProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

// ============================================================
// Types
// ============================================================

type RowRole = "student" | "supervisor";

interface ParsedRow {
  rowIndex: number; // 1-based, matching the spreadsheet row
  role: RowRole | null;
  name: string;
  email: string;
  studentNumber: string;
  course: string;
  requiredHours: string;
  companyName: string;
  supervisorRef: string; // name or email — matched to existing supervisors
  title: string; // supervisors only
  department: string;
  // Validation
  errors: string[];
  status: "valid" | "invalid";
}

interface CreatedRecord {
  name: string;
  email: string;
  role: RowRole;
  idNumber: string; // the password (studentNumber / EMP-XXX)
  tempPassword: string;
  recordId: string;
  supervisorAssigned: string | null;
}

// ============================================================
// Template download — generates an .xlsx with the expected
// columns + a sample row so coordinators know the format.
// ============================================================

function downloadTemplate() {
  const headers = [
    "Role",
    "Name",
    "Email",
    "StudentNumber",
    "Course",
    "RequiredHours",
    "Company",
    "Supervisor",
    "Title",
    "Department",
  ];
  const sample = [
    [
      "student",
      "Juan Dela Cruz",
      "juan.delacruz@university.edu",
      "2021-00123",
      "BSIT",
      "300",
      "Acme Corp",
      "Maria Santos",
      "",
      "",
    ],
    [
      "supervisor",
      "Maria Santos",
      "maria.santos@acme.com",
      "",
      "",
      "",
      "Acme Corp",
      "",
      "Senior Engineer",
      "Engineering",
    ],
    [
      "student",
      "Ana Reyes",
      "ana.reyes@university.edu",
      "2021-00124",
      "BSCS",
      "300",
      "Globex",
      "James Cruz",
      "",
      "",
    ],
  ];
  const ws = XLSX.utils.aoa_to_sheet([headers, ...sample]);
  // Set reasonable column widths.
  ws["!cols"] = [
    { wch: 12 },
    { wch: 22 },
    { wch: 30 },
    { wch: 16 },
    { wch: 10 },
    { wch: 14 },
    { wch: 18 },
    { wch: 20 },
    { wch: 22 },
    { wch: 16 },
  ];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Users");
  XLSX.writeFile(wb, "users-import-template.xlsx");
  toast.success("Template downloaded", {
    description: "Fill it in and re-upload to import users.",
  });
}

// ============================================================
// File parsing — reads .xlsx, .xls, or .csv into ParsedRow[]
// ============================================================

async function parseFile(file: File): Promise<ParsedRow[]> {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array" });
  const ws = wb.Sheets[wb.SheetNames[0]];
  if (!ws) return [];
  // header: 1 → array of arrays; defval → keep empty cells as "".
  const rows = XLSX.utils.sheet_to_json<string[]>(ws, {
    header: 1,
    defval: "",
    blankrows: false,
  });
  if (rows.length < 2) return [];
  // Normalize header keys (case-insensitive, strip spaces).
  const header = (rows[0] as string[]).map((h) =>
    String(h ?? "").trim().toLowerCase().replace(/\s+/g, "")
  );
  const idx = (key: string) => header.indexOf(key);
  const get = (row: string[], key: string) => {
    const i = idx(key);
    return i >= 0 ? String(row[i] ?? "").trim() : "";
  };
  const out: ParsedRow[] = [];
  for (let r = 1; r < rows.length; r++) {
    const row = rows[r] as string[];
    if (!row || row.every((c) => !String(c ?? "").trim())) continue;
    const roleRaw = get(row, "role").toLowerCase();
    const role: RowRole | null =
      roleRaw === "student" || roleRaw === "s"
        ? "student"
        : roleRaw === "supervisor" || roleRaw === "sup"
        ? "supervisor"
        : null;
    out.push({
      rowIndex: r + 1,
      role,
      name: get(row, "name"),
      email: get(row, "email"),
      studentNumber: get(row, "studentnumber"),
      course: get(row, "course"),
      requiredHours: get(row, "requiredhours"),
      companyName: get(row, "company"),
      supervisorRef: get(row, "supervisor"),
      title: get(row, "title"),
      department: get(row, "department"),
      errors: [],
      status: "valid",
    });
  }
  return out;
}

// ============================================================
// Validation — fills in errors + status per row
// ============================================================

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateRows(
  rows: ParsedRow[],
  existingStudents: Student[],
  existingSupervisors: Supervisor[]
): ParsedRow[] {
  const studentEmails = new Set(
    existingStudents.map((s) => s.email.toLowerCase())
  );
  const supervisorEmails = new Set(
    existingSupervisors.map((s) => s.email.toLowerCase())
  );
  const studentNumbers = new Set(
    existingStudents.map((s) => s.studentNumber.toLowerCase())
  );
  // Track emails/numbers seen within this batch too.
  const batchEmails = new Set<string>();
  const batchStudentNumbers = new Set<string>();

  return rows.map((row) => {
    const errors: string[] = [];
    if (!row.role) errors.push("Role must be 'student' or 'supervisor'");
    if (!row.name) errors.push("Name is required");
    if (!row.email) errors.push("Email is required");
    else if (!EMAIL_RE.test(row.email)) errors.push("Invalid email format");
    else if (
      studentEmails.has(row.email.toLowerCase()) ||
      supervisorEmails.has(row.email.toLowerCase())
    )
      errors.push("Email already exists in the portal");
    else if (batchEmails.has(row.email.toLowerCase()))
      errors.push("Duplicate email in this batch");
    else batchEmails.add(row.email.toLowerCase());

    if (row.role === "student") {
      if (!row.studentNumber) errors.push("StudentNumber is required");
      else if (studentNumbers.has(row.studentNumber.toLowerCase()))
        errors.push("StudentNumber already exists");
      else if (batchStudentNumbers.has(row.studentNumber.toLowerCase()))
        errors.push("Duplicate StudentNumber in this batch");
      else batchStudentNumbers.add(row.studentNumber.toLowerCase());
      if (!row.course) errors.push("Course is required");
      if (!row.requiredHours || isNaN(Number(row.requiredHours)))
        errors.push("RequiredHours must be a number");
      else if (Number(row.requiredHours) <= 0)
        errors.push("RequiredHours must be positive");
    }
    if (row.role === "supervisor") {
      if (!row.title) errors.push("Title is required for supervisors");
    }
    return {
      ...row,
      errors,
      status: errors.length === 0 ? "valid" : "invalid",
    } as ParsedRow;
  });
}

// ============================================================
// Helpers — match a company / supervisor by name or email
// ============================================================

function matchCompany(
  name: string,
  companies: { id: string; name: string }[]
): string | null {
  if (!name.trim()) return null;
  const lower = name.toLowerCase();
  const found = companies.find((c) => c.name.toLowerCase() === lower);
  if (found) return found.id;
  // Partial match fallback.
  const partial = companies.find((c) =>
    c.name.toLowerCase().includes(lower)
  );
  return partial?.id ?? null;
}

function matchSupervisor(
  ref: string,
  supervisors: Supervisor[]
): string | null {
  if (!ref.trim()) return null;
  const lower = ref.toLowerCase();
  const byEmail = supervisors.find(
    (s) => s.email.toLowerCase() === lower
  );
  if (byEmail) return byEmail.id;
  const byName = supervisors.find((s) => s.name.toLowerCase() === lower);
  if (byName) return byName.id;
  const partial = supervisors.find((s) =>
    s.name.toLowerCase().includes(lower)
  );
  return partial?.id ?? null;
}

// ============================================================
// Results export — .xlsx of created accounts with passwords
// ============================================================

function exportResults(records: CreatedRecord[]) {
  const headers = [
    "Name",
    "Email",
    "Role",
    "User ID (Password)",
    "Temp Password",
    "Supervisor Assigned",
    "Record ID",
  ];
  const data = records.map((r) => [
    r.name,
    r.email,
    r.role,
    r.idNumber,
    r.tempPassword,
    r.supervisorAssigned ?? "",
    r.recordId,
  ]);
  const ws = XLSX.utils.aoa_to_sheet([headers, ...data]);
  ws["!cols"] = [
    { wch: 22 },
    { wch: 30 },
    { wch: 12 },
    { wch: 20 },
    { wch: 16 },
    { wch: 22 },
    { wch: 14 },
  ];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Created Users");
  const out = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  saveAs(
    new Blob([out], { type: "application/octet-stream" }),
    `imported-users-${new Date().toISOString().slice(0, 10)}.xlsx`
  );
  toast.success("Results exported", {
    description: `${records.length} account${records.length === 1 ? "" : "s"} saved to Excel.`,
  });
}

// ============================================================
// Component
// ============================================================

export function ImportUsersSheet({ open, onOpenChange }: ImportUsersSheetProps) {
  const students = useAppStore((s) => s.students);
  const supervisors = useAppStore((s) => s.supervisors);
  const companies = useAppStore((s) => s.companies);
  const createStudent = useAppStore((s) => s.createStudent);
  const createSupervisor = useAppStore((s) => s.createSupervisor);

  const [phase, setPhase] = React.useState<"input" | "creating" | "results">(
    "input"
  );
  const [rows, setRows] = React.useState<ParsedRow[]>([]);
  const [fileName, setFileName] = React.useState<string>("");
  const [error, setError] = React.useState<string>("");
  const [created, setCreated] = React.useState<CreatedRecord[]>([]);
  const [dragOver, setDragOver] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Reset state whenever the sheet is closed.
  React.useEffect(() => {
    if (!open) {
      // Slight delay so the close animation isn't interrupted.
      const t = setTimeout(() => {
        setRows([]);
        setFileName("");
        setError("");
        setCreated([]);
        setPhase("input");
      }, 200);
      return () => clearTimeout(t);
    }
  }, [open]);

  const validRows = rows.filter((r) => r.status === "valid");
  const invalidRows = rows.filter((r) => r.status === "invalid");
  const studentCount = validRows.filter((r) => r.role === "student").length;
  const supervisorCount = validRows.filter((r) => r.role === "supervisor").length;

  const handleFile = async (file: File) => {
    setError("");
    setFileName(file.name);
    try {
      const parsed = await parseFile(file);
      if (parsed.length === 0) {
        setError("The file is empty or has no data rows.");
        setRows([]);
        return;
      }
      const validated = validateRows(parsed, students, supervisors);
      setRows(validated);
      toast.success(`Parsed ${validated.length} row${validated.length === 1 ? "" : "s"}`, {
        description: `${validated.filter((r) => r.status === "valid").length} valid, ${validated.filter((r) => r.status === "invalid").length} need attention`,
      });
    } catch (e) {
      console.error(e);
      setError("Could not read the file. Make sure it's a valid .xlsx or .csv.");
      setRows([]);
    }
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) void handleFile(f);
    // reset value so picking the same file again re-triggers
    e.target.value = "";
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) void handleFile(f);
  };

  const handleCreate = () => {
    setPhase("creating");
    // Defer to next tick so the loading state paints before the (synchronous) work.
    setTimeout(() => {
      const results: CreatedRecord[] = [];
      // First pass: create supervisors so we can match them by name when
      // creating students in the second pass.
      const updatedSupervisors = [...supervisors];
      for (const row of validRows) {
        if (row.role !== "supervisor") continue;
        const companyId =
          matchCompany(row.companyName, companies) ?? companies[0]?.id ?? "";
        const result = createSupervisor({
          name: row.name,
          email: row.email,
          companyId,
          title: row.title || "Supervisor",
          department: (row.department as Supervisor["department"]) || "Other",
          capacity: 5,
        });
        // Read back the freshly-created supervisor to capture the auto-generated idNumber.
        const created2 = useAppStore.getState().supervisors.find(
          (s) => s.id === result.supervisorId
        );
        updatedSupervisors.push(created2!);
        results.push({
          name: row.name,
          email: row.email,
          role: "supervisor",
          idNumber: result.idNumber,
          tempPassword: result.tempPassword,
          recordId: result.supervisorId,
          supervisorAssigned: null,
        });
      }
      // Second pass: create students, resolving the supervisor reference.
      for (const row of validRows) {
        if (row.role !== "student") continue;
        const companyId =
          matchCompany(row.companyName, companies) ?? companies[0]?.id ?? "";
        const supervisorId = matchSupervisor(row.supervisorRef, updatedSupervisors);
        const result = createStudent({
          studentNumber: row.studentNumber,
          name: row.name,
          email: row.email,
          course: row.course,
          requiredHours: Number(row.requiredHours) || 300,
          companyId,
          supervisorId,
          position: "Intern",
          department: "Other",
        });
        const sup = supervisorId
          ? updatedSupervisors.find((s) => s.id === supervisorId)
          : null;
        results.push({
          name: row.name,
          email: row.email,
          role: "student",
          idNumber: result.idNumber,
          tempPassword: result.tempPassword,
          recordId: result.studentId,
          supervisorAssigned: sup?.name ?? null,
        });
      }
      setCreated(results);
      setPhase("results");
      toast.success(`Imported ${results.length} user${results.length === 1 ? "" : "s"}`, {
        description: "Passwords are shown once — export them now to share.",
      });
    }, 50);
  };

  const handleReset = () => {
    setRows([]);
    setFileName("");
    setError("");
    setCreated([]);
    setPhase("input");
  };

  // ============================================================
  // Render
  // ============================================================

  return (
    <SlideOver
      open={open}
      onOpenChange={onOpenChange}
      width="wide"
      title="Import users from Excel"
      description="Bulk-create students and supervisors. Match a Supervisor column to auto-assign."
      eyebrow="Bulk import"
      footer={
        phase === "input" && rows.length > 0 ? (
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-muted-foreground">
              <span className="font-semibold text-foreground">{validRows.length}</span> ready
              {invalidRows.length > 0 && (
                <>
                  {" · "}
                  <span className="font-semibold text-destructive">{invalidRows.length}</span> invalid
                </>
              )}
            </p>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleReset}>
                <RotateCcw className="h-3.5 w-3.5" />
                Reset
              </Button>
              <Button
                size="sm"
                onClick={handleCreate}
                disabled={validRows.length === 0}
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                Create {validRows.length} user{validRows.length === 1 ? "" : "s"}
              </Button>
            </div>
          </div>
        ) : phase === "results" ? (
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-muted-foreground">
              <span className="font-semibold text-emerald-600">{created.length}</span> account
              {created.length === 1 ? "" : "s"} created. Export the passwords now — they won&apos;t be shown again.
            </p>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleReset}>
                <Upload className="h-3.5 w-3.5" />
                Import more
              </Button>
              <Button size="sm" onClick={() => exportResults(created)}>
                <FileDown className="h-3.5 w-3.5" />
                Export results
              </Button>
            </div>
          </div>
        ) : null
      }
    >
      {phase === "creating" ? (
        <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm font-medium">Creating accounts…</p>
          <p className="text-xs text-muted-foreground">
            Importing {validRows.length} user{validRows.length === 1 ? "" : "s"} into the portal.
          </p>
        </div>
      ) : phase === "results" ? (
        <ResultsView records={created} />
      ) : rows.length === 0 ? (
        // ---- Empty state: file picker ----
        <div className="space-y-5">
          <div className="flex items-center justify-between rounded-lg border border-dashed border-border/80 bg-muted/20 p-3">
            <div className="min-w-0">
              <p className="text-sm font-semibold">Step 1 · Download the template</p>
              <p className="text-xs text-muted-foreground">
                Get the .xlsx with the right columns + a sample row.
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={downloadTemplate}>
              <FileSpreadsheet className="h-3.5 w-3.5" />
              Template
            </Button>
          </div>

          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            className={`
              relative flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-6 py-12 text-center transition-colors
              ${
                dragOver
                  ? "border-primary bg-primary/5"
                  : "border-border/80 bg-muted/20 hover:border-border hover:bg-muted/40"
              }
            `}
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <Upload className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold">
                Drop your .xlsx or .csv here
              </p>
              <p className="text-xs text-muted-foreground">
                or click to browse · max 1 sheet
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="h-3.5 w-3.5" />
              Choose file
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={onFileChange}
            />
          </div>

          {error && (
            <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="rounded-lg border border-border/60 bg-card p-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Expected columns
            </p>
            <div className="flex flex-wrap gap-1.5">
              {[
                "Role",
                "Name",
                "Email",
                "StudentNumber",
                "Course",
                "RequiredHours",
                "Company",
                "Supervisor",
                "Title",
                "Department",
              ].map((h) => (
                <span
                  key={h}
                  className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10.5px] text-foreground/80"
                >
                  {h}
                </span>
              ))}
            </div>
            <ul className="mt-3 space-y-1 text-xs text-muted-foreground">
              <li>
                • <span className="font-medium text-foreground">Role</span> must be{" "}
                <code className="rounded bg-muted px-1">student</code> or{" "}
                <code className="rounded bg-muted px-1">supervisor</code>.
              </li>
              <li>
                • <span className="font-medium text-foreground">Supervisor</span> (students only) — name or email of an existing supervisor. Matched case-insensitively.
              </li>
              <li>
                • Students sign in with their{" "}
                <span className="font-medium text-foreground">StudentNumber</span> as the password; supervisors get an auto-generated{" "}
                <span className="font-medium text-foreground">EMP-XXX</span>.
              </li>
            </ul>
          </div>
        </div>
      ) : (
        // ---- Preview table ----
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-sm">
              <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">{fileName}</span>
              <span className="text-muted-foreground">· {rows.length} row{rows.length === 1 ? "" : "s"}</span>
            </div>
            <Button variant="ghost" size="sm" onClick={handleReset}>
              <RotateCcw className="h-3.5 w-3.5" />
              Use a different file
            </Button>
          </div>

          {/* Summary chips */}
          <div className="flex flex-wrap gap-2">
            <Badge tone="emerald">
              <CheckCircle2 className="h-3 w-3" />
              {validRows.length} valid
            </Badge>
            {invalidRows.length > 0 && (
              <Badge tone="amber">
                <AlertCircle className="h-3 w-3" />
                {invalidRows.length} need attention
              </Badge>
            )}
            <Badge tone="teal">{studentCount} students</Badge>
            <Badge tone="slate">{supervisorCount} supervisors</Badge>
          </div>

          {/* Rows table — scrollable, max height to prevent overflow */}
          <div className="max-h-[55vh] overflow-auto rounded-md border border-border/60">
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10 bg-muted/80 backdrop-blur">
                <tr className="text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                  <th className="px-2.5 py-2 font-semibold">#</th>
                  <th className="px-2.5 py-2 font-semibold">Status</th>
                  <th className="px-2.5 py-2 font-semibold">Role</th>
                  <th className="px-2.5 py-2 font-semibold">Name</th>
                  <th className="px-2.5 py-2 font-semibold">Email</th>
                  <th className="px-2.5 py-2 font-semibold">ID Number</th>
                  <th className="px-2.5 py-2 font-semibold">Course / Title</th>
                  <th className="px-2.5 py-2 font-semibold">Supervisor</th>
                  <th className="px-2.5 py-2 font-semibold">Issues</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {rows.map((row) => (
                  <tr
                    key={row.rowIndex}
                    className={
                      row.status === "invalid"
                        ? "bg-destructive/[0.03]"
                        : "hover:bg-muted/30"
                    }
                  >
                    <td className="px-2.5 py-2 text-xs text-muted-foreground tabular-nums">
                      {row.rowIndex}
                    </td>
                    <td className="px-2.5 py-2">
                      {row.status === "valid" ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      ) : (
                        <XCircle className="h-4 w-4 text-destructive" />
                      )}
                    </td>
                    <td className="px-2.5 py-2">
                      <span className="text-xs capitalize">{row.role ?? "—"}</span>
                    </td>
                    <td className="px-2.5 py-2 font-medium">{row.name || "—"}</td>
                    <td className="px-2.5 py-2 text-xs text-muted-foreground">
                      {row.email || "—"}
                    </td>
                    <td className="px-2.5 py-2 text-xs font-mono">
                      {row.role === "student" ? row.studentNumber : "auto"}
                    </td>
                    <td className="px-2.5 py-2 text-xs text-muted-foreground">
                      {row.role === "student" ? row.course : row.title || "—"}
                    </td>
                    <td className="px-2.5 py-2 text-xs text-muted-foreground">
                      {row.supervisorRef || "—"}
                    </td>
                    <td className="px-2.5 py-2 text-xs text-destructive">
                      {row.errors.length > 0 ? (
                        <ul className="list-disc space-y-0.5 pl-3">
                          {row.errors.map((e, i) => (
                            <li key={i}>{e}</li>
                          ))}
                        </ul>
                      ) : (
                        <span className="text-emerald-600">OK</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </SlideOver>
  );
}

// ============================================================
// Results view — table of created accounts with one-time passwords
// ============================================================

function ResultsView({ records }: { records: CreatedRecord[] }) {
  return (
    <div className="space-y-4">
      <div className="flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/5 p-3 text-xs text-amber-900 dark:text-amber-200">
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
        <div>
          <p className="font-semibold">Copy these credentials now.</p>
          <p className="mt-0.5 opacity-90">
            The User ID column is each user&apos;s login password. The temp password is a backup
            code. Export to Excel to share with users.
          </p>
        </div>
      </div>

      <div className="max-h-[60vh] overflow-auto rounded-md border border-border/60">
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10 bg-muted/80 backdrop-blur">
            <tr className="text-left text-[11px] uppercase tracking-wide text-muted-foreground">
              <th className="px-3 py-2 font-semibold">Name</th>
              <th className="px-3 py-2 font-semibold">Email</th>
              <th className="px-3 py-2 font-semibold">Role</th>
              <th className="px-3 py-2 font-semibold">User ID (Password)</th>
              <th className="px-3 py-2 font-semibold">Temp Password</th>
              <th className="px-3 py-2 font-semibold">Supervisor</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {records.map((r, i) => (
              <tr key={i} className="hover:bg-muted/30">
                <td className="px-3 py-2 font-medium">{r.name}</td>
                <td className="px-3 py-2 text-xs text-muted-foreground">{r.email}</td>
                <td className="px-3 py-2 text-xs capitalize">{r.role}</td>
                <td className="px-3 py-2 font-mono text-xs font-semibold text-foreground">
                  {r.idNumber}
                </td>
                <td className="px-3 py-2 font-mono text-xs text-muted-foreground">
                  {r.tempPassword}
                </td>
                <td className="px-3 py-2 text-xs text-muted-foreground">
                  {r.supervisorAssigned ?? "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
