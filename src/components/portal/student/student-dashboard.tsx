"use client";

import { PageHeader } from "@/components/portal/layout/page-header";
import { SectionCard } from "@/components/portal/shared/section-card";
import { EmptyState } from "@/components/portal/shared/empty-state";
import { ProgressRing } from "@/components/portal/shared/progress-ring";
import { TimeClockView } from "@/components/portal/shared/time-clock-view";
import { useInitialLoading } from "@/components/portal/shared/page-transition";
import { StatCardSkeleton } from "@/components/portal/shared/skeletons";
import { useAppStore } from "@/store/use-app-store";
import { greeting, hoursPercent } from "@/lib/selectors";
import type { Student } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  Lock,
  Hourglass,
  Building2,
  UserCheck,
  Timer,
  NotebookText,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";

/**
 * ============================================================================
 * STATE-DRIVEN WORKSPACE — Student Dashboard
 * ============================================================================
 *
 * Students enter the system via bulk upload, so they may have an account but
 * NOT yet an assigned Company/Supervisor. The dashboard therefore branches on
 * deployment state:
 *
 *   • LOCKED   (supervisorId == null) → Pending Deployment empty state.
 *   • ACTIVE   (supervisorId != null) → Time clock + Progress + Weekly Journal.
 *
 * The `isDeployed` mock toggle below lets you force either view for testing
 * without a real backend. Flip it to `true` to preview the ActiveWorkspace.
 * ============================================================================
 */

// ─── MOCK TOGGLE ───────────────────────────────────────────────────────────
// Temporary mock: when the backend is wired, derive this from the student's
// real assignment: `const isDeployed = Boolean(student?.supervisorId);`
// Set to `false` to preview the LockedWorkspace, `true` for the ActiveWorkspace.
const isDeployed = false;
// ───────────────────────────────────────────────────────────────────────────

/** BSCS OJT required-hour ceiling used by the progress ring. */
const REQUIRED_HOURS_BSCS = 250;

export function StudentDashboard() {
  const currentUser = useAppStore((s) => s.currentUser);
  const students = useAppStore((s) => s.students);
  const loading = useInitialLoading(380);

  const student = students.find((s) => s.id === currentUser?.studentId);
  const firstName = student?.name.split(" ")[0] ?? "Student";

  // Loading skeleton — slim, role-aware.
  if (loading) {
    return (
      <>
        <PageHeader
          breadcrumb="Dashboard"
          description={`${greeting()}, ${firstName}. Here's a snapshot of your practicum.`}
        />
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <StatCardSkeleton count={3} />
          </div>
          <div className="h-64 animate-pulse rounded-xl bg-muted/60" />
        </div>
      </>
    );
  }

  if (!student) {
    return (
      <EmptyState
        icon={NotebookText}
        title="Student record not found"
        description="We couldn't load your student profile. Please contact your coordinator."
        tone="red"
      />
    );
  }

  // Branch on deployment state.
  return isDeployed ? (
    <ActiveWorkspace student={student} />
  ) : (
    <LockedWorkspace student={student} firstName={firstName} />
  );
}

/* ========================================================================== */
/*  LOCKED WORKSPACE — Pending Deployment State                               */
/* ========================================================================== */

interface LockedWorkspaceProps {
  student: Student;
  firstName: string;
}

function LockedWorkspace({ student, firstName }: LockedWorkspaceProps) {
  return (
    <>
      <PageHeader
        breadcrumb="Dashboard"
        title={`${greeting()}, ${firstName}`}
        description="Your OJT workspace is being prepared."
      />

      <div className="flex min-h-[calc(100vh-12rem)] items-center justify-center py-6">
        <Card
          className={cn(
            "relative w-full max-w-xl overflow-hidden border-border/50 bg-zinc-950 py-0 text-zinc-100 shadow-2xl",
            "ring-1 ring-zinc-800/60"
          )}
        >
          {/* Ambient glow */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-70"
            style={{
              background:
                "radial-gradient(60% 50% at 50% 0%, rgba(45,212,191,0.16), transparent 70%), radial-gradient(40% 40% at 50% 100%, rgba(245,158,11,0.10), transparent 70%)",
            }}
          />
          {/* Subtle top hairline */}
          <div
            aria-hidden
            className="h-px w-full bg-gradient-to-r from-transparent via-zinc-700 to-transparent"
          />

          <div className="relative flex flex-col items-center px-6 py-12 text-center sm:px-10 sm:py-14">
            {/* Icon — prominent lock in a glowing chip */}
            <div className="relative mb-6">
              <div
                aria-hidden
                className="absolute inset-0 animate-pulse rounded-2xl bg-teal-500/20 blur-xl"
              />
              <div className="relative flex h-20 w-20 items-center justify-center rounded-2xl border border-zinc-700/80 bg-zinc-900/80 shadow-inner">
                <Lock className="h-9 w-9 text-teal-300" strokeWidth={1.75} />
              </div>
              {/* hourglass accent */}
              <span className="absolute -bottom-2 -right-2 flex h-7 w-7 items-center justify-center rounded-full border border-zinc-700 bg-zinc-900">
                <Hourglass className="h-3.5 w-3.5 text-amber-300" />
              </span>
            </div>

            {/* Status pill */}
            <span className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-zinc-700/80 bg-zinc-900/60 px-3 py-1 text-[11px] font-medium uppercase tracking-wide text-zinc-400">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-400" />
              Pending Deployment
            </span>

            <h1 className="font-heading text-2xl font-bold tracking-tight text-zinc-50 sm:text-3xl">
              Awaiting OJT Deployment
            </h1>

            <p className="mt-3 max-w-md text-sm leading-relaxed text-zinc-400 sm:text-[15px]">
              Welcome to the OJT Portal! Your timesheet and journal features are
              currently locked. They will automatically unlock as soon as your
              Coordinator officially assigns your Company and Supervisor.
            </p>

            {/* What's pending — three subtle hint chips */}
            <div className="mt-8 grid w-full max-w-md grid-cols-1 gap-2.5 sm:grid-cols-3">
              <PendingHint
                icon={Building2}
                label="Company"
                pending={!student.companyId}
              />
              <PendingHint
                icon={UserCheck}
                label="Supervisor"
                pending={!student.supervisorId}
              />
              <PendingHint icon={Timer} label="Timesheet" pending />
            </div>

            {/* Footer reassurance */}
            <div className="mt-8 flex items-center gap-2 rounded-lg border border-zinc-800/80 bg-zinc-900/50 px-4 py-2.5 text-xs text-zinc-500">
              <Sparkles className="h-3.5 w-3.5 text-teal-300/80" />
              <span>
                No action needed — you'll be notified the moment your deployment
                is confirmed.
              </span>
            </div>

            {/* Student context strip */}
            <div className="mt-6 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[11px] text-zinc-500">
              <span className="font-mono">{student.studentNumber}</span>
              <span className="text-zinc-700">•</span>
              <span>{student.course}</span>
              <span className="text-zinc-700">•</span>
              <span>{student.requiredHours}h required</span>
            </div>
          </div>
        </Card>
      </div>
    </>
  );
}

function PendingHint({
  icon: Icon,
  label,
  pending,
}: {
  icon: typeof Lock;
  label: string;
  pending: boolean;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-1.5 rounded-lg border px-3 py-3 text-center transition-colors",
        pending
          ? "border-zinc-800 bg-zinc-900/40"
          : "border-emerald-800/40 bg-emerald-950/20"
      )}
    >
      <Icon
        className={cn(
          "h-4 w-4",
          pending ? "text-zinc-500" : "text-emerald-400"
        )}
        strokeWidth={1.75}
      />
      <span
        className={cn(
          "text-[11px] font-medium",
          pending ? "text-zinc-400" : "text-emerald-300"
        )}
      >
        {label}
      </span>
      <span
        className={cn(
          "text-[10px] uppercase tracking-wide",
          pending ? "text-zinc-600" : "text-emerald-500/80"
        )}
      >
        {pending ? "Pending" : "Ready"}
      </span>
    </div>
  );
}

/* ========================================================================== */
/*  ACTIVE WORKSPACE — Execution Phase State                                  */
/* ========================================================================== */

interface ActiveWorkspaceProps {
  student: Student;
}

function ActiveWorkspace({ student }: ActiveWorkspaceProps) {
  const navigate = useAppStore((s) => s.navigate);

  // Live progress against the 250-hour BSCS requirement.
  const loggedHours = student.loggedHours;
  const pct = hoursPercent(student);
  const remaining = Math.max(0, REQUIRED_HOURS_BSCS - loggedHours);

  const handleDraftJournal = () => {
    toast.info("Opening weekly journal draft…", {
      description: "A new journal entry is being prepared for this week.",
    });
    navigate("student.journal-new");
  };

  return (
    <>
      <PageHeader
        breadcrumb="Dashboard"
        title={`${greeting()}, ${student.name.split(" ")[0]}`}
        description="Your practicum workspace is live. Clock in, track progress, and keep your journal current."
      />

      <div className="space-y-4">
        {/* ── Responsive 2-column grid: Time Clock (Col 1) + Progress (Col 2) ── */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {/* Column 1 — Main Action: Time Clock */}
          <div className="lg:col-span-1">
            <TimeClockViewCompact />
          </div>

          {/* Column 2 — Progress: 250-hour BSCS ring + breakdown */}
          <SectionCard
            title="OJT Hour Progress"
            description="BSCS practicum requirement"
            contentClassName="p-5 sm:p-6"
          >
            <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-center sm:gap-6">
              {/* Progress ring */}
              <div className="flex shrink-0 flex-col items-center">
                <ProgressRing
                  value={pct}
                  size={148}
                  strokeWidth={12}
                  label="complete"
                />
              </div>

              {/* Numeric breakdown */}
              <div className="flex-1 space-y-3">
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                    Hours Rendered
                  </p>
                  <p className="mt-0.5 font-mono text-3xl font-bold tabular-nums text-foreground">
                    {loggedHours}
                    <span className="text-base font-medium text-muted-foreground">
                      {" "}
                      / {REQUIRED_HOURS_BSCS}
                    </span>
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {loggedHours} hours rendered out of {REQUIRED_HOURS_BSCS}
                  </p>
                </div>

                <div className="h-px w-full bg-border/60" />

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                      Remaining
                    </p>
                    <p className="mt-0.5 font-mono text-lg font-semibold tabular-nums text-foreground">
                      {remaining}h
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                      Completion
                    </p>
                    <p className="mt-0.5 font-mono text-lg font-semibold tabular-nums text-foreground">
                      {pct}%
                    </p>
                  </div>
                </div>

                {/* Status strip */}
                <div
                  className={cn(
                    "flex items-center gap-2 rounded-lg border px-3 py-2 text-xs",
                    pct >= 100
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-300"
                      : pct >= 60
                        ? "border-emerald-200 bg-emerald-50/60 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/20 dark:text-emerald-300"
                        : "border-amber-200 bg-amber-50/60 text-amber-700 dark:border-amber-900/50 dark:bg-amber-950/20 dark:text-amber-300"
                  )}
                >
                  {pct >= 100 ? (
                    <>
                      <Sparkles className="h-3.5 w-3.5" />
                      Requirement complete — outstanding work!
                    </>
                  ) : pct >= 60 ? (
                    <>
                      <Hourglass className="h-3.5 w-3.5" />
                      On track — {remaining}h to go.
                    </>
                  ) : (
                    <>
                      <Hourglass className="h-3.5 w-3.5" />
                      Just getting started — keep logging hours.
                    </>
                  )}
                </div>
              </div>
            </div>
          </SectionCard>
        </div>

        {/* ── Below the grid: Weekly Journal action card ── */}
        <SectionCard
          title="Weekly Journal"
          description="Reflect on this week's practicum activities"
          contentClassName="p-5 sm:p-6"
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-teal-50 text-teal-600 dark:bg-teal-950/40 dark:text-teal-300">
                <NotebookText className="h-5 w-5" strokeWidth={1.75} />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground">
                  This week's journal entry
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Unlocks every Friday or after 40 logged hours.
                </p>
              </div>
            </div>

            <div className="flex shrink-0 flex-col items-stretch gap-1.5 sm:items-end">
              <Button onClick={handleDraftJournal} className="h-10">
                <NotebookText className="h-4 w-4" />
                Draft Weekly Journal
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </SectionCard>
      </div>
    </>
  );
}

/**
 * Compact wrapper around the shared TimeClockView that strips its own
 * PageHeader (we already render one at the dashboard level) and constrains
 * it to a single grid column.
 */
function TimeClockViewCompact() {
  return (
    <div className="h-full">
      <TimeClockView breadcrumb="Time Clock" description="Clock in and out to track your practicum hours." />
    </div>
  );
}
