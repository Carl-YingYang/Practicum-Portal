"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import {
  Users,
  ClipboardCheck,
  FileCheck2,
  ArrowRight,
  FileText,
  CheckCircle2,
  ChevronRight,
} from "lucide-react";
import { useAppStore } from "@/store/use-app-store";
import {
  studentsForSupervisor,
  pendingJournalsForSupervisor,
  unevaluatedInterns,
  evaluationsForSupervisor,
  evaluationsForStudent,
  averageScore,
  greeting,
  getStudent,
  getCompany,
  getSupervisor,
  formatDate,
} from "@/lib/selectors";
import { PageHeader } from "@/components/portal/layout/page-header";
import { StatCard } from "@/components/portal/shared/stat-card";
import { SectionCard } from "@/components/portal/shared/section-card";
import { InternCard } from "@/components/portal/shared/intern-card";
import { Avatar } from "@/components/portal/shared/avatar";
import { ScoreBadge } from "@/components/portal/shared/badges";
import { EmptyState } from "@/components/portal/shared/empty-state";
import { JournalStatusCard } from "@/components/portal/shared/journal-status-card";
import { ToolsStatusBanner } from "@/components/portal/shared/tools-status-banner";
import { StatCardSkeleton, TableSkeleton } from "@/components/portal/shared/skeletons";
import { useInitialLoading } from "@/components/portal/shared/page-transition";
import { QuickComposePopover } from "@/components/portal/shared/quick-compose-popover";
import { Button } from "@/components/ui/button";

export function SupervisorDashboard() {
  const currentUser = useAppStore((s) => s.currentUser);
  const students = useAppStore((s) => s.students);
  const journals = useAppStore((s) => s.journals);
  const evaluations = useAppStore((s) => s.evaluations);
  const companies = useAppStore((s) => s.companies);
  const supervisors = useAppStore((s) => s.supervisors);
  const navigate = useAppStore((s) => s.navigate);
  const loading = useInitialLoading(400);

  const supervisorId = currentUser?.supervisorId ?? "";
  const supervisor = getSupervisor(supervisors, supervisorId);
  const company = supervisor ? getCompany(companies, supervisor.companyId) : undefined;

  const interns = useMemo(
    () => studentsForSupervisor(students, supervisorId),
    [students, supervisorId]
  );
  const pendingJournals = useMemo(
    () => pendingJournalsForSupervisor(journals, students, supervisorId),
    [journals, students, supervisorId]
  );
  const unevaluated = useMemo(
    () => unevaluatedInterns(students, evaluations, supervisorId),
    [students, evaluations, supervisorId]
  );
  const recentEvaluations = useMemo(
    () =>
      evaluationsForSupervisor(evaluations, supervisorId)
        .filter((e) => e.status === "submitted")
        .slice(0, 5),
    [evaluations, supervisorId]
  );

  if (loading) {
    return (
      <div>
        <PageHeader
          title={`${greeting()}, ${currentUser?.name?.split(" ")[0] ?? "Supervisor"}`}
          description="Here's what needs your attention today."
          actions={
            <span className="inline-flex items-center rounded-full border border-teal-200 bg-teal-50 px-2.5 py-0.5 text-xs font-medium text-teal-800 dark:border-teal-900 dark:bg-teal-950/40 dark:text-teal-300">
              Company Supervisor{company ? ` · ${company.name}` : ""}
            </span>
          }
        />
        <div className="mb-4 h-[44px] animate-pulse rounded-xl bg-muted/60" />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <StatCardSkeleton count={3} />
        </div>
        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <TableSkeleton rows={3} cols={2} />
          <TableSkeleton rows={3} cols={2} />
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title={`${greeting()}, ${currentUser?.name?.split(" ")[0] ?? "Supervisor"}`}
        description="Here's what needs your attention today."
        actions={
          <span className="inline-flex items-center rounded-full border border-teal-200 bg-teal-50 px-2.5 py-0.5 text-xs font-medium text-teal-800 dark:border-teal-900 dark:bg-teal-950/40 dark:text-teal-300">
            Company Supervisor{company ? ` · ${company.name}` : ""}
          </span>
        }
      />

      <div className="space-y-4">
        {/* KPI row */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <StatCard
            label="Assigned Interns"
            value={interns.length}
            icon={Users}
            tone="teal"
            hint={`${unevaluated.length} need evaluation`}
            compact
          />
          <StatCard
            label="Pending Evaluations"
            value={unevaluated.length}
            icon={ClipboardCheck}
            tone="amber"
            hint="Interns without a submitted eval"
            compact
          />
          <StatCard
            label="Journals to Review"
            value={pendingJournals.length}
            icon={FileCheck2}
            tone="emerald"
            hint="Awaiting your approval"
            compact
          />
        </div>

        {/* v5: Tools status — informational for supervisors. */}
        <ToolsStatusBanner role="supervisor" />

        {/* v5: Pending my review — inline Approve / Return (no navigation). */}
        <SectionCard
          title="Pending my review"
          description={`${pendingJournals.length} journal${pendingJournals.length === 1 ? "" : "s"} awaiting your approval.`}
        >
          {pendingJournals.length === 0 ? (
            <EmptyState
              icon={CheckCircle2}
              title="You're all caught up"
              description="No journals are waiting for your review right now."
              tone="emerald"
              compact
            />
          ) : (
            <>
              {/* Density budget (v3 §2.1): max 5, then scroll + View all. */}
              <div className="max-h-[28rem] space-y-2.5 overflow-y-auto pr-1 [scrollbar-width:thin] [scrollbar-color:theme(colors.muted-foreground/40)_transparent]">
                {pendingJournals.slice(0, 5).map((j) => {
                  const stu = students.find((s) => s.id === j.studentId);
                  return (
                    <JournalStatusCard
                      key={j.id}
                      journal={j}
                      role="supervisor"
                      studentName={stu?.name}
                      compact
                    />
                  );
                })}
              </div>
              {pendingJournals.length > 5 && (
                <div className="mt-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-full"
                    onClick={() => navigate("supervisor.journals")}
                  >
                    View all {pendingJournals.length} pending
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
              )}
            </>
          )}
        </SectionCard>

        {/* 2-col: My Interns + Recent Evaluations */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-foreground">My Interns</h2>
              <Button
                variant="ghost"
                size="sm"
                className="h-7"
                onClick={() => navigate("supervisor.interns")}
              >
                View all
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </div>
            {interns.length === 0 ? (
              <EmptyState
                icon={Users}
                title="No interns assigned"
                description="You don't have any interns assigned to you yet."
                tone="slate"
                compact
              />
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {interns.slice(0, 4).map((s) => {
                  const studentEvals = evaluationsForStudent(evaluations, s.id).filter(
                    (e) => e.supervisorId === supervisorId
                  );
                  const submitted = studentEvals.find((e) => e.status === "submitted");
                  return (
                    <InternCard
                      key={s.id}
                      student={s}
                      companyName={company?.name}
                      lastScore={submitted ? averageScore(submitted) : undefined}
                      hasEvaluation={!!submitted}
                      onOpen={() =>
                        navigate("supervisor.intern-view", { studentId: s.id })
                      }
                      onEvaluate={() => {
                        const draft = studentEvals.find((e) => e.status === "draft");
                        if (submitted) {
                          navigate("supervisor.intern-view", { studentId: s.id });
                        } else if (draft) {
                          navigate("supervisor.evaluation-new", {
                            evaluationId: draft.id,
                          });
                        } else {
                          navigate("supervisor.evaluation-new", {
                            preselectStudentId: s.id,
                          });
                        }
                      }}
                      evaluateLabel={submitted ? "View" : "Evaluate"}
                    />
                  );
                })}
              </div>
            )}
          </div>

          <div>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-foreground">Recent Evaluations</h2>
              <Button
                variant="ghost"
                size="sm"
                className="h-7"
                onClick={() => navigate("supervisor.evaluations")}
              >
                View all
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </div>
            {recentEvaluations.length === 0 ? (
              <EmptyState
                icon={FileText}
                title="No submitted evaluations yet"
                description="Once you submit an evaluation, it will appear here."
                tone="slate"
                compact
              />
            ) : (
              <ul className="divide-y divide-border/60 overflow-hidden rounded-2xl border border-border/60 bg-card">
                {recentEvaluations.map((e) => {
                  const student = getStudent(students, e.studentId);
                  if (!student) return null;
                  return (
                    <li
                      key={e.id}
                      className="flex cursor-pointer items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/40"
                      onClick={() =>
                        navigate("supervisor.evaluation-view", {
                          evaluationId: e.id,
                        })
                      }
                    >
                      <Avatar name={student.name} size="sm" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-foreground">
                          {student.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(e.submittedAt)}
                        </p>
                      </div>
                      <ScoreBadge score={averageScore(e)} />
                      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/60" />
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>

        {/* Messages CTA — quick-compose to coordinator */}
        <QuickComposePopover
          messagesView="supervisor.messages"
          ctaLabel="Message the Coordinator"
          counterpartLabel="Coordinator"
        />
      </div>
    </div>
  );
}
