"use client";

import * as React from "react";
import { PageHeader } from "@/components/portal/layout/page-header";
import { SectionCard } from "@/components/portal/shared/section-card";
import { DataTable, type Column } from "@/components/portal/shared/data-table";
import { EmptyState } from "@/components/portal/shared/empty-state";
import { JournalStatusBadge } from "@/components/portal/shared/badges";
import { useAppStore } from "@/store/use-app-store";
import {
  formatDate,
  getStudent,
  journalsForStudent,
  weekLabel,
} from "@/lib/selectors";
import type { Journal, JournalStatus } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ChevronRight, NotebookText, Plus } from "lucide-react";

type FilterKey = "all" | JournalStatus;

const filterChips: { key: FilterKey; label: string }[] = [
  { key: "all", label: "All" },
  { key: "draft", label: "Draft" },
  { key: "pending", label: "Pending" },
  { key: "approved", label: "Approved" },
  { key: "rejected", label: "Rejected" },
];

export function JournalsList() {
  const currentUser = useAppStore((s) => s.currentUser);
  const students = useAppStore((s) => s.students);
  const journals = useAppStore((s) => s.journals);
  const navigate = useAppStore((s) => s.navigate);

  const [filter, setFilter] = React.useState<FilterKey>("all");

  const student = getStudent(students, currentUser?.studentId);
  if (!student) {
    return (
      <EmptyState
        icon={NotebookText}
        title="Student record not found"
        description="We couldn't load your student profile."
      />
    );
  }

  const allJournals = journalsForStudent(journals, student.id);
  const filtered =
    filter === "all"
      ? allJournals
      : allJournals.filter((j) => j.status === filter);

  const counts: Record<FilterKey, number> = {
    all: allJournals.length,
    draft: allJournals.filter((j) => j.status === "draft").length,
    pending: allJournals.filter((j) => j.status === "pending").length,
    approved: allJournals.filter((j) => j.status === "approved").length,
    rejected: allJournals.filter((j) => j.status === "rejected").length,
  };

  const columns: Column<Journal>[] = [
    {
      key: "date",
      header: "Date",
      cell: (j) => <span className="font-medium">{formatDate(j.date)}</span>,
      sortValue: (j) => j.date,
    },
    {
      key: "week",
      header: "Week",
      cell: (j) => <span className="text-muted-foreground">{weekLabel(j.date)}</span>,
      sortValue: (j) => j.date,
      hideOnMobile: true,
    },
    {
      key: "hours",
      header: "Hours",
      cell: (j) => `${j.hours}h`,
      align: "right",
      sortValue: (j) => j.hours,
    },
    {
      key: "status",
      header: "Status",
      cell: (j) => <JournalStatusBadge status={j.status} />,
    },
    {
      key: "actions",
      header: "",
      align: "right",
      cell: (j) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            navigate("student.journal-view", { journalId: j.id });
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
        breadcrumb="Journals"
        description="Track and submit your weekly practicum journals."
        actions={
          <Button onClick={() => navigate("student.journal-new")}>
            <Plus className="h-4 w-4" /> New Journal
          </Button>
        }
      />

      <SectionCard noPadding>
        {/* Filter chips */}
        <div className="flex flex-wrap items-center gap-2 border-b border-border px-5 py-3">
          {filterChips.map((chip) => {
            const active = filter === chip.key;
            return (
              <button
                key={chip.key}
                type="button"
                onClick={() => setFilter(chip.key)}
                className={cn(
                  "inline-flex h-9 items-center gap-1.5 rounded-full border px-3.5 text-sm font-medium transition-colors",
                  active
                    ? "border-primary bg-primary text-primary-foreground shadow-sm"
                    : "border-border bg-background text-muted-foreground hover:bg-accent hover:text-foreground"
                )}
                aria-pressed={active}
              >
                {chip.label}
                <span
                  className={cn(
                    "rounded-full px-1.5 text-xs tabular-nums",
                    active
                      ? "bg-primary-foreground/20 text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  {counts[chip.key]}
                </span>
              </button>
            );
          })}
        </div>

        <DataTable
          columns={columns}
          rows={filtered}
          getRowId={(j) => j.id}
          defaultSortKey="date"
          defaultSortDir="desc"
          rowAccent={(j) => (j.status === "rejected" ? "amber" : undefined)}
          onRowClick={(j) =>
            navigate("student.journal-view", { journalId: j.id })
          }
          mobileCard={(j) => (
            <div className="space-y-2.5">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground">
                    {formatDate(j.date)}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {weekLabel(j.date)}
                  </p>
                </div>
                <JournalStatusBadge status={j.status} />
              </div>
              <div className="flex items-center justify-between gap-2 border-t border-border/60 pt-2">
                <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  Hours
                </span>
                <span className="font-mono text-sm font-bold tabular-nums text-foreground">
                  {j.hours}h
                </span>
              </div>
              <div className="flex items-center justify-end pt-1 text-xs font-medium text-primary">
                View
                <ChevronRight className="h-3.5 w-3.5" />
              </div>
            </div>
          )}
          emptyState={
            <div className="p-5">
              {allJournals.length === 0 ? (
                <EmptyState
                  icon={NotebookText}
                  title="No journals yet"
                  description="Submit your first weekly journal to start tracking your practicum hours."
                  actionLabel="New Journal"
                  onAction={() => navigate("student.journal-new")}
                />
              ) : (
                <EmptyState
                  icon={NotebookText}
                  title={`No ${filter === "all" ? "" : filter + " "}journals`}
                  description="Try a different filter to see your journals."
                />
              )}
            </div>
          }
        />
      </SectionCard>
    </>
  );
}

export default JournalsList;
