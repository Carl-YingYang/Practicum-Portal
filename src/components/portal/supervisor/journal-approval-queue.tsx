"use client";

import { useMemo, useState } from "react";
import { FileCheck2, ArrowRight } from "lucide-react";
import { useAppStore } from "@/store/use-app-store";
import {
  pendingJournalsForSupervisor,
  journalsForStudent,
  getStudent,
  weekLabel,
  formatDate,
  relativeTime,
} from "@/lib/selectors";
import { PageHeader } from "@/components/portal/layout/page-header";
import { SectionCard } from "@/components/portal/shared/section-card";
import { DataTable, type Column } from "@/components/portal/shared/data-table";
import { Avatar } from "@/components/portal/shared/avatar";
import { JournalStatusBadge } from "@/components/portal/shared/badges";
import { EmptyState } from "@/components/portal/shared/empty-state";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Journal } from "@/lib/types";

type Filter = "pending" | "all";

const FILTERS: { key: Filter; label: string }[] = [
  { key: "pending", label: "Pending" },
  { key: "all", label: "All" },
];

export function JournalApprovalQueue() {
  const currentUser = useAppStore((s) => s.currentUser);
  const students = useAppStore((s) => s.students);
  const journals = useAppStore((s) => s.journals);
  const navigate = useAppStore((s) => s.navigate);

  const supervisorId = currentUser?.supervisorId ?? "";
  const [filter, setFilter] = useState<Filter>("pending");

  const pending = useMemo(
    () => pendingJournalsForSupervisor(journals, students, supervisorId),
    [journals, students, supervisorId]
  );

  // Build the "all" list: all journals for this supervisor's interns.
  const all = useMemo(() => {
    const internIds = new Set(
      students
        .filter((s) => s.supervisorId === supervisorId)
        .map((s) => s.id)
    );
    return journals
      .filter((j) => internIds.has(j.studentId))
      .sort((a, b) => (a.submittedAt ?? a.createdAt) < (b.submittedAt ?? b.createdAt) ? 1 : -1);
  }, [journals, students, supervisorId]);

  const rows = filter === "pending" ? pending : all;

  // Default sort: oldest pending first.
  const sortedRows = useMemo(() => {
    if (filter !== "pending") return rows;
    return [...rows].sort((a, b) =>
      (a.submittedAt ?? a.createdAt) > (b.submittedAt ?? b.createdAt) ? 1 : -1
    );
  }, [rows, filter]);

  const columns: Column<Journal>[] = [
    {
      key: "student",
      header: "Student",
      cell: (j) => {
        const student = getStudent(students, j.studentId);
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
      sortValue: (j) => getStudent(students, j.studentId)?.name ?? "",
    },
    {
      key: "week",
      header: "Week",
      cell: (j) => (
        <span className="text-sm text-muted-foreground">{weekLabel(j.date)}</span>
      ),
      sortValue: (j) => weekLabel(j.date),
    },
    {
      key: "date",
      header: "Date",
      cell: (j) => (
        <span className="text-sm text-muted-foreground">{formatDate(j.date)}</span>
      ),
      sortValue: (j) => j.date,
      hideOnMobile: true,
    },
    {
      key: "hours",
      header: "Hours",
      align: "right",
      cell: (j) => <span className="text-sm tabular-nums">{j.hours}h</span>,
      sortValue: (j) => j.hours,
    },
    {
      key: "submitted",
      header: "Submitted",
      cell: (j) => (
        <span className="text-sm text-muted-foreground">
          {relativeTime(j.submittedAt ?? j.createdAt)}
        </span>
      ),
      sortValue: (j) => j.submittedAt ?? j.createdAt,
      hideOnMobile: true,
    },
    {
      key: "status",
      header: "Status",
      cell: (j) => <JournalStatusBadge status={j.status} />,
      hideOnMobile: true,
    },
    {
      key: "actions",
      header: "",
      align: "right",
      cell: (j) =>
        j.status === "pending" ? (
          <Button
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              navigate("supervisor.journal-review", { journalId: j.id });
            }}
          >
            Review
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        ) : (
          <Button
            size="sm"
            variant="outline"
            onClick={(e) => {
              e.stopPropagation();
              navigate("supervisor.journal-review", { journalId: j.id });
            }}
          >
            View
          </Button>
        ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Journal Approvals"
        description={`${pending.length} pending review · ${all.length} total`}
      />

      {/* Filter chips */}
      <div className="mb-4 flex flex-wrap gap-2">
        {FILTERS.map((f) => {
          const active = filter === f.key;
          const count = f.key === "pending" ? pending.length : all.length;
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
        {sortedRows.length === 0 ? (
          <EmptyState
            icon={FileCheck2}
            title={
              filter === "pending"
                ? "No journals waiting — you're all caught up"
                : "No journals on file"
            }
            description={
              filter === "pending"
                ? "When interns submit weekly journals, they'll appear here for approval."
                : "Your interns haven't submitted any journals yet."
            }
            tone={filter === "pending" ? "emerald" : "slate"}
          />
        ) : (
          <DataTable
            columns={columns}
            rows={sortedRows}
            getRowId={(j) => j.id}
            onRowClick={(j) =>
              navigate("supervisor.journal-review", { journalId: j.id })
            }
            defaultSortKey="submitted"
            defaultSortDir="asc"
            rowAccent={(j) =>
              j.status === "pending"
                ? "amber"
                : j.status === "rejected"
                ? "red"
                : undefined
            }
            mobileCard={(j) => {
              const student = getStudent(students, j.studentId);
              return (
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <Avatar name={student?.name ?? "?"} size="md" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-foreground">
                        {student?.name ?? "Unknown"}
                      </p>
                      <p className="truncate font-mono text-xs text-muted-foreground">
                        {student?.studentNumber}
                      </p>
                    </div>
                    <div className="shrink-0">
                      <JournalStatusBadge status={j.status} />
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-2 rounded-xl bg-muted/50 px-3 py-2">
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-muted-foreground">Week</p>
                      <p className="truncate text-xs font-semibold text-foreground">
                        {weekLabel(j.date)}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-xs font-medium text-muted-foreground">Hours</p>
                      <p className="text-xs font-semibold tabular-nums text-foreground">{j.hours}h</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs text-muted-foreground">
                      {relativeTime(j.submittedAt ?? j.createdAt)}
                    </span>
                    <span className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-primary">
                      {j.status === "pending" ? "Review" : "View"}
                      <ArrowRight className="h-3.5 w-3.5" />
                    </span>
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
