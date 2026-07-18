"use client";

import { useMemo, useState } from "react";
import { ClipboardCheck, Eye, Pencil, ChevronRight } from "lucide-react";
import { useAppStore } from "@/store/use-app-store";
import {
  evaluationsForSupervisor,
  averageScore,
  getStudent,
  getCompany,
  formatDate,
} from "@/lib/selectors";
import { PageHeader } from "@/components/portal/layout/page-header";
import { SectionCard } from "@/components/portal/shared/section-card";
import { DataTable, type Column } from "@/components/portal/shared/data-table";
import { Avatar } from "@/components/portal/shared/avatar";
import {
  ScoreBadge,
  EvaluationStatusBadge,
  Badge,
} from "@/components/portal/shared/badges";
import { StarRating } from "@/components/portal/shared/star-rating";
import { EmptyState } from "@/components/portal/shared/empty-state";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Evaluation } from "@/lib/types";

type Filter = "all" | "draft" | "submitted";

const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "draft", label: "Drafts" },
  { key: "submitted", label: "Submitted" },
];

export function EvaluationsList() {
  const currentUser = useAppStore((s) => s.currentUser);
  const evaluations = useAppStore((s) => s.evaluations);
  const students = useAppStore((s) => s.students);
  const companies = useAppStore((s) => s.companies);
  const navigate = useAppStore((s) => s.navigate);

  const supervisorId = currentUser?.supervisorId ?? "";
  const [filter, setFilter] = useState<Filter>("all");

  const all = useMemo(
    () => evaluationsForSupervisor(evaluations, supervisorId),
    [evaluations, supervisorId]
  );

  const filtered = useMemo(() => {
    if (filter === "all") return all;
    return all.filter((e) => e.status === filter);
  }, [all, filter]);

  const columns: Column<Evaluation>[] = [
    {
      key: "student",
      header: "Student",
      cell: (e) => {
        const student = getStudent(students, e.studentId);
        if (!student) return <span className="text-muted-foreground">—</span>;
        return (
          <div className="flex items-center gap-2.5">
            <Avatar name={student.name} size="sm" />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-foreground">
                {student.name}
              </p>
              <p className="truncate font-mono text-xs text-muted-foreground">
                {student.studentNumber}
              </p>
            </div>
          </div>
        );
      },
      sortValue: (e) => getStudent(students, e.studentId)?.name ?? "",
    },
    {
      key: "company",
      header: "Company",
      cell: (e) => {
        const student = getStudent(students, e.studentId);
        const company = student
          ? getCompany(companies, student.companyId)
          : undefined;
        return (
          <span className="text-sm text-muted-foreground">
            {company?.name ?? "—"}
          </span>
        );
      },
      sortValue: (e) => {
        const student = getStudent(students, e.studentId);
        return student ? getCompany(companies, student.companyId)?.name ?? "" : "";
      },
      hideOnMobile: true,
    },
    {
      key: "term",
      header: "Term",
      cell: (e) => <span className="text-sm text-muted-foreground">{e.term}</span>,
      sortValue: (e) => e.term,
      hideOnMobile: true,
    },
    {
      key: "date",
      header: "Date",
      cell: (e) => (
        <span className="text-sm text-muted-foreground">
          {formatDate(e.submittedAt ?? e.createdAt)}
        </span>
      ),
      sortValue: (e) => e.submittedAt ?? e.createdAt,
    },
    {
      key: "average",
      header: "Average",
      align: "right",
      cell: (e) => {
        const avg = averageScore(e);
        if (avg <= 0) return <span className="text-sm text-muted-foreground">—</span>;
        return (
          <div className="flex items-center justify-end gap-2">
            <StarRating
              value={avg}
              size={12}
              showValue={false}
              showLabel={false}
              animate={false}
              className="hidden md:inline-flex"
            />
            <ScoreBadge score={avg} />
          </div>
        );
      },
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
          size="sm"
          variant={e.status === "draft" ? "default" : "outline"}
          onClick={(ev) => {
            ev.stopPropagation();
            if (e.status === "draft") {
              navigate("supervisor.evaluation-new", { evaluationId: e.id });
            } else {
              navigate("supervisor.evaluation-view", { evaluationId: e.id });
            }
          }}
        >
          {e.status === "draft" ? (
            <>
              <Pencil className="h-3.5 w-3.5" />
              Edit
            </>
          ) : (
            <>
              <Eye className="h-3.5 w-3.5" />
              View
            </>
          )}
        </Button>
      ),
    },
  ];

  const handleRowClick = (e: Evaluation) => {
    if (e.status === "draft") {
      navigate("supervisor.evaluation-new", { evaluationId: e.id });
    } else {
      navigate("supervisor.evaluation-view", { evaluationId: e.id });
    }
  };

  return (
    <div>
      <PageHeader
        title="Evaluations"
        description="All evaluations you've created, including drafts."
      />

      {/* Filter chips */}
      <div className="mb-4 flex flex-wrap gap-2">
        {FILTERS.map((f) => {
          const count =
            f.key === "all"
              ? all.length
              : all.filter((e) => e.status === f.key).length;
          const active = filter === f.key;
          return (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              className={cn(
                "inline-flex h-9 items-center gap-2 rounded-full border px-4 text-sm font-medium transition-colors",
                active
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background text-muted-foreground hover:bg-accent hover:text-foreground"
              )}
            >
              {f.label}
              <span
                className={cn(
                  "rounded-full px-1.5 text-xs tabular-nums",
                  active
                    ? "bg-primary-foreground/20 text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      <SectionCard noPadding>
        {filtered.length === 0 ? (
          <EmptyState
            icon={ClipboardCheck}
            title={all.length === 0 ? "No evaluations yet" : "No matches"}
            description={
              all.length === 0
                ? "Create your first evaluation from an intern's profile."
                : "Try a different filter."
            }
            actionLabel={all.length === 0 ? "Go to My Interns" : undefined}
            onAction={
              all.length === 0
                ? () => navigate("supervisor.interns")
                : undefined
            }
          />
        ) : (
          <DataTable
            columns={columns}
            rows={filtered}
            getRowId={(e) => e.id}
            onRowClick={handleRowClick}
            defaultSortKey="date"
            defaultSortDir="desc"
            rowAccent={(e) => (e.status === "draft" ? "amber" : undefined)}
            mobileCard={(e) => {
              const student = getStudent(students, e.studentId);
              const company = student
                ? getCompany(companies, student.companyId)
                : undefined;
              return (
                <div className="space-y-2.5">
                  <div className="flex items-start gap-2.5">
                    {student && <Avatar name={student.name} size="sm" />}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-foreground">
                        {student?.name ?? "—"}
                      </p>
                      <p className="truncate font-mono text-xs text-muted-foreground">
                        {student?.studentNumber}
                      </p>
                    </div>
                    <div className="shrink-0">
                      <EvaluationStatusBadge status={e.status} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 border-t border-border/60 pt-2 text-xs">
                    <div className="min-w-0">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">
                        Company
                      </p>
                      <p className="truncate text-foreground">
                        {company?.name ?? "—"}
                      </p>
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">
                        Date
                      </p>
                      <p className="truncate text-foreground">
                        {formatDate(e.submittedAt ?? e.createdAt)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-2 pt-1">
                    <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Average
                    </span>
                    <div className="flex items-center gap-1.5">
                      <StarRating
                        value={averageScore(e)}
                        size={11}
                        showValue={false}
                        showLabel={false}
                        animate={false}
                      />
                      <ScoreBadge score={averageScore(e)} />
                    </div>
                  </div>
                  <div className="flex items-center justify-end gap-1 pt-1 text-xs font-medium text-primary">
                    {e.status === "draft" ? "Edit draft" : "View details"}
                    <ChevronRight className="h-3.5 w-3.5" />
                  </div>
                </div>
              );
            }}
          />
        )}
      </SectionCard>
    </div>
  );
}
