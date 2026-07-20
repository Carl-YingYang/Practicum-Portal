"use client";

import * as React from "react";
import { useAppStore } from "@/store/use-app-store";
import { getSupervisor, schoolYearOptions } from "@/lib/selectors";
import type { ViewParams, Department } from "@/lib/types";
import { DEPARTMENTS } from "@/lib/types";
import { PageHeader } from "@/components/portal/layout/page-header";
import { SectionCard } from "@/components/portal/shared/section-card";
import { ActionBar } from "@/components/portal/shared/action-bar";
import { CredentialsDialog } from "@/components/portal/shared/credentials-dialog";
import { EmptyState } from "@/components/portal/shared/empty-state";
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

const SALUTATIONS = ["Mr.", "Ms.", "Mrs.", "Dr.", "Engr.", "Atty.", "Hon.", "Prof."];

function genTempPassword(): string {
  return (
    "Tmp-" +
    Math.random().toString(36).slice(2, 6).toUpperCase() +
    Math.random().toString(36).slice(2, 6)
  );
}

export function SupervisorForm({
  supervisorId,
}: {
  supervisorId?: ViewParams["supervisorId"];
}) {
  const navigate = useAppStore((s) => s.navigate);
  const back = useAppStore((s) => s.back);
  const supervisors = useAppStore((s) => s.supervisors);
  const students = useAppStore((s) => s.students);
  const companies = useAppStore((s) => s.companies);
  const createSupervisor = useAppStore((s) => s.createSupervisor);
  const updateSupervisor = useAppStore((s) => s.updateSupervisor);
  const upsertCompany = useAppStore((s) => s.upsertCompany);

  const isEdit = !!supervisorId;
  const existing = React.useMemo(
    () => (supervisorId ? getSupervisor(supervisors, supervisorId) : undefined),
    [supervisors, supervisorId]
  );

  const [salutation, setSalutation] = React.useState<string>("");
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [phone, setPhone] = React.useState("");
  // Company is held as the typed NAME (free-text). On save we resolve it to
  // an id via upsertCompany (case-insensitive match or create).
  const [companyName, setCompanyName] = React.useState<string>("");
  const [title, setTitle] = React.useState("");
  const [department, setDepartment] = React.useState<Department | "">("");
  const [capacity, setCapacity] = React.useState("5");
  const [schoolYear, setSchoolYear] = React.useState<string>("");
  const [tempPassword] = React.useState(() => genTempPassword());
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [credsOpen, setCredsOpen] = React.useState(false);
  const [createdCreds, setCreatedCreds] = React.useState<{
    name: string;
    email: string;
    tempPassword: string;
    supervisorId: string;
  } | null>(null);

  // Live option lists (sourced from the roster / companies).
  const schoolYearOpts = React.useMemo(
    () => schoolYearOptions([[...supervisors], [...students], [...companies]]),
    [supervisors, students, companies],
  );
  const companyOpts = React.useMemo(
    () => companies.map((c) => c.name).sort((a, b) => a.localeCompare(b)),
    [companies],
  );

  React.useEffect(() => {
    if (existing) {
      setSalutation(existing.salutation ?? "");
      setName(existing.name);
      setEmail(existing.email);
      setPhone(existing.phone ?? "");
      const company = companies.find((c) => c.id === existing.companyId);
      setCompanyName(company?.name ?? "");
      setTitle(existing.title);
      setDepartment(existing.department);
      setCapacity(String(existing.capacity));
      setSchoolYear(existing.schoolYear ?? "");
    }
  }, [existing, companies]);

  if (isEdit && !existing) {
    return (
      <div>
        <PageHeader title="Edit Supervisor" showBack breadcrumb="Supervisors" />
        <EmptyState
          icon={AlertCircle}
          title="Supervisor not found"
          description="This supervisor may have been removed."
          actionLabel="Back to supervisors"
          onAction={() => navigate("coordinator.supervisors")}
        />
      </div>
    );
  }

  const validate = () => {
    const next: Record<string, string> = {};
    if (!name.trim()) next.name = "Name is required.";
    if (!email.trim()) next.email = "Email is required.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) next.email = "Enter a valid email.";
    if (!companyName.trim()) next.companyId = "Company is required.";
    if (!title.trim()) next.title = "Title is required.";
    if (!department) next.department = "Department is required.";
    if (!capacity.trim() || Number.isNaN(Number(capacity)) || Number(capacity) <= 0)
      next.capacity = "Capacity must be a positive number.";

    // Duplicate prevention (only on create).
    if (!isEdit) {
      const emailLower = email.trim().toLowerCase();
      const dupEmail = supervisors.some(
        (s) => s.email.trim().toLowerCase() === emailLower
      );
      if (dupEmail) {
        next.email = next.email || "A supervisor with this email already exists.";
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
    // Final duplicate-safety net right before create.
    if (!isEdit) {
      const emailLower = email.trim().toLowerCase();
      const dupEmail = supervisors.some(
        (s) => s.email.trim().toLowerCase() === emailLower
      );
      if (dupEmail) {
        toast.error("Duplicate email", {
          description: "A supervisor with this email already exists.",
        });
        setErrors((prev) => ({
          ...prev,
          email: "A supervisor with this email already exists.",
        }));
        return;
      }
    }
    // Resolve the company id from the typed company name (upsert on save).
    const trimmedCompany = companyName.trim();
    let resolveCompanyId = "";
    let companyCreated = false;
    if (trimmedCompany) {
      const beforeIds = new Set(companies.map((c) => c.id));
      resolveCompanyId = upsertCompany({ name: trimmedCompany });
      companyCreated = !beforeIds.has(resolveCompanyId);
    }
    if (isEdit && existing) {
      updateSupervisor(existing.id, {
        name: name.trim(),
        email: email.trim(),
        companyId: resolveCompanyId,
        title: title.trim(),
        department: department as Department,
        capacity: Number(capacity),
        phone: phone.trim() || undefined,
        salutation: salutation.trim() || undefined,
        schoolYear: schoolYear.trim() || undefined,
      });
      if (companyCreated) {
        toast.success("Company added", {
          description: `New company record created for “${trimmedCompany}”.`,
        });
      }
      toast.success("Supervisor updated", {
        description: `${name} saved.`,
      });
      navigate("coordinator.supervisor-view", { supervisorId: existing.id });
    } else {
      if (!resolveCompanyId) {
        // Defensive: should never happen because validate() rejects empty company.
        toast.error("Company is required.");
        return;
      }
      const result = createSupervisor({
        name: name.trim(),
        email: email.trim(),
        companyId: resolveCompanyId,
        title: title.trim(),
        department: department as Department,
        capacity: Number(capacity),
        phone: phone.trim() || undefined,
        salutation: salutation.trim() || undefined,
        schoolYear: schoolYear.trim() || undefined,
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
        supervisorId: result.supervisorId,
      });
      setCredsOpen(true);
    }
  };

  return (
    <div>
      <PageHeader
        title={isEdit ? "Edit Supervisor" : "Add Supervisor"}
        description={
          isEdit
            ? `Editing ${existing?.name}`
            : "Create a company supervisor account and set their mentoring capacity."
        }
        breadcrumb="Supervisors"
        showBack
      />

      <div className="space-y-4 pb-8">
        {/* Section 1 — Supervisor */}
        <SectionCard title="Supervisor">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Salutation" hint="Optional. e.g. Ms., Engr., Hon.">
              <ComboInput
                value={salutation}
                onChange={setSalutation}
                options={SALUTATIONS}
                placeholder="Ms. / Engr. / …"
              />
            </Field>
            <Field label="Full Name" required error={errors.name}>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Maria Santos"
                aria-invalid={!!errors.name}
              />
            </Field>
            <Field label="Email" required error={errors.email}>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="maria.santos@acmecorp.com"
                aria-invalid={!!errors.email}
              />
            </Field>
            <Field label="Phone" hint="For the company directory / CSV export.">
              <Input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="(+63) 917 555 0123"
              />
            </Field>
            <Field
              label="Company"
              required
              error={errors.companyId}
              hint="Type to search or add a new company."
              className="sm:col-span-2"
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
              label="School Year / Batch"
              hint="e.g. 2025-2026 2nd Semester, 2024-2025 Summer."
              className="sm:col-span-2"
            >
              <ComboInput
                value={schoolYear}
                onChange={setSchoolYear}
                options={schoolYearOpts}
                placeholder="2025-2026 2nd Semester"
              />
            </Field>
          </div>
        </SectionCard>

        {/* Section 2 — Mentoring Profile (new) */}
        <SectionCard
          title="Mentoring Profile"
          description="Used to match interns to the right supervisor."
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Job Title"
              required
              error={errors.title}
              hint="Their actual role at the company."
            >
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Senior Frontend Engineer"
                aria-invalid={!!errors.title}
              />
            </Field>
            <Field label="Department" required error={errors.department}>
              <Select
                value={department}
                onValueChange={(v) => setDepartment(v as Department)}
              >
                <SelectTrigger className="w-full" aria-invalid={!!errors.department}>
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
            </Field>
            <Field
              label="Intern Capacity"
              required
              error={errors.capacity}
              hint="Max interns this supervisor can mentor at once."
            >
              <Input
                type="number"
                min={1}
                value={capacity}
                onChange={(e) => setCapacity(e.target.value)}
                aria-invalid={!!errors.capacity}
              />
            </Field>
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
        <Button onClick={handleSave}>
          {isEdit ? "Save Changes" : "Create Supervisor"}
        </Button>
      </ActionBar>

      {createdCreds && (
        <CredentialsDialog
          open={credsOpen}
          onOpenChange={setCredsOpen}
          name={createdCreds.name}
          email={createdCreds.email}
          tempPassword={createdCreds.tempPassword}
          onDone={() => {
            toast.success("Supervisor created", {
              description: `${createdCreds.name} can now sign in.`,
            });
            navigate("coordinator.supervisor-view", {
              supervisorId: createdCreds.supervisorId,
            });
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
