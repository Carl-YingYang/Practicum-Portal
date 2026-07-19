"use client";

import { PageHeader } from "@/components/portal/layout/page-header";
import { EmptyState } from "@/components/portal/shared/empty-state";
import { useInitialLoading } from "@/components/portal/shared/page-transition";
import { StatCardSkeleton } from "@/components/portal/shared/skeletons";
import { useAppStore } from "@/store/use-app-store";
import { greeting } from "@/lib/selectors";
import type { Student } from "@/lib/types";
import { cn } from "@/lib/utils";
import {
  Lock,
  Building2,
  UserCheck,
  Timer,
  NotebookText,
} from "lucide-react";
// New editorial bento dashboard (Active state). Aliased to avoid an
// export-name collision with this file's own `StudentDashboard` gate.
import { StudentDashboard as BentoDashboard } from "./StudentDashboard";

/**
 * ============================================================================
 * STATE-DRIVEN WORKSPACE — Student Dashboard (gate)
 * ============================================================================
 *
 * Students enter the system via bulk upload, so they may have an account but
 * NOT yet an assigned Company/Supervisor. The dashboard therefore branches on
 * deployment state:
 *
 *   • LOCKED   (supervisorId == null) → Pending Deployment empty state.
 *   • ACTIVE   (supervisorId != null) → Theme-driven Bento dashboard
 *     (slideshow + time clock + drafting room + timesheet + evaluations).
 *
 * The `isDeployed` mock toggle below lets you force either view for testing
 * without a real backend. Flip to `false` to preview the LockedWorkspace.
 * ============================================================================
 */

// ─── DEPLOYMENT STATE ──────────────────────────────────────────────────────
// Derived from the student's real assignment. Students added to the masterlist
// without a supervisor see the LockedWorkspace; once a supervisor is assigned,
// the ActiveWorkspace (bento) unlocks automatically.
// (Mock toggle removed — real logic now.)
// ───────────────────────────────────────────────────────────────────────────

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
          <div className="h-64 rounded-xl bg-muted/60" />
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

  // Branch on deployment state — real derivation from supervisor assignment.
  const isDeployed = Boolean(student?.supervisorId);
  return isDeployed ? (
    <BentoDashboard />
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
        <div className="w-full max-w-lg">
          {/* Editorial empty state — calm, flat, no dark glow */}
          <div className="flex flex-col items-center rounded-2xl border border-border/50 bg-card p-8 text-center shadow-sm sm:p-12">
            {/* Simple line-style icon — no glow, no pulse */}
            <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full border border-border/60 bg-muted/30">
              <Lock className="h-7 w-7 text-muted-foreground" strokeWidth={1.5} />
            </div>

            <span className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Pending Deployment
            </span>

            <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
              Awaiting OJT Deployment
            </h1>

            <p className="mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">
              Welcome to the OJT Portal! Your timesheet and journal features are
              currently locked. They will automatically unlock as soon as your
              Coordinator officially assigns your Company and Supervisor.
            </p>

            {/* What's pending — flat hint row */}
            <div className="mt-8 grid w-full max-w-sm grid-cols-3 gap-3">
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

            {/* Calm reassurance — no sparkles, just text */}
            <p className="mt-8 text-xs text-muted-foreground">
              No action needed — you'll be notified the moment your deployment
              is confirmed.
            </p>

            {/* Student context — flat, no mono */}
            <div className="mt-4 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
              <span>{student.studentNumber}</span>
              <span className="text-border">·</span>
              <span>{student.course}</span>
              <span className="text-border">·</span>
              <span>{student.requiredHours}h required</span>
            </div>
          </div>
        </div>
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
    <div className="flex flex-col items-center gap-1.5 rounded-lg border border-border/40 bg-background/50 px-2 py-3 text-center">
      <Icon
        className={cn(
          "h-4 w-4",
          pending ? "text-muted-foreground/60" : "text-emerald-600"
        )}
        strokeWidth={1.5}
      />
      <span className="text-xs font-medium text-foreground">{label}</span>
      <span
        className={cn(
          "text-[10px] uppercase tracking-wide",
          pending ? "text-muted-foreground/50" : "text-emerald-600"
        )}
      >
        {pending ? "Pending" : "Ready"}
      </span>
    </div>
  );
}
