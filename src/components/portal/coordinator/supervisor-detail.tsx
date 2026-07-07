"use client";

import * as React from "react";
import { useAppStore } from "@/store/use-app-store";
import {
  averageScore,
  evaluationsForStudent,
  formatDate,
  getCompany,
  hoursPercent,
  studentsForSupervisor,
} from "@/lib/selectors";
import { PageHeader } from "@/components/portal/layout/page-header";
import { SectionCard } from "@/components/portal/shared/section-card";
import { DataTable, type Column } from "@/components/portal/shared/data-table";
import { EmptyState } from "@/components/portal/shared/empty-state";
import { Avatar } from "@/components/portal/shared/avatar";
import { ProgressBar } from "@/components/portal/shared/progress-ring";
import {
  ScoreBadge,
  Badge,
} from "@/components/portal/shared/badges";
import { Button } from "@/components/ui/button";
import {
  Pencil,
  Mail,
  Building2,
  AlertCircle,
  UserSquare2,
  Eye,
  MessageSquare,
} from "lucide-react";

interface Row {
  id: string;
  name: string;
  studentNumber: string;
  position: string;
  companyName: string;
  course: string;
  hoursPct: number;
  lastScore: number;
  hasEval: boolean;
  status: "active" | "inactive";
}

export function SupervisorDetail({
  supervisorId,
}: {
  supervisorId?: string;
}) {
  const navigate = useAppStore((s) => s.navigate);
  const supervisors = useAppStore((s) => s.supervisors);
  const companies = useAppStore((s) => s.companies);
  const students = useAppStore((s) => s.students);
  const evaluations = useAppStore((s) => s.evaluations);

  const supervisor = supervisors.find((s) => s.id === supervisorId);
  if (!supervisor) {
    return (
      <div>
        <PageHeader title="Supervisor Detail" showBack breadcrumb="Supervisors" />
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

  const company = getCompany(companies, supervisor.companyId);
  const interns = studentsForSupervisor(students, supervisor.id);

  const rows: Row[] = interns.map((st) => {
    const c = getCompany(companies, st.companyId);
    const evals = evaluationsForStudent(evaluations, st.id);
    const submitted = evals.find((e) => e.status === "submitted");
    return {
      id: st.id,
      name: st.name,
      studentNumber: st.studentNumber,
      position: st.position,
      companyName: c?.name ?? "—",
      course: st.course,
      hoursPct: hoursPercent(st),
      lastScore: submitted ? averageScore(submitted) : 0,
      hasEval: !!submitted,
      status: st.status,
    };
  });

  const columns: Column<Row>[] = [
    {
      key: "name",
      header: "Intern",
      sortValue: (r) => r.name,
      cell: (r) => (
        <div className="flex items-center gap-2.5">
          <Avatar name={r.name} size="sm" />
          <div className="min-w-0">
            <div className="truncate text-sm font-medium text-foreground">{r.name}</div>
            <div className="truncate text-xs text-muted-foreground">{r.position}</div>
          </div>
        </div>
      ),
    },
    {
      key: "company",
      header: "Company",
      sortValue: (r) => r.companyName,
      hideOnMobile: true,
      cell: (r) => <span className="text-sm text-muted-foreground">{r.companyName}</span>,
    },
    {
      key: "hours",
      header: "Hours",
      sortValue: (r) => r.hoursPct,
      cell: (r) => <ProgressBar value={r.hoursPct} showLabel className="w-24" />,
    },
    {
      key: "eval",
      header: "Last Eval",
      sortValue: (r) => r.lastScore,
      hideOnMobile: true,
      cell: (r) =>
        r.hasEval ? (
          <ScoreBadge score={r.lastScore} />
        ) : (
          <span className="rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300">
            Due
          </span>
        ),
    },
    {
      key: "status",
      header: "Status",
      sortValue: (r) => r.status,
      cell: (r) => (
        <Badge tone={r.status === "active" ? "emerald" : "slate"}>
          {r.status === "active" ? "Active" : "Inactive"}
        </Badge>
      ),
    },
    {
      key: "view",
      header: "",
      align: "right",
      cell: (r) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            navigate("coordinator.student-view", { studentId: r.id });
          }}
        >
          <Eye className="h-4 w-4" />
          View
        </Button>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title={supervisor.name}
        breadcrumb="Supervisors"
        showBack
        actions={
          <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
            <Button
              variant="outline"
              className="flex-1 sm:flex-none"
              onClick={() =>
                navigate("coordinator.messages", { supervisorId: supervisor.id })
              }
            >
              <MessageSquare className="h-4 w-4" />
              Message
            </Button>
            <Button
              variant="outline"
              className="flex-1 sm:flex-none"
              onClick={() =>
                navigate("coordinator.supervisor-new", { supervisorId: supervisor.id })
              }
            >
              <Pencil className="h-4 w-4" />
              Edit
            </Button>
          </div>
        }
      />

      {/* Header card — title + department in header. */}
      <SectionCard>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
          <Avatar name={supervisor.name} size="xl" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-bold text-foreground">{supervisor.name}</h2>
              <Badge tone={supervisor.status === "active" ? "emerald" : "slate"}>
                {supervisor.status === "active" ? "Active" : "Inactive"}
              </Badge>
            </div>
            <p className="mt-0.5 text-sm text-foreground/80">
              {supervisor.title}
            </p>
            <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
              <p className="flex min-w-0 items-center gap-2 text-muted-foreground">
                <Mail className="h-4 w-4 shrink-0" />
                <span className="truncate">{supervisor.email}</span>
              </p>
              <p className="flex min-w-0 items-center gap-2 text-muted-foreground">
                <Building2 className="h-4 w-4 shrink-0" />
                <span className="truncate">{company?.name ?? "—"}</span>
              </p>
              <p className="flex min-w-0 items-center gap-2 text-muted-foreground">
                <UserSquare2 className="h-4 w-4 shrink-0" />
                <span className="shrink-0">{interns.length} / {supervisor.capacity} interns</span>
                <span className="shrink-0 text-muted-foreground/60">·</span>
                <span className="truncate text-xs">{supervisor.department}</span>
              </p>
            </div>
          </div>
        </div>
      </SectionCard>

      {/* Assigned interns */}
      <div className="mt-4">
        <SectionCard
          title="Assigned Interns"
          description={`${interns.length} student${interns.length === 1 ? "" : "s"} under this supervisor.`}
          noPadding
          contentClassName="p-0"
        >
          <DataTable
            columns={columns}
            rows={rows}
            getRowId={(r) => r.id}
            onRowClick={(r) =>
              navigate("coordinator.student-view", { studentId: r.id })
            }
            defaultSortKey="name"
            defaultSortDir="asc"
            mobileCard={(r) => (
              <div className="space-y-2.5">
                <div className="flex items-start gap-2.5">
                  <Avatar name={r.name} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-foreground">
                      {r.name}
                    </p>
                    <p className="truncate font-mono text-xs text-muted-foreground">
                      {r.studentNumber}
                    </p>
                  </div>
                  <div className="shrink-0">
                    <Badge tone={r.status === "active" ? "emerald" : "slate"}>
                      {r.status === "active" ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 border-t border-border/60 pt-2 text-xs">
                  <div className="min-w-0">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">
                      Hours
                    </p>
                    <p className="font-mono font-semibold tabular-nums text-foreground">
                      {r.hoursPct}%
                    </p>
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">
                      Last eval
                    </p>
                    {r.hasEval ? (
                      <ScoreBadge score={r.lastScore} />
                    ) : (
                      <span className="rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300">
                        Due
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}
            emptyState={
              <EmptyState
                icon={UserSquare2}
                title="No assigned interns"
                description="This supervisor is not currently mentoring any students."
              />
            }
          />
        </SectionCard>
      </div>
    </div>
  );
}
