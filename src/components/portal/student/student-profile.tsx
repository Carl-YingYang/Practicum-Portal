"use client";

import * as React from "react";
import { ChangePasswordCard } from "@/components/portal/shared/change-password-card";
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
import { Card } from "@/components/ui/card";
import { SchoolIdentityCard } from "@/components/portal/shared/school-identity-card";
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

      {/* Your school — full identity block, cross-platform. */}
      <SchoolIdentityCard variant="full" className="mb-6" />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* My Account */}
        <div className="lg:col-span-2">
          <SectionCard
            title="My account"
            description="Personal and practicum placement details"
          >
            <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
              {/* Hours progress */}
              <div className="gradient-tint relative flex shrink-0 flex-col items-center gap-2 overflow-hidden rounded-xl border border-border bg-muted/30 p-5">
                <ProgressRing
                  value={pct}
                  size={104}
                  label="complete"
                />
                <p className="text-center text-xs text-muted-foreground">
                  <span className="stat-number-gradient font-semibold">
                    {student.loggedHours}h
                  </span>{" "}
                  of {student.requiredHours}h
                </p>
                <span className="absolute top-2 right-2 inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
                  <span className="dot-pulse h-1.5 w-1.5 rounded-full bg-primary" />
                  Active
                </span>
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
    <div className="item-rise min-w-0 rounded-lg border border-transparent px-2.5 py-2 transition-colors hover:border-border hover:bg-muted/40">
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

export default StudentProfile;
