"use client";

import * as React from "react";
import { PageHeader } from "@/components/portal/layout/page-header";
import { SectionCard } from "@/components/portal/shared/section-card";
import { ProgressRing } from "@/components/portal/shared/progress-ring";
import { useAppStore } from "@/store/use-app-store";
import {
  getCompany,
  getStudent,
  getSupervisor,
  hoursPercent,
} from "@/lib/selectors";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import {
  Building2,
  GraduationCap,
  LogOut,
  Mail,
  ShieldCheck,
  User,
  Hash,
} from "lucide-react";

export function StudentProfile() {
  const currentUser = useAppStore((s) => s.currentUser);
  const students = useAppStore((s) => s.students);
  const companies = useAppStore((s) => s.companies);
  const supervisors = useAppStore((s) => s.supervisors);
  const logout = useAppStore((s) => s.logout);

  const student = getStudent(students, currentUser?.studentId);
  if (!student || !currentUser) return null;

  const company = getCompany(companies, student.companyId);
  const supervisor = getSupervisor(supervisors, student.supervisorId);
  const pct = hoursPercent(student);

  return (
    <>
      <PageHeader
        breadcrumb="Profile"
        description="Your account details and practicum placement."
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* My Account */}
        <div className="lg:col-span-2">
          <SectionCard
            title="My account"
            description="Personal and practicum placement details"
          >
            <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
              {/* Hours progress */}
              <div className="flex shrink-0 flex-col items-center gap-2 rounded-xl border border-border bg-muted/30 p-5">
                <ProgressRing
                  value={pct}
                  size={104}
                  label="complete"
                />
                <p className="text-center text-xs text-muted-foreground">
                  <span className="font-semibold text-foreground">
                    {student.loggedHours}h
                  </span>{" "}
                  of {student.requiredHours}h
                </p>
              </div>

              {/* Details grid */}
              <dl className="grid flex-1 grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
                <DetailItem
                  icon={User}
                  label="Full name"
                  value={student.name}
                />
                <DetailItem
                  icon={Mail}
                  label="Email"
                  value={student.email}
                  mono
                />
                <DetailItem
                  icon={Hash}
                  label="Student number"
                  value={student.studentNumber}
                  mono
                />
                <DetailItem
                  icon={GraduationCap}
                  label="Course"
                  value={student.course}
                />
                <DetailItem
                  icon={Building2}
                  label="Company"
                  value={company?.name ?? "—"}
                />
                <DetailItem
                  icon={ShieldCheck}
                  label="Supervisor"
                  value={supervisor?.name ?? "Unassigned"}
                />
                <DetailItem
                  label="Required hours"
                  value={`${student.requiredHours}h`}
                />
                <DetailItem
                  label="Hours logged"
                  value={`${student.loggedHours}h (${pct}%)`}
                />
              </dl>
            </div>
          </SectionCard>
        </div>

        {/* Change Password + Logout */}
        <div className="space-y-6">
          <ChangePasswordCard />

          <Card className="gap-0 p-5">
            <h2 className="text-base font-semibold text-foreground">
              Sign out
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              End your session and return to the sign-in screen.
            </p>
            <Button
              variant="outline"
              className="mt-4 w-full"
              onClick={() => {
                logout();
                toast.success("Signed out");
              }}
            >
              <LogOut className="h-4 w-4" /> Sign out
            </Button>
          </Card>
        </div>
      </div>
    </>
  );
}

function DetailItem({
  icon: Icon,
  label,
  value,
  mono,
}: {
  icon?: typeof User;
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="min-w-0">
      <dt className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {Icon && <Icon className="h-3.5 w-3.5" />}
        {label}
      </dt>
      <dd
        className={`mt-1 truncate text-sm font-medium text-foreground ${
          mono ? "font-mono" : ""
        }`}
      >
        {value}
      </dd>
    </div>
  );
}

function ChangePasswordCard() {
  const [current, setCurrent] = React.useState("");
  const [next, setNext] = React.useState("");
  const [confirm, setConfirm] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!current || !next || !confirm) {
      setError("All fields are required.");
      return;
    }
    if (next.length < 8) {
      setError("New password must be at least 8 characters.");
      return;
    }
    if (next !== confirm) {
      setError("New password and confirmation don't match.");
      return;
    }
    // Mock — no real backend.
    setCurrent("");
    setNext("");
    setConfirm("");
    toast.success("Password updated", {
      description: "Use your new password the next time you sign in.",
    });
  };

  return (
    <SectionCard
      title="Change password"
      description="Choose a strong password you don't use elsewhere."
    >
      <form className="space-y-4" onSubmit={handleSave}>
        <div className="space-y-1.5">
          <Label htmlFor="pw-current" className="text-sm font-medium">
            Current password
          </Label>
          <Input
            id="pw-current"
            type="password"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            placeholder="••••••••"
            className="h-11"
            autoComplete="current-password"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="pw-new" className="text-sm font-medium">
            New password
          </Label>
          <Input
            id="pw-new"
            type="password"
            value={next}
            onChange={(e) => setNext(e.target.value)}
            placeholder="At least 8 characters"
            className="h-11"
            autoComplete="new-password"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="pw-confirm" className="text-sm font-medium">
            Confirm new password
          </Label>
          <Input
            id="pw-confirm"
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="Re-enter new password"
            className="h-11"
            autoComplete="new-password"
          />
        </div>
        {error && <p className="text-xs text-destructive">{error}</p>}
        <Button type="submit" className="w-full">
          Save new password
        </Button>
      </form>
    </SectionCard>
  );
}

export default StudentProfile;
