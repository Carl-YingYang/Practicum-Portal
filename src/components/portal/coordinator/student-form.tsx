"use client";

import * as React from "react";
import { useAppStore } from "@/store/use-app-store";
import {
  courseOptions,
  getStudent,
  schoolYearOptions,
  sectionOptions,
} from "@/lib/selectors";
import type { ViewParams, Department, WorkMode } from "@/lib/types";
import { DEPARTMENTS, WORK_MODE_LABELS } from "@/lib/types";
import { PageHeader } from "@/components/portal/layout/page-header";
import { SectionCard } from "@/components/portal/shared/section-card";
import { ActionBar } from "@/components/portal/shared/action-bar";
import { CredentialsDialog } from "@/components/portal/shared/credentials-dialog";
import { EmptyState } from "@/components/portal/shared/empty-state";
import { SupervisorPicker } from "@/components/portal/shared/supervisor-picker";
import { ComboInput } from "@/components/portal/shared/combo-input";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertCircle } from "lucide-react";
import { toast } from "sonner";

const UNASSIGNED = "__unassigned__";
const WORK_MODES: WorkMode[] = ["onsite", "hybrid", "remote"];

function genTempPassword(): string {
  return (
    "Tmp-" +
    Math.random().toString(36).slice(2, 6).toUpperCase() +
    Math.random().toString(36).slice(2, 6)
  );
}

/** Convert an ISO datetime string to a yyyy-MM-dd value for <input type=date>. */
function toDateInput(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export function StudentForm({ studentId }: { studentId?: ViewParams["studentId"] }) {
  const navigate = useAppStore((s) => s.navigate);
  const back = useAppStore((s) => s.back);
  const students = useAppStore((s) => s.students);
  const supervisors = useAppStore((s) => s.supervisors);
  const companies = useAppStore((s) => s.companies);
  const createStudent = useAppStore((s) => s.createStudent);
  const updateStudent = useAppStore((s) => s.updateStudent);
  const upsertCompany = useAppStore((s) => s.upsertCompany);

  const isEdit = !!studentId;
  const existing = React.useMemo(
    () => (studentId ? getStudent(students, studentId) : undefined),
    [students, studentId]
  );

  const [studentNumber, setStudentNumber] = React.useState("");
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [course, setCourse] = React.useState<string>("");
  const [section, setSection] = React.useState<string>("");
  const [schoolYear, setSchoolYear] = React.useState<string>("");
  const [requiredHours, setRequiredHours] = React.useState<string>("300");
  // Company is held as the typed NAME (free-text). On save we resolve it to
  // an id via upsertCompany (case-insensitive match or create).
  const [companyName, setCompanyName] = React.useState<string>("");
  const [position, setPosition] = React.useState("");
  const [department, setDepartment] = React.useState<Department | "">("");
  const [workMode, setWorkMode] = React.useState<WorkMode>("onsite");
  const [startDate, setStartDate] = React.useState("");
  const [endDate, setEndDate] = React.useState("");
  const [supervisorId, setSupervisorId] = React.useState<string | null>(null);
  const [tempPassword] = React.useState(() => genTempPassword());
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [credsOpen, setCredsOpen] = React.useState(false);
  const [createdCreds, setCreatedCreds] = React.useState<{
    name: string;
    email: string;
    tempPassword: string;
    studentId: string;
  } | null>(null);

  // Live option lists for the comboboxes (sourced from the roster so any
  // previously-typed value becomes an option next time).
  const courseOpts = React.useMemo(() => courseOptions(students), [students]);
  const sectionOpts = React.useMemo(() => sectionOptions(students), [students]);
  const schoolYearOpts = React.useMemo(
    () => schoolYearOptions([[...students], [...supervisors], [...companies]]),
    [students, supervisors, companies],
  );
  const companyOpts = React.useMemo(
    () => companies.map((c) => c.name).sort((a, b) => a.localeCompare(b)),
    [companies],
  );

  // Resolve the typed company name to an existing company id (case-insensitive)
  // so the SupervisorPicker can filter by company. A new (unsaved) company
  // name returns undefined — the picker just shows all supervisors in that case.
  const resolvedCompanyIdForPicker = React.useMemo(() => {
    const t = companyName.trim().toLowerCase();
    if (!t) return undefined;
    return companies.find((c) => c.name.trim().toLowerCase() === t)?.id;
  }, [companyName, companies]);

  // Hydrate form in edit mode
  React.useEffect(() => {
    if (existing) {
      setStudentNumber(existing.studentNumber);
      setName(existing.name);
      setEmail(existing.email);
      setCourse(existing.course);
      setSection(existing.section ?? "");
      setSchoolYear(existing.schoolYear ?? "");
      setRequiredHours(String(existing.requiredHours));
      const company = companies.find((c) => c.id === existing.companyId);
      setCompanyName(company?.name ?? "");
      setPosition(existing.position);
      setDepartment(existing.department);
      setWorkMode(existing.workMode);
      setStartDate(toDateInput(existing.startDate));
      setEndDate(toDateInput(existing.endDate));
      setSupervisorId(existing.supervisorId);
    }
  }, [existing, companies]);

  if (isEdit && !existing) {
    return (
      <div>
        <PageHeader title="Edit Student" showBack breadcrumb="Students" />
        <EmptyState
          icon={AlertCircle}
          title="Student not found"
          description="This student may have been removed."
          actionLabel="Back to students"
          onAction={() => navigate("coordinator.students")}
        />
      </div>
    );
  }

  const validate = () => {
    const next: Record<string, string> = {};
    if (!studentNumber.trim()) next.studentNumber = "Student number is required.";
    if (!name.trim()) next.name = "Name is required.";
    if (!email.trim()) next.email = "Email is required.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) next.email = "Enter a valid email.";
    if (!course) next.course = "Course is required.";
    if (!requiredHours.trim() || Number.isNaN(Number(requiredHours)) || Number(requiredHours) <= 0)
      next.requiredHours = "Required hours must be a positive number.";
    // NOTE: Company, Position, and Department are intentionally OPTIONAL here.
    // Students can be added to the masterlist before OJT deployment (bulk-upload
    // workflow). These fields are filled in later when the coordinator assigns
    // a placement. The state-driven workspace gates features on supervisorId.

    // Duplicate prevention (only on create — skip the record being edited).
    if (!isEdit) {
      const emailLower = email.trim().toLowerCase();
      const dupEmail = students.some(
        (s) => s.email.trim().toLowerCase() === emailLower
      );
      if (dupEmail) {
        next.email = next.email || "A student with this email already exists.";
      }
      const numTrim = studentNumber.trim();
      const dupNum = students.some(
        (s) => s.studentNumber.trim().toLowerCase() === numTrim.toLowerCase()
      );
      if (dupNum) {
        next.studentNumber =
          next.studentNumber || "A student with this student number already exists.";
      }
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSave = () => {
    if (!validate()) {
      toast.error("Please fix the highlighted fields.");
      return;
    }
    // Final duplicate-safety net right before create (in case state changed
    // between validation and this call).
    if (!isEdit) {
      const emailLower = email.trim().toLowerCase();
      const dupEmail = students.some(
        (s) => s.email.trim().toLowerCase() === emailLower
      );
      const numTrim = studentNumber.trim();
      const dupNum = students.some(
        (s) => s.studentNumber.trim().toLowerCase() === numTrim.toLowerCase()
      );
      if (dupEmail) {
        toast.error("Duplicate email", {
          description: "A student with this email already exists.",
        });
        setErrors((prev) => ({
          ...prev,
          email: "A student with this email already exists.",
        }));
        return;
      }
      if (dupNum) {
        toast.error("Duplicate student number", {
          description: "A student with this student number already exists.",
        });
        setErrors((prev) => ({
          ...prev,
          studentNumber: "A student with this student number already exists.",
        }));
        return;
      }
    }
    const supId = supervisorId;
    const startDateIso = startDate ? new Date(startDate + "T08:00:00").toISOString() : null;
    const endDateIso = endDate ? new Date(endDate + "T08:00:00").toISOString() : null;
    // Resolve placement fields — default to neutral values when unassigned so
    // the student is valid in the masterlist even before OJT deployment.
    const resolvedDepartment: Department = (department || "Other") as Department;
    const resolvedPosition = position.trim() || "Unassigned";
    // Resolve the company id from the typed company name (upsert on save).
    let resolvedCompanyId = "";
    let companyCreated = false;
    const trimmedCompany = companyName.trim();
    if (trimmedCompany) {
      const beforeIds = new Set(companies.map((c) => c.id));
      resolvedCompanyId = upsertCompany({ name: trimmedCompany });
      companyCreated = !beforeIds.has(resolvedCompanyId);
    }
    if (isEdit && existing) {
      updateStudent(existing.id, {
        name: name.trim(),
        email: email.trim(),
        course,
        section: section.trim() || undefined,
        schoolYear: schoolYear.trim() || undefined,
        requiredHours: Number(requiredHours),
        companyId: resolvedCompanyId,
        supervisorId: supId,
        position: resolvedPosition,
        department: resolvedDepartment,
        startDate: startDateIso,
        endDate: endDateIso,
        workMode,
      });
      if (companyCreated) {
        toast.success("Company added", {
          description: `New company record created for “${trimmedCompany}”.`,
        });
      }
      toast.success("Student updated", {
        description: `${name} (${studentNumber}) saved.`,
      });
      navigate("coordinator.student-view", { studentId: existing.id });
    } else {
      const result = createStudent({
        studentNumber: studentNumber.trim(),
        name: name.trim(),
        email: email.trim(),
        course,
        section: section.trim() || undefined,
        schoolYear: schoolYear.trim() || undefined,
        requiredHours: Number(requiredHours),
        companyId: resolvedCompanyId,
        supervisorId: supId,
        position: resolvedPosition,
        department: resolvedDepartment,
        startDate: startDateIso,
        endDate: endDateIso,
        workMode,
      });
      if (companyCreated) {
        toast.success("Company added", {
          description: `New company record created for “${trimmedCompany}”.`,
        });
      }
      setCreatedCreds({
        name: name.trim(),
        email: email.trim(),
        tempPassword,
        studentId: result.studentId,
      });
      setCredsOpen(true);
    }
  };

  return (
    <div>
      <PageHeader
        title={isEdit ? "Edit Student" : "Add Student"}
        description={
          isEdit
            ? `Editing ${existing?.name}`
            : "Create a student record and match them to the right supervisor."
        }
        breadcrumb="Students"
        showBack
      />

      <div className="space-y-4 pb-8">
        {/* Section 1 — Student */}
        <SectionCard title="Student">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Student Number"
              required
              error={errors.studentNumber}
              hint="As issued by the registrar."
            >
              <Input
                value={studentNumber}
                onChange={(e) => setStudentNumber(e.target.value)}
                placeholder="2021-00123"
                className="font-mono"
                aria-invalid={!!errors.studentNumber}
              />
            </Field>
            <Field label="Full Name" required error={errors.name}>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Juan Dela Cruz"
                aria-invalid={!!errors.name}
              />
            </Field>
            <Field label="Email" required error={errors.email} className="sm:col-span-2">
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="juan.delacruz@university.edu"
                aria-invalid={!!errors.email}
              />
            </Field>
            <Field label="Course" required error={errors.course} hint="Type to search or add a new course (e.g. BSED, BSBA).">
              <ComboInput
                value={course}
                onChange={setCourse}
                options={courseOpts}
                placeholder="BSIT / BSCS / BSIS / …"
                aria-invalid={!!errors.course}
              />
            </Field>
            <Field
              label="Section"
              hint="Block / section (e.g. BSCS 3-1, BSIT 3-2). Free-text."
            >
              <ComboInput
                value={section}
                onChange={setSection}
                options={sectionOpts}
                placeholder="BSCS 3-1"
              />
            </Field>
            <Field
              label="School Year / Batch"
              hint="e.g. 2025-2026 2nd Semester, 2024-2025 Summer."
            >
              <ComboInput
                value={schoolYear}
                onChange={setSchoolYear}
                options={schoolYearOpts}
                placeholder="2025-2026 2nd Semester"
              />
            </Field>
            <Field
              label="Required Hours"
              required
              error={errors.requiredHours}
              hint="Typical: 300 (BSIT/BSCS) or 600 (BSIS). Total practicum hours the student must complete."
            >
              <Input
                type="number"
                min={1}
                value={requiredHours}
                onChange={(e) => setRequiredHours(e.target.value)}
                aria-invalid={!!errors.requiredHours}
              />
            </Field>
          </div>
        </SectionCard>

        {/* Section 2 — Placement */}
        <SectionCard
          title="Placement"
          description="Optional — assign now or come back later. Students without a supervisor see a locked workspace."
        >
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="Company"
                error={errors.companyId}
                hint="Type to search or add a new company."
              >
                <ComboInput
                  value={companyName}
                  onChange={setCompanyName}
                  options={companyOpts}
                  placeholder="Acme Corp / Globex / …"
                  aria-invalid={!!errors.companyId}
                />
              </Field>
              <Field
                label="Position"
                error={errors.position}
                hint="The intern's role title. Leave blank if unassigned."
              >
                <Input
                  value={position}
                  onChange={(e) => setPosition(e.target.value)}
                  placeholder="Frontend Developer Intern"
                  aria-invalid={!!errors.position}
                />
              </Field>
              <Field label="Department" error={errors.department}>
                <Select
                  value={department || UNASSIGNED}
                  onValueChange={(v) => setDepartment(v === UNASSIGNED ? "" : (v as Department))}
                >
                  <SelectTrigger className="w-full" aria-invalid={!!errors.department}>
                    <SelectValue placeholder="Not yet assigned" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={UNASSIGNED}>Not yet assigned</SelectItem>
                    {DEPARTMENTS.map((d) => (
                      <SelectItem key={d} value={d}>
                        {d}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Work Mode">
                <Select
                  value={workMode}
                  onValueChange={(v) => setWorkMode(v as WorkMode)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select work mode" />
                  </SelectTrigger>
                  <SelectContent>
                    {WORK_MODES.map((m) => (
                      <SelectItem key={m} value={m}>
                        {WORK_MODE_LABELS[m]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Start Date">
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </Field>
              <Field label="End Date">
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </Field>
            </div>

            {/* Supervisor picker — shows real context for matching */}
            <div>
              <Label className="mb-2 block">Supervisor</Label>
              <p className="mb-3 text-xs text-muted-foreground">
                Pick a supervisor whose department matches the intern's role.
                Card shows current load and capacity.
              </p>
              <SupervisorPicker
                value={supervisorId}
                onChange={setSupervisorId}
                department={department || undefined}
                companyId={resolvedCompanyIdForPicker}
              />
              {supervisorId && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="mt-2 text-xs text-muted-foreground"
                  onClick={() => {
                    setSupervisorId(null);
                    toast.info("Supervisor cleared", {
                      description: "Student will be saved without a supervisor.",
                    });
                  }}
                >
                  Clear supervisor (leave unassigned)
                </Button>
              )}
            </div>
          </div>
        </SectionCard>
      </div>

      <ActionBar>
        <Button
          variant="outline"
          onClick={() => {
            back();
            toast.info("Cancelled", { description: "No changes were saved." });
          }}
        >
          Cancel
        </Button>
        <Button onClick={handleSave}>{isEdit ? "Save Changes" : "Create Student"}</Button>
      </ActionBar>

      {createdCreds && (
        <CredentialsDialog
          open={credsOpen}
          onOpenChange={setCredsOpen}
          name={createdCreds.name}
          email={createdCreds.email}
          tempPassword={createdCreds.tempPassword}
          onDone={() => {
            toast.success("Student created", {
              description: `${createdCreds.name} added to the cohort.`,
            });
            navigate("coordinator.student-view", { studentId: createdCreds.studentId });
          }}
        />
      )}
    </div>
  );
}

function Field({
  label,
  required,
  error,
  hint,
  children,
  className,
}: {
  label: string;
  required?: boolean;
  error?: string;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <Label className="mb-1.5">
        {label}
        {required && <span className="text-destructive">*</span>}
      </Label>
      {children}
      {hint && !error && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
      {error && (
        <p className="mt-1 flex items-center gap-1 text-xs text-destructive">
          <AlertCircle className="h-3 w-3" />
          {error}
        </p>
      )}
    </div>
  );
}
