"use client";

import { PageHeader } from "@/components/portal/layout/page-header";
import { SectionCard } from "@/components/portal/shared/section-card";
import { DataTable, type Column } from "@/components/portal/shared/data-table";
import { EmptyState } from "@/components/portal/shared/empty-state";
import {
  EvaluationStatusBadge,
  ScoreBadge,
} from "@/components/portal/shared/badges";
import { useAppStore } from "@/store/use-app-store";
import {
  averageScore,
  evaluationsForStudent,
  formatDate,
  getStudent,
  getSupervisor,
} from "@/lib/selectors";
import type { Evaluation } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { ChevronRight, ClipboardCheck } from "lucide-react";
import { cn } from "@/lib/utils";

export function EvaluationsList() {
  const currentUser = useAppStore((s) => s.currentUser);
  const students = useAppStore((s) => s.students);
  const evaluations = useAppStore((s) => s.evaluations);
  const supervisors = useAppStore((s) => s.supervisors);
  const navigate = useAppStore((s) => s.navigate);

  const student = getStudent(students, currentUser?.studentId);

  if (!student) {
    return (
      <EmptyState
        icon={ClipboardCheck}
        title="Student record not found"
        description="We couldn't load your student profile."
      />
    );
  }

  const myEvaluations = evaluationsForStudent(evaluations, student.id);

  const columns: Column<Evaluation>[] = [
    {
      key: "supervisor",
      header: "Supervisor",
      cell: (e) => {
        const sup = getSupervisor(supervisors, e.supervisorId);
        return (
          <span className="font-medium text-foreground">
            {sup?.name ?? "—"}
          </span>
        );
      },
    },
    {
      key: "date",
      header: "Date",
      cell: (e) => formatDate(e.submittedAt ?? e.createdAt),
      sortValue: (e) => e.submittedAt ?? e.createdAt,
    },
    {
      key: "term",
      header: "Term",
      cell: (e) => <span className="text-muted-foreground">{e.term}</span>,
      sortValue: (e) => e.term,
      hideOnMobile: true,
    },
    {
      key: "average",
      header: "Average",
      cell: (e) => <ScoreBadge score={averageScore(e)} />,
      align: "center",
      sortValue: (e) => averageScore(e),
    },
    {
      key: "status",
      header: "Status",
      cell: (e) => <EvaluationStatusBadge status={e.status} />,
    },
    {
      key: "actions",
      header: "",
      align: "right",
      cell: (e) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={(ev) => {
            ev.stopPropagation();
            navigate("student.evaluation-view", { evaluationId: e.id });
          }}
        >
          View <ChevronRight className="h-4 w-4" />
        </Button>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        breadcrumb="Evaluations"
        description="Performance evaluations submitted by your company supervisor."
      />

      <SectionCard noPadding>
        <DataTable
          columns={columns}
          rows={myEvaluations}
          getRowId={(e) => e.id}
          defaultSortKey="date"
          defaultSortDir="desc"
          onRowClick={(e) =>
            navigate("student.evaluation-view", { evaluationId: e.id })
          }
          mobileCard={(e) => {
            const sup = getSupervisor(supervisors, e.supervisorId);
            const score = averageScore(e);
            return (
              <div className="space-y-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-foreground">
                      {sup?.name ?? "—"}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {formatDate(e.submittedAt ?? e.createdAt)} · {e.term}
                    </p>
                  </div>
                  <EvaluationStatusBadge status={e.status} />
                </div>
                <div className="flex items-center justify-between gap-2 border-t border-border/60 pt-2">
                  <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                    Average
                  </span>
                  <ScoreBadge score={score} />
                </div>
                <div
                  className={cn(
                    "flex items-center justify-end pt-1",
                    "text-xs font-medium text-primary"
                  )}
                >
                  View details
                  <ChevronRight className="h-3.5 w-3.5" />
                </div>
              </div>
            );
          }}
          emptyState={
            <div className="p-5">
              <EmptyState
                icon={ClipboardCheck}
                title="No evaluations yet"
                description="Your supervisor hasn't submitted an evaluation for you this term. Check back later."
              />
            </div>
          }
        />
      </SectionCard>
    </>
  );
}

export default EvaluationsList;
