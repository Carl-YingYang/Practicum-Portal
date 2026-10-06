"use client";

import * as React from "react";
import { ChangePasswordCard } from "@/components/portal/shared/change-password-card";
import { useAppStore } from "@/store/use-app-store";
import { ROLE_LABELS } from "@/lib/types";
import { formatDate } from "@/lib/selectors";
import { PageHeader } from "@/components/portal/layout/page-header";
import { SectionCard } from "@/components/portal/shared/section-card";
import { Avatar } from "@/components/portal/shared/avatar";
import { RoleBadge } from "@/components/portal/shared/badges";
import { Button } from "@/components/ui/button";
import {
  Mail,
  ShieldCheck,
  LogOut,
  Building2,
  Users,
  UserSquare2,
  ClipboardCheck,
  NotebookText,
} from "lucide-react";

export function CoordinatorProfile() {
  const currentUser = useAppStore((s) => s.currentUser);
  const coordinator = useAppStore((s) => s.coordinators.find(profile => profile.id === s.currentUser?.coordinatorId));
  const logout = useAppStore((s) => s.logout);
  const students = useAppStore((s) => s.students);
  const supervisors = useAppStore((s) => s.supervisors);
  const companies = useAppStore((s) => s.companies);
  const evaluations = useAppStore((s) => s.evaluations);
  const journals = useAppStore((s) => s.journals);

  if (!currentUser) return null;

  const submittedEvals = evaluations.filter((e) => e.status === "submitted").length;
  const approvedJournals = journals.filter((j) => j.status === "approved").length;

  const handleLogout = () => {
    logout();
  };

  const stats = [
    { label: "Students", value: students.length, icon: Users },
    { label: "Supervisors", value: supervisors.length, icon: UserSquare2 },
    { label: "Companies", value: companies.length, icon: Building2 },
    { label: "Submitted Evals", value: submittedEvals, icon: ClipboardCheck },
    { label: "Approved Journals", value: approvedJournals, icon: NotebookText },
  ];

  return (
    <div>
      <PageHeader
        title="My Profile"
        description="Coordinator account and cohort overview."
        breadcrumb="Profile"
        actions={
          <Button variant="outline" onClick={handleLogout}>
            <LogOut className="h-4 w-4" />
            Sign out
          </Button>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Account */}
        <SectionCard title="My Account" className="lg:col-span-2">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
            <Avatar name={currentUser.name} size="xl" color={currentUser.avatarColor} />
            <div className="min-w-0 flex-1 space-y-3">
              <div>
                <h2 className="text-xl font-bold text-foreground">{currentUser.name}</h2>
                <p className="text-sm text-muted-foreground">{currentUser.email}</p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <RoleBadge role={currentUser.role} solid />
                  <span className="text-xs text-muted-foreground">
                    Practicum Coordinator · All terms
                  </span>
                </div>
              </div>
              <div className="grid gap-2 text-sm sm:grid-cols-2">
                <p className="flex items-center gap-2 text-muted-foreground">
                  <Mail className="h-4 w-4 shrink-0" />
                  <span className="truncate">{currentUser.email}</span>
                </p>
                <p className="flex items-center gap-2 text-muted-foreground">
                  <ShieldCheck className="h-4 w-4 shrink-0" />
                  Account ID: <span className="min-w-0 break-all font-mono">{currentUser.coordinatorId ?? currentUser.id}</span>
                </p>
              </div>
            </div>
          </div>

          {/* Cohort stats */}
          <div className="mt-6 grid grid-cols-2 gap-3 border-t border-border pt-4 sm:grid-cols-3 lg:grid-cols-5">
            {stats.map((s) => {
              const Icon = s.icon;
              return (
                <div
                  key={s.label}
                  className="rounded-md border border-border bg-muted/20 px-3 py-2.5"
                >
                  <Icon className="h-4 w-4 text-muted-foreground" />
                  <p className="mt-1 text-lg font-bold tabular-nums text-foreground">
                    {s.value}
                  </p>
                  <p className="text-[11px] text-muted-foreground">{s.label}</p>
                </div>
              );
            })}
          </div>
        </SectionCard>

        <ChangePasswordCard />
      </div>

      {/* Account meta */}
      <SectionCard title="Session" className="mt-4">
        <div className="grid gap-3 text-sm sm:grid-cols-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Role
            </p>
            <p className="mt-0.5 font-medium text-foreground">
              {ROLE_LABELS[currentUser.role]}
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Account created
            </p>
            <p className="mt-0.5 font-medium text-foreground">
              {coordinator?.createdAt ? formatDate(coordinator.createdAt) : "—"}
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Active term
            </p>
            <p className="mt-0.5 font-medium text-foreground">See External Tools for cohort dates</p>
          </div>
        </div>
        <div className="mt-4 flex justify-end border-t border-border pt-4">
          <Button variant="outline" onClick={handleLogout}>
            <LogOut className="h-4 w-4" />
            Sign out of portal
          </Button>
        </div>
      </SectionCard>
    </div>
  );
}
