"use client";

import * as React from "react";
import { useAppStore } from "@/store/use-app-store";
import { getSupervisor } from "@/lib/selectors";
import type { ViewParams, Department } from "@/lib/types";
import { DEPARTMENTS } from "@/lib/types";
import { PageHeader } from "@/components/portal/layout/page-header";
import { SectionCard } from "@/components/portal/shared/section-card";
import { ActionBar } from "@/components/portal/shared/action-bar";
import { CredentialsDialog } from "@/components/portal/shared/credentials-dialog";
import { EmptyState } from "@/components/portal/shared/empty-state";
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
  const companies = useAppStore((s) => s.companies);
  const createSupervisor = useAppStore((s) => s.createSupervisor);
  const updateSupervisor = useAppStore((s) => s.updateSupervisor);

  const isEdit = !!supervisorId;
  const existing = React.useMemo(
    () => (supervisorId ? getSupervisor(supervisors, supervisorId) : undefined),
    [supervisors, supervisorId]
  );

  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [companyId, setCompanyId] = React.useState("");
  const [title, setTitle] = React.useState("");
  const [department, setDepartment] = React.useState<Department | "">("");
  const [capacity, setCapacity] = React.useState("5");
  const [tempPassword] = React.useState(() => genTempPassword());
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [credsOpen, setCredsOpen] = React.useState(false);
  const [createdCreds, setCreatedCreds] = React.useState<{
    name: string;
    email: string;
    tempPassword: string;
    supervisorId: string;
  } | null>(null);

  React.useEffect(() => {
    if (existing) {
      setName(existing.name);
      setEmail(existing.email);
      setCompanyId(existing.companyId);
      setTitle(existing.title);
      setDepartment(existing.department);
      setCapacity(String(existing.capacity));
    }
  }, [existing]);

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
    if (!companyId) next.companyId = "Company is required.";
    if (!title.trim()) next.title = "Title is required.";
    if (!department) next.department = "Department is required.";
    if (!capacity.trim() || Number.isNaN(Number(capacity)) || Number(capacity) <= 0)
      next.capacity = "Capacity must be a positive number.";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSave = () => {
    if (!validate()) {
      toast.error("Please fix the highlighted fields.");
      return;
    }
    if (isEdit && existing) {
      updateSupervisor(existing.id, {
        name: name.trim(),
        email: email.trim(),
        companyId,
        title: title.trim(),
        department: department as Department,
        capacity: Number(capacity),
      });
      toast.success("Supervisor updated", {
        description: `${name} saved.`,
      });
      navigate("coordinator.supervisor-view", { supervisorId: existing.id });
    } else {
      const result = createSupervisor({
        name: name.trim(),
        email: email.trim(),
        companyId,
        title: title.trim(),
        department: department as Department,
        capacity: Number(capacity),
      });
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
            <Field
              label="Company"
              required
              error={errors.companyId}
              className="sm:col-span-2"
            >
              <Select value={companyId} onValueChange={setCompanyId}>
                <SelectTrigger className="w-full" aria-invalid={!!errors.companyId}>
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
        <Button variant="outline" onClick={back}>
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
