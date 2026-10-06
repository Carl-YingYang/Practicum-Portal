"use client";

import {
  Mail,
  Building2,
  Users,
  Shield,
  LogOut,
  ClipboardCheck,
} from "lucide-react";
import { useAppStore } from "@/store/use-app-store";
import {
  getSupervisor,
  getCompany,
  studentsForSupervisor,
} from "@/lib/selectors";
import { PageHeader } from "@/components/portal/layout/page-header";
import { SectionCard } from "@/components/portal/shared/section-card";
import { Avatar } from "@/components/portal/shared/avatar";
import { RoleBadge } from "@/components/portal/shared/badges";
import { SchoolIdentityCard } from "@/components/portal/shared/school-identity-card";
import { Button } from "@/components/ui/button";
import { ChangePasswordCard } from "@/components/portal/shared/change-password-card";

export function SupervisorProfile() {
  const currentUser = useAppStore((s) => s.currentUser);
  const supervisors = useAppStore((s) => s.supervisors);
  const companies = useAppStore((s) => s.companies);
  const students = useAppStore((s) => s.students);
  const logout = useAppStore((s) => s.logout);

  const supervisorId = currentUser?.supervisorId ?? "";
  const supervisor = getSupervisor(supervisors, supervisorId);
  const company = supervisor ? getCompany(companies, supervisor.companyId) : undefined;
  const internCount = studentsForSupervisor(students, supervisorId).length;

  return (
    <div>
      <PageHeader
        title="My Profile"
        description="Manage your account details and password."
      />

      {/* The school your interns are affiliated with — full identity block. */}
      <SchoolIdentityCard variant="full" className="mb-6" />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Account card */}
        <div className="lg:col-span-2">
          <SectionCard title="My Account">
            <div className="flex items-start gap-4">
              <Avatar name={currentUser?.name ?? ""} size="xl" />
              <div className="min-w-0 flex-1">
                <h2 className="text-xl font-bold tracking-tight text-foreground">
                  {currentUser?.name}
                </h2>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  {currentUser?.email}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <RoleBadge role="supervisor" solid />
                  <span className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/40 px-2.5 py-0.5 text-xs text-muted-foreground">
                    <Shield className="h-3 w-3" />
                    Active
                  </span>
                </div>
              </div>
            </div>

            <dl className="mt-5 grid grid-cols-1 gap-3 border-t border-border pt-5 sm:grid-cols-2">
              <DetailRow icon={Mail} label="Email" value={currentUser?.email ?? "—"} />
              <DetailRow
                icon={Building2}
                label="Company"
                value={company?.name ?? "—"}
              />
              <DetailRow
                icon={Users}
                label="Assigned interns"
                value={`${internCount}`}
              />
              <DetailRow
                icon={ClipboardCheck}
                label="Supervisor ID"
                value={supervisorId}
                mono
              />
            </dl>
          </SectionCard>
        </div>

        {/* Sidebar: change password + logout */}
        <div className="space-y-6">
          <ChangePasswordCard />

          <SectionCard title="Session">
            <Button
              variant="outline"
              className="w-full justify-center text-red-700 hover:bg-red-50 hover:text-red-800 dark:text-red-300 dark:hover:bg-red-950/40"
              onClick={() => {
                logout();
              }}
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </Button>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}

function DetailRow({
  icon: Icon,
  label,
  value,
  mono,
}: {
  icon: typeof Mail;
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-border bg-muted/20 p-3">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-background text-muted-foreground">
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p
          className={`truncate text-sm font-medium text-foreground ${
            mono ? "font-mono" : ""
          }`}
        >
          {value}
        </p>
      </div>
    </div>
  );
}
