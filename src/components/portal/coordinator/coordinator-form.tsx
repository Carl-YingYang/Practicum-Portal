"use client";

import * as React from "react";
import { useAppStore } from "@/store/use-app-store";
import type { ViewParams } from "@/lib/types";
import { COORDINATOR_DEPARTMENTS } from "@/lib/types";
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
import { AlertCircle, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

function genTempPassword(): string {
  return (
    "Tmp-" +
    Math.random().toString(36).slice(2, 6).toUpperCase() +
    Math.random().toString(36).slice(2, 6)
  );
}

/**
 * CoordinatorForm — create (or edit) a Practicum Coordinator account.
 *
 * Coordinators are university staff who manage the practicum program. This
 * form is intentionally simpler than the student/supervisor forms: no
 * company, no capacity — just identity + academic department.
 */
export function CoordinatorForm({
  coordinatorId,
}: {
  coordinatorId?: ViewParams["coordinatorId"];
}) {
  const navigate = useAppStore((s) => s.navigate);
  const back = useAppStore((s) => s.back);
  const coordinators = useAppStore((s) => s.coordinators);
  const createCoordinator = useAppStore((s) => s.createCoordinator);
  const updateCoordinator = useAppStore((s) => s.updateCoordinator);

  const isEdit = !!coordinatorId;
  const existing = React.useMemo(
    () => (coordinatorId ? coordinators.find((c) => c.id === coordinatorId) : undefined),
    [coordinators, coordinatorId]
  );

  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [title, setTitle] = React.useState("");
  const [department, setDepartment] = React.useState<string>("");
  const [tempPassword] = React.useState(() => genTempPassword());
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [credsOpen, setCredsOpen] = React.useState(false);
  const [createdCreds, setCreatedCreds] = React.useState<{
    name: string;
    email: string;
    tempPassword: string;
    coordinatorId: string;
  } | null>(null);

  React.useEffect(() => {
    if (existing) {
      setName(existing.name);
      setEmail(existing.email);
      setTitle(existing.title);
      setDepartment(existing.department);
    }
  }, [existing]);

  if (isEdit && !existing) {
    return (
      <div>
        <PageHeader title="Edit Coordinator" showBack breadcrumb="User Management" />
        <EmptyState
          icon={AlertCircle}
          title="Coordinator not found"
          description="This coordinator may have been removed."
          actionLabel="Back to User Management"
          onAction={() => navigate("coordinator.user-management")}
        />
      </div>
    );
  }

  const validate = () => {
    const next: Record<string, string> = {};
    if (!name.trim()) next.name = "Name is required.";
    if (!email.trim()) next.email = "Email is required.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) next.email = "Enter a valid email.";
    if (!title.trim()) next.title = "Title is required.";
    if (!department) next.department = "Department is required.";

    // Duplicate prevention (only on create).
    if (!isEdit) {
      const emailLower = email.trim().toLowerCase();
      const dupEmail = coordinators.some(
        (c) => c.email.trim().toLowerCase() === emailLower
      );
      if (dupEmail) {
        next.email = next.email || "A coordinator with this email already exists.";
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
      const dupEmail = coordinators.some(
        (c) => c.email.trim().toLowerCase() === emailLower
      );
      if (dupEmail) {
        toast.error("Duplicate email", {
          description: "A coordinator with this email already exists.",
        });
        setErrors((prev) => ({
          ...prev,
          email: "A coordinator with this email already exists.",
        }));
        return;
      }
    }
    if (isEdit && existing) {
      updateCoordinator(existing.id, {
        name: name.trim(),
        email: email.trim(),
        title: title.trim(),
        department,
      });
      toast.success("Coordinator updated", {
        description: `${name} saved.`,
      });
      navigate("coordinator.user-management");
    } else {
      const result = createCoordinator({
        name: name.trim(),
        email: email.trim(),
        title: title.trim(),
        department,
      });
      setCreatedCreds({
        name: name.trim(),
        email: email.trim(),
        tempPassword,
        coordinatorId: result.coordinatorId,
      });
      setCredsOpen(true);
    }
  };

  return (
    <div>
      <PageHeader
        title={isEdit ? "Edit Coordinator" : "Add Coordinator"}
        description={
          isEdit
            ? `Editing ${existing?.name}`
            : "Create a practicum coordinator account with full program-management access."
        }
        breadcrumb="User Management"
        showBack
      />

      <div className="space-y-4 pb-8">
        {/* Info banner — explains the power of a coordinator account */}
        {!isEdit && (
          <div className="flex items-start gap-3 rounded-md border border-primary/20 bg-primary/5 p-3.5">
            <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
              <ShieldCheck className="h-4 w-4" strokeWidth={2.2} />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground">
                Coordinator accounts have full access
              </p>
              <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                Coordinators can manage students, supervisors, and other coordinators,
                export reports, and configure practicum forms. Only grant this role to
                authorised university staff.
              </p>
            </div>
          </div>
        )}

        {/* Section 1 — Identity */}
        <SectionCard title="Coordinator">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Full Name" required error={errors.name}>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Prof. Patricia Lim"
                aria-invalid={!!errors.name}
              />
            </Field>
            <Field label="Email" required error={errors.email}>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="patricia.lim@university.edu"
                aria-invalid={!!errors.email}
              />
            </Field>
          </div>
        </SectionCard>

        {/* Section 2 — Role at the university */}
        <SectionCard
          title="University Role"
          description="Identifies the coordinator's position and academic department."
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Title"
              required
              error={errors.title}
              hint="Their role at the university."
            >
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Practicum Coordinator"
                aria-invalid={!!errors.title}
              />
            </Field>
            <Field label="Academic Department" required error={errors.department}>
              <Select value={department} onValueChange={setDepartment}>
                <SelectTrigger className="w-full" aria-invalid={!!errors.department}>
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                  {COORDINATOR_DEPARTMENTS.map((d) => (
                    <SelectItem key={d} value={d}>
                      {d}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>
        </SectionCard>
      </div>

      <ActionBar>
        <Button variant="outline" onClick={back}>
          Cancel
        </Button>
        <Button onClick={handleSave}>
          {isEdit ? "Save Changes" : "Create Coordinator"}
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
            toast.success("Coordinator created", {
              description: `${createdCreds.name} can now sign in.`,
            });
            navigate("coordinator.user-management");
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
