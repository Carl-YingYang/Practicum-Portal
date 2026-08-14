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
  Timer,
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
import { SchoolIdentityModal } from "@/components/portal/shared/school-identity-modal";
import { StatCardSkeleton, TableSkeleton } from "@/components/portal/shared/skeletons";
import { ActiveClockMonitor } from "@/components/portal/shared/active-clock-monitor";
import { useInitialLoading } from "@/components/portal/shared/page-transition";
import { Button } from "@/components/ui/button";

export function SupervisorDashboard() {
  const currentUser = useAppStore((s) => s.currentUser);
  const students = useAppStore((s) => s.students);
  const journals = useAppStore((s) => s.journals);
  const evaluations = useAppStore((s) => s.evaluations);
  const companies = useAppStore((s) => s.companies);
  const supervisors = useAppStore((s) => s.supervisors);
  const schoolIdentity = useAppStore((s) => s.schoolIdentity);
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
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
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
    <div className="space-y-3">
      {/* Clean Page Header replacing the old image hero */}
      <PageHeader
        title={`${greeting()}, ${currentUser?.name?.split(" ")[0] ?? "Supervisor"}`}
        description="Here's what needs your attention today."
        actions={
          <span className="inline-flex items-center rounded-full border border-teal-200 bg-teal-50 px-2.5 py-0.5 text-xs font-medium text-teal-800 dark:border-teal-900 dark:bg-teal-950/40 dark:text-teal-300">
            Company Supervisor{company ? ` · ${company.name}` : ""}
          </span>
        }
      />

      {/* KPI row — 3 cards, one even row on desktop, stacked on tablet/mobile */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        <StatCard label="Assigned Interns" value={interns.length} icon={Users} tone="teal" hint={`${unevaluated.length} need evaluation`} compact />
        <StatCard label="Pending Evaluations" value={unevaluated.length} icon={ClipboardCheck} tone="amber" hint="Interns without a submitted eval" compact />
        <StatCard label="Journals to Review" value={pendingJournals.length} icon={FileCheck2} tone="emerald" hint="Awaiting your approval" compact />
      </div>

      {/* Live "who's on the clock right now" strip — hidden automatically when nobody is active */}
      <ActiveClockMonitor
        supervisorId={supervisorId}
        navigateView="supervisor.intern-view"
      />

      {/* 2-col split: Pending my review (3fr) + Right Side Info (2fr) */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <SectionCard
            title="Pending my review"
            description={`${pendingJournals.length} journal${pendingJournals.length === 1 ? "" : "s"} awaiting your approval.`}
          >
            {pendingJournals.length === 0 ? (
              <EmptyState icon={CheckCircle2} title="You're all caught up" description="No journals are waiting for your review right now." tone="emerald" compact />
            ) : (
              <>
                <div className="max-h-[28rem] space-y-2.5 overflow-y-auto pr-1 [scrollbar-width:thin] [scrollbar-color:theme(colors.muted-foreground/40)_transparent]">
                  {pendingJournals.slice(0, 5).map((j) => {
                    const stu = students.find((s) => s.id === j.studentId);
                    return <JournalStatusCard key={j.id} journal={j} role="supervisor" studentName={stu?.name} compact />;
                  })}
                </div>
                {pendingJournals.length > 5 && (
                  <div className="mt-2">
                    <Button variant="ghost" size="sm" className="h-8 w-full" onClick={() => navigate("supervisor.journals")}>
                      View all {pendingJournals.length} pending
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                )}
              </>
            )}
          </SectionCard>
        </div>

        {/* Right Column Stack: My Interns & Recent Evaluations */}
        <div className="lg:col-span-2 space-y-6">

          {/* My Interns Section */}
          <div>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-foreground">My Interns</h2>
              <Button variant="ghost" size="sm" className="h-7" onClick={() => navigate("supervisor.interns")}>
                View all<ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </div>
            {interns.length === 0 ? (
              <EmptyState icon={Users} title="No interns assigned" description="You don't have any interns assigned to you yet." tone="slate" compact />
            ) : (
              <ul className="divide-y divide-border/60 overflow-hidden rounded-xl border border-border/60 bg-card">
                {interns.slice(0, 5).map((s) => {
                  const studentEvals = evaluationsForStudent(evaluations, s.id).filter((e) => e.supervisorId === supervisorId);
                  const submitted = studentEvals.find((e) => e.status === "submitted");
                  return (
                    <li key={s.id} className="flex cursor-pointer items-center gap-2.5 px-3 py-2.5 transition-colors hover:bg-muted/40" onClick={() => navigate("supervisor.intern-view", { studentId: s.id })}>
                      <Avatar name={s.name} size="sm" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-foreground">{s.name}</p>
                        <p className="truncate text-[11px] text-muted-foreground">{company?.name ?? "No company"}</p>
                      </div>
                      {submitted && <ScoreBadge score={averageScore(submitted)} />}
                      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/60" />
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {/* Time Tracking Quick Action */}
          <button
            onClick={() => navigate("supervisor.time-monitor")}
            className="group flex w-full items-center gap-3 rounded-xl border border-border/60 bg-card p-3.5 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-teal-300 hover:shadow-md dark:hover:border-teal-800"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-700 dark:bg-teal-950/40 dark:text-teal-300 transition-transform duration-200 group-hover:scale-110">
              <Timer className="h-5 w-5" strokeWidth={2} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-foreground">Time Tracking</p>
              <p className="text-xs text-muted-foreground">Monitor intern clock-in/out in real time</p>
            </div>
            <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/50 transition-transform group-hover:translate-x-0.5 group-hover:text-foreground/70" />
          </button>

          {/* Recent Evaluations Section */}
          <div>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-foreground">Recent Evaluations</h2>
              <Button variant="ghost" size="sm" className="h-7" onClick={() => navigate("supervisor.evaluations")}>
                View all<ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </div>
            {recentEvaluations.length === 0 ? (
              <EmptyState icon={FileText} title="No submitted evaluations yet" description="Once you submit an evaluation, it will appear here." tone="slate" compact />
            ) : (
              <ul className="divide-y divide-border/60 overflow-hidden rounded-xl border border-border/60 bg-card">
                {recentEvaluations.map((e) => {
                  const student = getStudent(students, e.studentId);
                  if (!student) return null;
                  return (
                    <li key={e.id} className="flex cursor-pointer items-center gap-3 px-4 py-2.5 transition-colors hover:bg-muted/40" onClick={() => navigate("supervisor.evaluation-view", { evaluationId: e.id })}>
                      <Avatar name={student.name} size="sm" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-foreground">{student.name}</p>
                        <p className="text-xs text-muted-foreground">{formatDate(e.submittedAt)}</p>
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
      </div>
    </div>
  );
}
