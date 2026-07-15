"use client";

import * as React from "react";
import { useAppStore } from "@/store/use-app-store";
import type { Department, Student, Supervisor } from "@/lib/types";
import { DEPARTMENTS } from "@/lib/types";
import { PageHeader } from "@/components/portal/layout/page-header";
import { SectionCard } from "@/components/portal/shared/section-card";
import { ActionBar } from "@/components/portal/shared/action-bar";
import { Avatar } from "@/components/portal/shared/avatar";
import { Badge } from "@/components/portal/shared/badges";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Download,
  FileSpreadsheet,
  Upload,
  UserPlus,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { exportToCsv } from "@/lib/csv-export";

// ============================================================
// Types
// ============================================================

type ParsedRole = "student" | "supervisor";

interface ParsedRow {
  /** 1-based line number for display. */
  line: number;
  raw: string;
  role: ParsedRole | null;
  name: string;
  email: string;
  studentNumber: string;
  course: string;
  requiredHours: string;
  valid: boolean;
  issues: string[];
}

interface CreatedAccount {
  name: string;
  email: string;
  role: ParsedRole;
  idNumber: string;
  tempPassword: string;
  recordId: string;
}

// ============================================================
// Parse + validation helpers
// ============================================================

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function splitLine(line: string): string[] {
  // Tab-separated takes precedence (Excel default "copy as text" uses tabs).
  if (line.includes("\t")) {
    return line.split("\t").map((s) => s.trim().replace(/^"|"$/g, ""));
  }
  return line.split(",").map((s) => s.trim().replace(/^"|"$/g, ""));
}

function parseRole(raw: string): ParsedRole | null {
  const v = raw.trim().toLowerCase();
  if (v === "student" || v === "s") return "student";
  if (v === "supervisor" || v === "sup" || v === "company supervisor") return "supervisor";
  return null;
}

interface BuildContext {
  students: Student[];
  supervisors: Supervisor[];
}

/**
 * Parse the entire textarea into rows + run per-row validation including
 * intra-batch duplicate detection (same email / same studentNumber twice in
 * the same paste).
 */
function parseAndValidate(text: string, ctx: BuildContext): ParsedRow[] {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  // First pass — parse all rows so we can detect intra-batch duplicates.
  const parsed: ParsedRow[] = lines.map((line, idx) => {
    const parts = splitLine(line);
    const roleRaw = parts[0] ?? "";
    const role = parseRole(roleRaw);
    const name = parts[1] ?? "";
    const email = parts[2] ?? "";
    const studentNumber = parts[3] ?? "";
    const course = parts[4] ?? "";
    const requiredHours = parts[5] ?? "";
    return {
      line: idx + 1,
      raw: line,
      role,
      name,
      email,
      studentNumber,
      course,
      requiredHours,
      valid: false, // computed below
      issues: [],
    };
  });

  // Pre-compute email + studentNumber occurrences within the batch.
  const emailCounts = new Map<string, number>();
  const studentNumberCounts = new Map<string, number>();
  for (const r of parsed) {
    if (r.email) {
      const key = r.email.toLowerCase();
      emailCounts.set(key, (emailCounts.get(key) ?? 0) + 1);
    }
    if (r.role === "student" && r.studentNumber) {
      const key = r.studentNumber.trim().toLowerCase();
      studentNumberCounts.set(key, (studentNumberCounts.get(key) ?? 0) + 1);
    }
  }

  // Second pass — per-row validation.
  return parsed.map((r) => {
    const issues: string[] = [];

    if (!r.role) {
      issues.push("Unknown role (must be Student or Supervisor).");
    } else {
      if (!r.name) issues.push("Name is missing.");
      if (!r.email) issues.push("Email is missing.");
      else if (!EMAIL_RE.test(r.email)) issues.push("Invalid email format.");

      // Duplicate email checks (existing + intra-batch).
      if (r.email && EMAIL_RE.test(r.email)) {
        const emailLower = r.email.toLowerCase();
        const exists =
          ctx.students.some(
            (s) => s.email.trim().toLowerCase() === emailLower
          ) ||
          ctx.supervisors.some(
            (s) => s.email.trim().toLowerCase() === emailLower
          );
        if (exists) {
          issues.push("Email already exists in the system.");
        } else if ((emailCounts.get(emailLower) ?? 0) > 1) {
          issues.push("Email appears more than once in this batch.");
        }
      }

      if (r.role === "student") {
        if (!r.studentNumber) issues.push("Student number is missing.");
        if (!r.course) issues.push("Course is missing.");
        if (!r.requiredHours) issues.push("Required hours is missing.");
        else if (
          Number.isNaN(Number(r.requiredHours)) ||
          Number(r.requiredHours) <= 0
        ) {
          issues.push("Required hours must be a positive number.");
        }

        // Duplicate student number checks.
        if (r.studentNumber) {
          const key = r.studentNumber.trim().toLowerCase();
          const exists = ctx.students.some(
            (s) => s.studentNumber.trim().toLowerCase() === key
          );
          if (exists) {
            issues.push("Student number already exists.");
          } else if ((studentNumberCounts.get(key) ?? 0) > 1) {
            issues.push("Student number appears more than once in this batch.");
          }
        }
      }
    }

    return { ...r, issues, valid: issues.length === 0 };
  });
}

// ============================================================
// Component
// ============================================================

export function BulkCreateUsers() {
  const navigate = useAppStore((s) => s.navigate);
  const back = useAppStore((s) => s.back);
  const students = useAppStore((s) => s.students);
  const supervisors = useAppStore((s) => s.supervisors);
  const companies = useAppStore((s) => s.companies);
  const createStudent = useAppStore((s) => s.createStudent);
  const createSupervisor = useAppStore((s) => s.createSupervisor);

  // ---- shared state ----
  const [defaultCompanyId, setDefaultCompanyId] = React.useState<string>("");
  const [defaultDepartment, setDefaultDepartment] =
    React.useState<Department>("Other");
  const [phase, setPhase] = React.useState<"input" | "results">("input");
  const [created, setCreated] = React.useState<CreatedAccount[]>([]);
  const [creating, setCreating] = React.useState(false);

  // ---- manual entry state ----
  const [rawText, setRawText] = React.useState<string>(SAMPLE_TEXT);

  // ---- quick-add state ----
  const [qaRole, setQaRole] = React.useState<ParsedRole>("student");
  const [qaName, setQaName] = React.useState("");
  const [qaEmail, setQaEmail] = React.useState("");
  const [qaStudentNumber, setQaStudentNumber] = React.useState("");
  const [qaCourse, setQaCourse] = React.useState("BSIT");
  const [qaRequiredHours, setQaRequiredHours] = React.useState("300");
  const [qaErrors, setQaErrors] = React.useState<Record<string, string>>({});

  // Hydrate default company once companies are available.
  React.useEffect(() => {
    if (!defaultCompanyId && companies.length > 0) {
      setDefaultCompanyId(companies[0].id);
    }
  }, [companies, defaultCompanyId]);

  // ---- parse preview for manual entry ----
  const parsedRows = React.useMemo(
    () => parseAndValidate(rawText, { students, supervisors }),
    [rawText, students, supervisors]
  );
  const validCount = parsedRows.filter((r) => r.valid).length;
  const invalidCount = parsedRows.length - validCount;

  // ---- manual entry create ----
  const handleCreateBulk = async () => {
    if (!defaultCompanyId) {
      toast.error("Pick a default company first.", {
        description: "All bulk-created users are placed under one company.",
      });
      return;
    }
    const validRows = parsedRows.filter((r) => r.valid);
    if (validRows.length === 0) {
      toast.error("No valid rows to create.");
      return;
    }
    setCreating(true);
    try {
      const results: CreatedAccount[] = [];
      for (const row of validRows) {
        if (row.role === "student") {
          const res = createStudent({
            studentNumber: row.studentNumber.trim(),
            name: row.name.trim(),
            email: row.email.trim(),
            course: row.course.trim(),
            requiredHours: Number(row.requiredHours),
            companyId: defaultCompanyId,
            supervisorId: null,
            position: "Intern",
            department: defaultDepartment,
          });
          results.push({
            name: row.name.trim(),
            email: row.email.trim(),
            role: "student",
            idNumber: row.studentNumber.trim(),
            tempPassword: res.tempPassword,
            recordId: res.studentId,
          });
        } else if (row.role === "supervisor") {
          const res = createSupervisor({
            name: row.name.trim(),
            email: row.email.trim(),
            companyId: defaultCompanyId,
            title: "Supervisor",
            department: defaultDepartment,
          });
          results.push({
            name: row.name.trim(),
            email: row.email.trim(),
            role: "supervisor",
            idNumber: "—",
            tempPassword: res.tempPassword,
            recordId: res.supervisorId,
          });
        }
      }
      setCreated(results);
      setPhase("results");
      toast.success(`Created ${results.length} users`, {
        description: "Credentials are shown once — export them now.",
      });
    } finally {
      setCreating(false);
    }
  };

  // ---- quick-add validation + create ----
  const validateQuickAdd = () => {
    const next: Record<string, string> = {};
    if (!qaName.trim()) next.name = "Name is required.";
    if (!qaEmail.trim()) next.email = "Email is required.";
    else if (!EMAIL_RE.test(qaEmail)) next.email = "Enter a valid email.";
    if (!defaultCompanyId) next.companyId = "Pick a default company above.";

    // Duplicate email (against existing students + supervisors + already-created this session).
    const emailLower = qaEmail.trim().toLowerCase();
    if (emailLower && EMAIL_RE.test(qaEmail)) {
      const exists =
        students.some((s) => s.email.trim().toLowerCase() === emailLower) ||
        supervisors.some((s) => s.email.trim().toLowerCase() === emailLower) ||
        created.some((c) => c.email.toLowerCase() === emailLower);
      if (exists) next.email = next.email || "A user with this email already exists.";
    }

    if (qaRole === "student") {
      if (!qaStudentNumber.trim())
        next.studentNumber = "Student number is required.";
      else {
        const numLower = qaStudentNumber.trim().toLowerCase();
        const exists =
          students.some(
            (s) => s.studentNumber.trim().toLowerCase() === numLower
          ) || created.some((c) => c.idNumber.toLowerCase() === numLower);
        if (exists)
          next.studentNumber = next.studentNumber || "This student number already exists.";
      }
      if (!qaCourse.trim()) next.course = "Course is required.";
      if (
        !qaRequiredHours.trim() ||
        Number.isNaN(Number(qaRequiredHours)) ||
        Number(qaRequiredHours) <= 0
      ) {
        next.requiredHours = "Required hours must be a positive number.";
      }
    }

    setQaErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleQuickAddCreate = () => {
    if (!validateQuickAdd()) {
      toast.error("Please fix the highlighted fields.");
      return;
    }
    let result: CreatedAccount;
    if (qaRole === "student") {
      const res = createStudent({
        studentNumber: qaStudentNumber.trim(),
        name: qaName.trim(),
        email: qaEmail.trim(),
        course: qaCourse.trim(),
        requiredHours: Number(qaRequiredHours),
        companyId: defaultCompanyId,
        supervisorId: null,
        position: "Intern",
        department: defaultDepartment,
      });
      result = {
        name: qaName.trim(),
        email: qaEmail.trim(),
        role: "student",
        idNumber: qaStudentNumber.trim(),
        tempPassword: res.tempPassword,
        recordId: res.studentId,
      };
    } else {
      const res = createSupervisor({
        name: qaName.trim(),
        email: qaEmail.trim(),
        companyId: defaultCompanyId,
        title: "Supervisor",
        department: defaultDepartment,
      });
      result = {
        name: qaName.trim(),
        email: qaEmail.trim(),
        role: "supervisor",
        idNumber: "—",
        tempPassword: res.tempPassword,
        recordId: res.supervisorId,
      };
    }
    setCreated((prev) => [...prev, result]);
    toast.success(`${result.role === "student" ? "Student" : "Supervisor"} created`, {
      description: `${result.name} added. Temp password: ${result.tempPassword}`,
    });
    // Reset relevant fields, keep role + company for fast repeat entry.
    setQaName("");
    setQaEmail("");
    setQaStudentNumber("");
  };

  // ---- results phase export ----
  const handleExportCredentials = () => {
    const headers = [
      "Name",
      "Email",
      "Role",
      "ID Number",
      "Temp Password",
      "Login URL",
    ];
    const loginUrl =
      typeof window !== "undefined" ? `${window.location.origin}/` : "/";
    const data = created.map((c) => [
      c.name,
      c.email,
      c.role === "student" ? "Student" : "Supervisor",
      c.idNumber,
      c.tempPassword,
      loginUrl,
    ]);
    const stamp = new Date().toISOString().slice(0, 10);
    exportToCsv(`credentials-${stamp}.csv`, headers, data);
    toast.success("Credentials exported", {
      description: `${created.length} accounts in the CSV file.`,
    });
  };

  const handleDone = () => {
    navigate("coordinator.user-management");
  };

  const handleAddAnother = () => {
    setCreated([]);
    setPhase("input");
    setRawText("");
  };

  // ============================================================
  // Results phase
  // ============================================================
  if (phase === "results") {
    return (
      <div>
        <PageHeader
          title="Bulk Create Users"
          description={`${created.length} account${created.length === 1 ? "" : "s"} created. Copy these credentials now — they aren't shown again.`}
          breadcrumb="User Management"
          showBack
        />

        <SectionCard
          title="Created accounts"
          description="Hand each user their email + temporary password. They'll be asked to change it on first sign-in."
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportCredentials}
              >
                <Download className="h-4 w-4" />
                Export Credentials as CSV
              </Button>
            </div>
          }
        >
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead className="hidden sm:table-cell">Role</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead className="hidden md:table-cell">ID Number</TableHead>
                  <TableHead>Temp Password</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {created.map((c, i) => (
                  <TableRow key={`${c.recordId}-${i}`}>
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <Avatar name={c.name} size="sm" />
                        <span className="text-sm font-medium text-foreground">
                          {c.name}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <Badge tone={c.role === "student" ? "slate" : "teal"}>
                        {c.role === "student" ? "Student" : "Supervisor"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {c.email}
                    </TableCell>
                    <TableCell className="hidden font-mono text-sm text-muted-foreground md:table-cell">
                      {c.idNumber}
                    </TableCell>
                    <TableCell>
                      <span className="rounded-md bg-muted px-2 py-1 font-mono text-xs font-medium">
                        {c.tempPassword}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </SectionCard>

        <ActionBar>
          <Button variant="outline" onClick={handleAddAnother}>
            <UserPlus className="h-4 w-4" />
            Add More Users
          </Button>
          <Button onClick={handleDone}>Done</Button>
        </ActionBar>
      </div>
    );
  }

  // ============================================================
  // Input phase
  // ============================================================
  return (
    <div>
      <PageHeader
        title="Bulk Create Users"
        description="Create many student or supervisor accounts at once, then export their credentials."
        breadcrumb="User Management"
        showBack
        actions={
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("coordinator.user-management")}
            className="w-full sm:w-auto"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to User Management
          </Button>
        }
      />

      {/* Shared defaults */}
      <SectionCard
        title="Defaults"
        description="All bulk-created users are placed under this company + department. You can edit individual records afterwards."
        className="mb-4"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label className="mb-1.5 block">Default Company</Label>
            <Select
              value={defaultCompanyId}
              onValueChange={setDefaultCompanyId}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select company" />
              </SelectTrigger>
              <SelectContent>
                {companies.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="mb-1.5 block">Default Department</Label>
            <Select
              value={defaultDepartment}
              onValueChange={(v) => setDefaultDepartment(v as Department)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select department" />
              </SelectTrigger>
              <SelectContent>
                {DEPARTMENTS.map((d) => (
                  <SelectItem key={d} value={d}>
                    {d}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </SectionCard>

      <Tabs defaultValue="manual" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="manual">
            <Upload className="h-4 w-4" />
            Manual Entry
          </TabsTrigger>
          <TabsTrigger value="quick">
            <UserPlus className="h-4 w-4" />
            Quick Add
          </TabsTrigger>
        </TabsList>

        {/* ============== Mode A: Manual Entry ============== */}
        <TabsContent value="manual">
          <div className="space-y-4">
            <SectionCard
              title="Paste users"
              description="One user per line, comma- or tab-separated. First column is the role."
              actions={
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs text-muted-foreground"
                  onClick={() => setRawText(SAMPLE_TEXT)}
                >
                  Load sample
                </Button>
              }
            >
              <Textarea
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                rows={8}
                placeholder={SAMPLE_TEXT}
                className="font-mono text-xs"
              />
              <div className="mt-3 rounded-md bg-muted/60 p-3 text-xs text-muted-foreground">
                <p className="font-medium text-foreground">Format per line:</p>
                <ul className="mt-1 space-y-0.5">
                  <li>
                    <span className="font-mono">Student, Name, Email, StudentNumber, Course, RequiredHours</span>
                  </li>
                  <li>
                    <span className="font-mono">Supervisor, Name, Email</span>
                  </li>
                </ul>
              </div>
            </SectionCard>

            {/* Preview table */}
            <SectionCard
              noPadding
              contentClassName="p-0"
              title={`Preview (${parsedRows.length})`}
              description={`${validCount} valid · ${invalidCount} ${invalidCount === 1 ? "issue" : "issues"}`}
            >
              {parsedRows.length === 0 ? (
                <div className="p-6">
                  <div className="mx-auto max-w-sm text-center text-sm text-muted-foreground">
                    Paste rows above to see a validation preview.
                  </div>
                </div>
              ) : (
                <div className="max-h-96 overflow-y-auto">
                  <Table>
                    <TableHeader className="sticky top-0 z-10 bg-card">
                      <TableRow>
                        <TableHead className="w-10">#</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead className="hidden sm:table-cell">Email</TableHead>
                        <TableHead className="hidden md:table-cell">ID</TableHead>
                        <TableHead className="hidden md:table-cell">Course</TableHead>
                        <TableHead className="hidden lg:table-cell">Hours</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {parsedRows.map((r) => (
                        <TableRow
                          key={r.line}
                          className={r.valid ? "" : "bg-amber-50/40 dark:bg-amber-950/10"}
                        >
                          <TableCell className="text-xs tabular-nums text-muted-foreground">
                            {r.line}
                          </TableCell>
                          <TableCell>
                            {r.valid ? (
                              <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 dark:text-emerald-400">
                                <CheckCircle2 className="h-4 w-4" />
                                Valid
                              </span>
                            ) : (
                              <div className="flex flex-col gap-0.5">
                                {r.issues.map((issue, i) => (
                                  <span
                                    key={i}
                                    className="inline-flex items-start gap-1 text-xs font-medium text-amber-700 dark:text-amber-400"
                                  >
                                    <AlertCircle className="mt-0.5 h-3 w-3 shrink-0" />
                                    <span className="leading-tight">{issue}</span>
                                  </span>
                                ))}
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            {r.role ? (
                              <Badge tone={r.role === "student" ? "slate" : "teal"}>
                                {r.role === "student" ? "Student" : "Supervisor"}
                              </Badge>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell className="text-sm text-foreground">
                            {r.name || (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell className="hidden text-sm text-muted-foreground sm:table-cell">
                            {r.email || "—"}
                          </TableCell>
                          <TableCell className="hidden font-mono text-xs text-muted-foreground md:table-cell">
                            {r.studentNumber || "—"}
                          </TableCell>
                          <TableCell className="hidden text-sm text-muted-foreground md:table-cell">
                            {r.course || "—"}
                          </TableCell>
                          <TableCell className="hidden text-sm tabular-nums text-muted-foreground lg:table-cell">
                            {r.requiredHours || "—"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </SectionCard>

            <ActionBar>
              <Button variant="outline" onClick={back}>
                Cancel
              </Button>
              <Button
                onClick={handleCreateBulk}
                disabled={validCount === 0 || creating || !defaultCompanyId}
              >
                <Users className="h-4 w-4" />
                {creating
                  ? "Creating…"
                  : `Create ${validCount} ${validCount === 1 ? "User" : "Users"}`}
              </Button>
            </ActionBar>
          </div>
        </TabsContent>

        {/* ============== Mode B: Quick Add ============== */}
        <TabsContent value="quick">
          <div className="space-y-4">
            <SectionCard
              title="Quick add a single user"
              description="Add one account at a time. Created accounts appear below — export when you're done."
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label className="mb-1.5 block">Role</Label>
                  <Select
                    value={qaRole}
                    onValueChange={(v) => setQaRole(v as ParsedRole)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="student">Student</SelectItem>
                      <SelectItem value="supervisor">Supervisor</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="mb-1.5 block">Full Name</Label>
                  <Input
                    value={qaName}
                    onChange={(e) => setQaName(e.target.value)}
                    placeholder="Juan Dela Cruz"
                    aria-invalid={!!qaErrors.name}
                  />
                  {qaErrors.name && (
                    <p className="mt-1 flex items-center gap-1 text-xs text-destructive">
                      <AlertCircle className="h-3 w-3" />
                      {qaErrors.name}
                    </p>
                  )}
                </div>
                <div className="sm:col-span-2">
                  <Label className="mb-1.5 block">Email</Label>
                  <Input
                    type="email"
                    value={qaEmail}
                    onChange={(e) => setQaEmail(e.target.value)}
                    placeholder="juan.delacruz@university.edu"
                    aria-invalid={!!qaErrors.email}
                  />
                  {qaErrors.email && (
                    <p className="mt-1 flex items-center gap-1 text-xs text-destructive">
                      <AlertCircle className="h-3 w-3" />
                      {qaErrors.email}
                    </p>
                  )}
                </div>

                {qaRole === "student" && (
                  <>
                    <div>
                      <Label className="mb-1.5 block">Student Number</Label>
                      <Input
                        value={qaStudentNumber}
                        onChange={(e) => setQaStudentNumber(e.target.value)}
                        placeholder="2024-001"
                        className="font-mono"
                        aria-invalid={!!qaErrors.studentNumber}
                      />
                      {qaErrors.studentNumber && (
                        <p className="mt-1 flex items-center gap-1 text-xs text-destructive">
                          <AlertCircle className="h-3 w-3" />
                          {qaErrors.studentNumber}
                        </p>
                      )}
                    </div>
                    <div>
                      <Label className="mb-1.5 block">Course</Label>
                      <Select value={qaCourse} onValueChange={setQaCourse}>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {["BSIT", "BSCS", "BSIS"].map((c) => (
                            <SelectItem key={c} value={c}>
                              {c}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {qaErrors.course && (
                        <p className="mt-1 flex items-center gap-1 text-xs text-destructive">
                          <AlertCircle className="h-3 w-3" />
                          {qaErrors.course}
                        </p>
                      )}
                    </div>
                    <div>
                      <Label className="mb-1.5 block">Required Hours</Label>
                      <Input
                        type="number"
                        min={1}
                        value={qaRequiredHours}
                        onChange={(e) => setQaRequiredHours(e.target.value)}
                        aria-invalid={!!qaErrors.requiredHours}
                      />
                      {qaErrors.requiredHours && (
                        <p className="mt-1 flex items-center gap-1 text-xs text-destructive">
                          <AlertCircle className="h-3 w-3" />
                          {qaErrors.requiredHours}
                        </p>
                      )}
                    </div>
                  </>
                )}

                {qaErrors.companyId && (
                  <p className="sm:col-span-2 flex items-center gap-1 text-xs text-destructive">
                    <AlertCircle className="h-3 w-3" />
                    {qaErrors.companyId}
                  </p>
                )}
              </div>

              <div className="mt-4 flex justify-end">
                <Button onClick={handleQuickAddCreate}>
                  <UserPlus className="h-4 w-4" />
                  Create User
                </Button>
              </div>
            </SectionCard>

            {/* Already created this session */}
            {created.length > 0 && (
              <SectionCard
                title={`Created this session (${created.length})`}
                description="Export all credentials as a CSV when you're done adding."
                actions={
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPhase("results")}
                  >
                    <FileSpreadsheet className="h-4 w-4" />
                    Review & Export
                  </Button>
                }
              >
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead className="hidden sm:table-cell">Role</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Temp Password</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {created.map((c, i) => (
                        <TableRow key={`${c.recordId}-${i}`}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Avatar name={c.name} size="xs" />
                              <span className="text-sm font-medium text-foreground">
                                {c.name}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="hidden sm:table-cell">
                            <Badge tone={c.role === "student" ? "slate" : "teal"}>
                              {c.role === "student" ? "Student" : "Supervisor"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {c.email}
                          </TableCell>
                          <TableCell>
                            <span className="rounded-md bg-muted px-2 py-1 font-mono text-xs font-medium">
                              {c.tempPassword}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </SectionCard>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Sample text shown by default + via "Load sample" button.
const SAMPLE_TEXT = `Student, Juan Dela Cruz, juan@example.com, 2024-001, BSIT, 300
Student, Maria Santos, maria@example.com, 2024-002, BSCS, 300
Supervisor, Carlos Reyes, carlos@company.com, , ,`;
