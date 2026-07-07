"use client";

import { PageHeader } from "@/components/portal/layout/page-header";
import { StatCard } from "@/components/portal/shared/stat-card";
import { SectionCard } from "@/components/portal/shared/section-card";
import { DataTable, type Column } from "@/components/portal/shared/data-table";
import { EmptyState } from "@/components/portal/shared/empty-state";
import { JournalStatusBadge } from "@/components/portal/shared/badges";
import { ProgressBar } from "@/components/portal/shared/progress-ring";
import { ClockWidget } from "@/components/portal/shared/clock-widget";
import { WeeklyGoalWidget } from "@/components/portal/shared/weekly-goal-widget";
import { ToolsStatusBanner } from "@/components/portal/shared/tools-status-banner";
import { JournalStatusCard } from "@/components/portal/shared/journal-status-card";
import { ExternalLink } from "@/components/portal/shared/external-link";
import { StatCardSkeleton, TableSkeleton } from "@/components/portal/shared/skeletons";
import { useInitialLoading } from "@/components/portal/shared/page-transition";
import { useAppStore } from "@/store/use-app-store";
import {
  averageScore,
  evaluationsForStudent,
  formatDate,
  greeting,
  hoursPercent,
  journalsForStudent,
  weekLabel,
} from "@/lib/selectors";
import { RATING_CRITERIA, type Journal, type ToolsConfig } from "@/lib/types";
import { Button } from "@/components/ui/button";
import {
  ChevronRight,
  Clock,
  Hourglass,
  NotebookText,
  Plus,
  CheckCircle2,
  FolderOpen,
  FileText,
  ExternalLink as ExternalLinkIcon,
} from "lucide-react";

export function StudentDashboard() {
  const currentUser = useAppStore((s) => s.currentUser);
  const students = useAppStore((s) => s.students);
  const journals = useAppStore((s) => s.journals);
  const evaluations = useAppStore((s) => s.evaluations);
  const toolsConfig = useAppStore((s) => s.toolsConfig);
  const navigate = useAppStore((s) => s.navigate);
  const loading = useInitialLoading(380);

  const student = students.find((s) => s.id === currentUser?.studentId);

  if (!student) {
    return (
      <EmptyState
        icon={NotebookText}
        title="Student record not found"
        description="We couldn't load your student profile."
        tone="red"
      />
    );
  }

  const myJournals = journalsForStudent(journals, student.id);
  const myEvaluations = evaluationsForStudent(evaluations, student.id);
  const pendingCount = myJournals.filter((j) => j.status === "pending").length;
  const rejectedJournals = myJournals.filter((j) => j.status === "rejected");
  const recentJournals = myJournals.slice(0, 5);
  const latestEval = myEvaluations.find((e) => e.status === "submitted") ?? myEvaluations[0];
  const pct = hoursPercent(student);
  const firstName = student.name.split(" ")[0];

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
          className="h-7"
          onClick={(e) => {
            e.stopPropagation();
            navigate("student.journal-view", { journalId: j.id });
          }}
        >
          View <ChevronRight className="h-3.5 w-3.5" />
        </Button>
      ),
    },
  ];

  if (loading) {
    return (
      <>
        <PageHeader
          breadcrumb="Dashboard"
          description={`${greeting()}, ${firstName}. Here's a snapshot of your practicum.`}
          actions={
            <Button size="sm" onClick={() => navigate("student.journal-new")}>
              <Plus className="h-4 w-4" /> New Journal
            </Button>
          }
        />
        <div className="space-y-4">
          <div className="h-[44px] animate-pulse rounded-xl bg-muted/60" />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <StatCardSkeleton count={3} />
          </div>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <TableSkeleton rows={3} cols={3} />
            <TableSkeleton rows={3} cols={3} />
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader
        breadcrumb="Dashboard"
        title={`${greeting()}, ${firstName}`}
        description="Your practicum at a glance."
        actions={
          <Button size="sm" onClick={() => navigate("student.journal-new")}>
            <Plus className="h-4 w-4" /> New Journal
          </Button>
        }
      />

      <div className="space-y-4">
        {/* Clock status — slim bar */}
        <ClockWidget />

        {/* KPI row */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <StatCard
            label="Required Hours"
            value={student.requiredHours}
            icon={Clock}
            tone="teal"
            hint="Total to complete"
            compact
          />
          <StatCard
            label="Hours Logged"
            value={`${student.loggedHours}/${student.requiredHours}`}
            icon={Hourglass}
            tone="emerald"
            hint={`${pct}% complete`}
            compact
          />
          <StatCard
            label="Pending Journals"
            value={pendingCount}
            icon={NotebookText}
            tone="amber"
            hint="Awaiting supervisor review"
            compact
          />
        </div>

        {/* v5: Practicum Tools — external links + this week's journal card. */}
        <PracticumToolsSection
          toolsConfig={toolsConfig}
          latestJournal={myJournals[0] ?? null}
          requiredHours={student.requiredHours}
          loggedHours={student.loggedHours}
        />

        {/* Weekly goal + action needed — 2-col */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-4">
            <WeeklyGoalWidget studentId={student.id} />
            <SectionCard
              title="Action needed"
              description={rejectedJournals.length > 0 ? `${rejectedJournals.length} journal${rejectedJournals.length === 1 ? "" : "s"} require revision` : "Journals requiring your attention"}
            >
              {rejectedJournals.length === 0 ? (
                <EmptyState
                  icon={CheckCircle2}
                  title="You're all caught up"
                  description="No rejected journals. Keep up the great work!"
                  tone="emerald"
                  compact
                />
              ) : (
                <ul className="space-y-2">
                  {rejectedJournals.map((j) => (
                    <li
                      key={j.id}
                      className="flex flex-col gap-2 rounded-lg border border-amber-200 bg-amber-50/50 p-3 dark:border-amber-900 dark:bg-amber-950/20 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-foreground">
                          {formatDate(j.date)} · {weekLabel(j.date)}
                        </p>
                        <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                          <span className="font-medium text-amber-800 dark:text-amber-300">
                            Reason:
                          </span>{" "}
                          {j.rejectionReason ?? "Please review and resubmit."}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="shrink-0 h-8"
                        onClick={() =>
                          navigate("student.journal-view", { journalId: j.id })
                        }
                      >
                        Edit <ChevronRight className="h-3.5 w-3.5" />
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </SectionCard>
          </div>

          <SectionCard
            title="Latest evaluation"
            actions={
              latestEval ? (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7"
                  onClick={() =>
                    navigate("student.evaluation-view", {
                      evaluationId: latestEval.id,
                    })
                  }
                >
                  View <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              ) : undefined
            }
          >
            {latestEval ? (
              <div className="space-y-3">
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold tabular-nums text-foreground">
                    {averageScore(latestEval).toFixed(1)}
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    / 5.0 average
                  </span>
                </div>
                <div className="space-y-1.5">
                  {RATING_CRITERIA.map((c) => {
                    const score = latestEval[c.key];
                    return (
                      <div key={c.key} className="space-y-0.5">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-muted-foreground">{c.label}</span>
                          <span className="font-medium tabular-nums text-foreground">
                            {score}/5
                          </span>
                        </div>
                        <ProgressBar value={(score / 5) * 100} />
                      </div>
                    );
                  })}
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Submitted {formatDate(latestEval.submittedAt)}
                </p>
              </div>
            ) : (
              <EmptyState
                icon={NotebookText}
                title="No evaluations yet"
                description="Your supervisor hasn't submitted an evaluation for you this term."
                tone="amber"
                compact
              />
            )}
          </SectionCard>
        </div>

        {/* Recent journals — denser table */}
        <SectionCard
          title="Recent journals"
          description="Your last 5 entries"
          actions={
            <Button
              variant="ghost"
              size="sm"
              className="h-7"
              onClick={() => navigate("student.journals")}
            >
              View all <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          }
          noPadding
          contentClassName="p-0"
        >
          <DataTable
            columns={columns}
            rows={recentJournals}
            getRowId={(j) => j.id}
            defaultSortKey="date"
            defaultSortDir="desc"
            rowAccent={(j) =>
              j.status === "rejected" ? "amber" : undefined
            }
            onRowClick={(j) =>
              navigate("student.journal-view", { journalId: j.id })
            }
            mobileCard={(j) => (
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-foreground">
                    {formatDate(j.date)}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {weekLabel(j.date)} · {j.hours}h
                  </p>
                </div>
                <JournalStatusBadge status={j.status} />
              </div>
            )}
            emptyState={
              <div className="p-4">
                <EmptyState
                  icon={NotebookText}
                  title="No journals yet"
                  description="Submit your first weekly journal to start tracking your practicum hours."
                  actionLabel="New Journal"
                  onAction={() => navigate("student.journal-new")}
                  tone="teal"
                  compact
                />
              </div>
            }
          />
        </SectionCard>
      </div>
    </>
  );
}

/**
 * PracticumToolsSection — v5 free-first integration.
 * Shows 3 cards: this week's journal (with external Doc link + submit),
 * hours (with Jibble link), files (with Drive link).
 * If no tools are connected, shows the banner + an EmptyState prompt.
 */
function PracticumToolsSection({
  toolsConfig,
  latestJournal,
  requiredHours,
  loggedHours,
}: {
  toolsConfig: ToolsConfig;
  latestJournal: Journal | null;
  requiredHours: number;
  loggedHours: number;
}) {
  const connected = [
    toolsConfig.driveFolderUrl.trim(),
    toolsConfig.journalTemplateUrl.trim(),
    toolsConfig.formUrl.trim(),
    toolsConfig.jibbleInviteUrl.trim(),
  ].filter(Boolean).length;

  // Not connected at all — show banner + empty state.
  if (connected === 0) {
    return (
      <div className="space-y-2.5">
        <ToolsStatusBanner role="student" />
        <div className="rounded-xl border border-dashed border-border bg-muted/20 p-4 text-center">
          <p className="text-xs text-muted-foreground">
            Once your coordinator connects practicum tools, you'll see your
            weekly journal, hours, and files here.
          </p>
        </div>
      </div>
    );
  }

  const hoursPct = Math.min(100, Math.round((loggedHours / requiredHours) * 100));

  return (
    <div className="space-y-2.5">
      <ToolsStatusBanner role="student" />
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        {/* This week's journal */}
        <div className="space-y-1.5">
          <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <FileText className="h-3.5 w-3.5" />
            This week's journal
          </p>
          <JournalStatusCard
            journal={latestJournal}
            role="student"
            journalTemplateUrl={toolsConfig.journalTemplateUrl}
          />
        </div>

        {/* Hours */}
        <div className="space-y-1.5">
          <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <Hourglass className="h-3.5 w-3.5" />
            Hours
          </p>
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-baseline justify-between">
              <p className="text-2xl font-bold tabular-nums text-foreground">
                {loggedHours}
                <span className="text-sm font-normal text-muted-foreground">/{requiredHours}</span>
              </p>
              <span className="text-xs font-medium text-muted-foreground">{hoursPct}%</span>
            </div>
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-emerald-500 transition-all"
                style={{ width: `${hoursPct}%` }}
              />
            </div>
            <div className="mt-3">
              <ExternalLink
                href={toolsConfig.jibbleInviteUrl}
                label="Open Jibble"
                icon={Clock}
                variant="button"
              />
            </div>
          </div>
        </div>

        {/* Files */}
        <div className="space-y-1.5">
          <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <FolderOpen className="h-3.5 w-3.5" />
            My files
          </p>
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-xs leading-snug text-muted-foreground">
              Your Google Drive folder for journals and submission files.
            </p>
            <div className="mt-3">
              <ExternalLink
                href={toolsConfig.driveFolderUrl}
                label="Open Drive"
                icon={FolderOpen}
                variant="button"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
