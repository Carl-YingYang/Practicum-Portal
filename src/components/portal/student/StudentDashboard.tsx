"use client";

import * as React from "react";
import { useAppStore } from "@/store/use-app-store";
import {
  ACCENT_CLASSES,
  SCHOOL_ID,
  useSchoolTheme,
} from "@/store/useThemeStore";
import { DashboardSlideshow } from "@/components/portal/shared/DashboardSlideshow";
import { ProgressRing } from "@/components/portal/shared/progress-ring";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  activeTimeLog,
  averageScore,
  elapsedMs,
  evaluationsForStudent,
  formatDuration,
  formatTimer,
  formatTime,
  greeting,
  hoursPercent,
  todaysTimeLogs,
  weeklyTimeMs,
} from "@/lib/selectors";
import { toast } from "sonner";
import {
  Play,
  Square,
  Clock,
  CalendarDays,
  Hourglass,
  NotebookText,
  ChevronRight,
  FileText,
  Sparkles,
  Timer,
} from "lucide-react";

/* ========================================================================== */
/*  StudentDashboard — Calm Editorial Bento (theme-driven)                    */
/*  ------------------------------------------------------------------------  */
/*  Reads the school theme from `useThemeStore` (customized by supervisors).  */
/*  Renders a fixed-aspect slideshow + a responsive bento grid of 4 cards.    */
/*  Toggling a card off in the Customize sheet removes it here without CLS.   */
/* ========================================================================== */

/** BSCS OJT required-hour ceiling. */
const REQUIRED_HOURS = 250;

/** Live 1s ticker for the active clock session. */
function useTicker(ms = 1000): number {
  const [now, setNow] = React.useState(() => Date.now());
  React.useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), ms);
    return () => window.clearInterval(id);
  }, [ms]);
  return now;
}

export function StudentDashboard() {
  const currentUser = useAppStore((s) => s.currentUser);
  const students = useAppStore((s) => s.students);
  const timeLogs = useAppStore((s) => s.timeLogs);
  const evaluations = useAppStore((s) => s.evaluations);
  const clockIn = useAppStore((s) => s.clockIn);
  const clockOut = useAppStore((s) => s.clockOut);
  const navigate = useAppStore((s) => s.navigate);

  // Theme — same key the supervisor edits in CustomizeSheet.
  const theme = useSchoolTheme(SCHOOL_ID);
  const accent = ACCENT_CLASSES[theme.accentColor];
  const visible = theme.visibleCards;

  const student = students.find((s) => s.id === currentUser?.studentId);
  const firstName = student?.name.split(" ")[0] ?? "Student";

  if (!student) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-sm text-muted-foreground">
          Student record not found. Please contact your coordinator.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Slim greeting header */}
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            Dashboard
          </p>
          <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            {greeting()}, {firstName}
          </h1>
        </div>
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium",
            accent.bg,
            accent.text,
          )}
        >
          <Sparkles className="h-3 w-3" />
          {theme.accentColor === "sage"
            ? "Sage"
            : theme.accentColor === "terracotta"
              ? "Terracotta"
              : "Slate"}{" "}
          theme
        </span>
      </div>

      {/* Slideshow — full width, zero CLS */}
      <DashboardSlideshow />

      {/* Bento grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 auto-rows-[minmax(168px,auto)]">
        {visible.includes("time_clock") && (
          <BentoCard
            className="sm:col-span-2 lg:col-span-2 lg:row-span-2"
            accent={accent}
          >
            <TimeClockCard
              student={student}
              userId={student.id}
              timeLogs={timeLogs}
              clockIn={clockIn}
              clockOut={clockOut}
              accent={accent}
            />
          </BentoCard>
        )}

        {visible.includes("drafting_room") && (
          <BentoCard accent={accent}>
            <DraftingRoomCard
              accent={accent}
              onDraft={() => {
                toast.info("Opening weekly journal draft…", {
                  description: "A new journal entry is being prepared for this week.",
                });
                navigate("student.journal-new");
              }}
            />
          </BentoCard>
        )}

        {visible.includes("timesheet") && (
          <BentoCard accent={accent}>
            <TimesheetCard
              timeLogs={timeLogs}
              userId={student.id}
              accent={accent}
              onView={() => navigate("student.time-clock")}
            />
          </BentoCard>
        )}

        {visible.includes("evaluations") && (
          <BentoCard
            accent={accent}
            className="sm:col-span-2 lg:col-span-3"
          >
            <EvaluationsCard
              evaluations={evaluations}
              studentId={student.id}
              accent={accent}
              onView={() => navigate("student.evaluations")}
            />
          </BentoCard>
        )}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Bento card shell                                                          */
/* -------------------------------------------------------------------------- */

interface BentoCardProps {
  children: React.ReactNode;
  accent: (typeof ACCENT_CLASSES)[keyof typeof ACCENT_CLASSES];
  className?: string;
}

function BentoCard({ children, accent, className }: BentoCardProps) {
  return (
    <section
      className={cn(
        "relative flex flex-col overflow-hidden rounded-2xl border border-border/50 bg-card/80 shadow-sm backdrop-blur-sm",
        // Subtle accent gradient wash, top-right.
        "before:pointer-events-none before:absolute before:inset-0 before:bg-gradient-to-br before:opacity-60",
        accent.gradient,
        className,
      )}
    >
      {children}
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/*  Card 1 — Time Clock (hero, 2x2 on lg)                                    */
/* -------------------------------------------------------------------------- */

interface TimeClockCardProps {
  student: { loggedHours: number; requiredHours: number };
  userId: string;
  timeLogs: ReturnType<typeof useAppStore.getState>["timeLogs"];
  clockIn: ReturnType<typeof useAppStore.getState>["clockIn"];
  clockOut: ReturnType<typeof useAppStore.getState>["clockOut"];
  accent: BentoCardProps["accent"];
}

function TimeClockCard({
  student,
  userId,
  timeLogs,
  clockIn,
  clockOut,
  accent,
}: TimeClockCardProps) {
  const now = useTicker(1000);
  const [note, setNote] = React.useState("");

  const active = activeTimeLog(timeLogs, userId);
  const today = todaysTimeLogs(timeLogs, userId);
  const todayMs = today.reduce((sum, t) => sum + elapsedMs(t, now), 0);
  const weekMs = weeklyTimeMs(timeLogs, userId, now);

  const pct = hoursPercent(student);
  const remaining = Math.max(0, REQUIRED_HOURS - student.loggedHours);

  const handleClockIn = () => {
    clockIn(userId, "student", note.trim() || undefined);
    setNote("");
    toast.success("Clocked in", {
      description: `Started at ${formatTime(new Date().toISOString())}`,
    });
  };
  const handleClockOut = () => {
    const sessionMs = active ? elapsedMs(active, now) : 0;
    clockOut(userId, note.trim() || undefined);
    toast.success("Clocked out", {
      description: `Session logged: ${formatDuration(sessionMs)}`,
    });
  };

  return (
    <div className="relative flex h-full flex-col p-5 sm:p-6">
      {/* Status row */}
      <div className="flex items-center justify-between gap-3">
        <span
          className={cn(
            "inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset",
            active
              ? "bg-emerald-100 text-emerald-800 ring-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:ring-emerald-900/60"
              : "bg-slate-100 text-slate-600 ring-slate-200 dark:bg-slate-800/60 dark:text-slate-300 dark:ring-slate-700",
          )}
        >
          <span
            className={cn(
              "h-1.5 w-1.5 rounded-full",
              active ? "animate-pulse bg-emerald-500" : "bg-slate-400",
            )}
          />
          {active ? "On the clock" : "Clocked out"}
        </span>
        <span className="font-mono text-[11px] text-muted-foreground">
          {new Date().toLocaleDateString("en-US", {
            weekday: "long",
            month: "short",
            day: "numeric",
          })}
        </span>
      </div>

      {/* Main: timer + progress ring */}
      <div className="mt-4 flex flex-1 flex-col items-center justify-center gap-5 sm:flex-row sm:items-center sm:gap-6">
        <div className="flex-1 text-center sm:text-left">
          {active ? (
            <>
              <p className="font-mono text-4xl font-bold tabular-nums tracking-tight text-foreground sm:text-5xl">
                {formatTimer(elapsedMs(active, now))}
              </p>
              <p className="mt-1.5 text-xs text-muted-foreground">
                Clocked in at {formatTime(active.clockInAt)}
                {active.note ? ` · ${active.note}` : ""}
              </p>
            </>
          ) : (
            <>
              <p className="font-heading text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                Ready to start?
              </p>
              <p className="mt-1.5 text-xs text-muted-foreground">
                Clock in to begin tracking today's practicum hours.
              </p>
            </>
          )}

          {/* Note + action */}
          <div className="mt-4 flex flex-col gap-2 sm:max-w-xs">
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={
                active
                  ? "Add a note to this session (optional)"
                  : "What are you working on? (optional)"
              }
              className="h-9 w-full rounded-lg border border-border/70 bg-background/60 px-3 text-sm text-foreground placeholder:text-muted-foreground/70 focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/30"
            />
            {active ? (
              <Button
                variant="destructive"
                className="h-10 w-full"
                onClick={handleClockOut}
              >
                <Square className="h-4 w-4" fill="currentColor" />
                Clock Out
              </Button>
            ) : (
              <Button className="h-10 w-full" onClick={handleClockIn}>
                <Play className="h-4 w-4" fill="currentColor" />
                Clock In
              </Button>
            )}
          </div>
        </div>

        {/* Progress ring — 250h BSCS */}
        <div className="flex shrink-0 flex-col items-center">
          <ProgressRing value={pct} size={132} strokeWidth={11} label="complete" />
          <p className="mt-2 text-center text-[11px] text-muted-foreground">
            <span className="font-mono font-semibold text-foreground">
              {student.loggedHours}
            </span>{" "}
            / {REQUIRED_HOURS}h
          </p>
        </div>
      </div>

      {/* Footer mini-stats */}
      <div className="mt-5 grid grid-cols-3 gap-2 border-t border-border/50 pt-4">
        <MiniStat
          icon={Clock}
          label="Today"
          value={formatDuration(todayMs)}
          accent={accent}
        />
        <MiniStat
          icon={CalendarDays}
          label="This week"
          value={formatDuration(weekMs)}
          accent={accent}
        />
        <MiniStat
          icon={Hourglass}
          label="Remaining"
          value={`${remaining}h`}
          accent={accent}
        />
      </div>
    </div>
  );
}

function MiniStat({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: typeof Clock;
  label: string;
  value: string;
  accent: BentoCardProps["accent"];
}) {
  return (
    <div className="flex items-center gap-2">
      <span
        className={cn(
          "flex h-7 w-7 items-center justify-center rounded-lg",
          accent.bg,
          accent.text,
        )}
      >
        <Icon className="h-3.5 w-3.5" />
      </span>
      <div className="min-w-0">
        <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        <p className="font-mono text-sm font-semibold tabular-nums text-foreground">
          {value}
        </p>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Card 2 — Drafting Room (weekly journal)                                  */
/* -------------------------------------------------------------------------- */

function DraftingRoomCard({
  accent,
  onDraft,
}: {
  accent: BentoCardProps["accent"];
  onDraft: () => void;
}) {
  return (
    <div className="flex h-full flex-col p-5">
      <div className="flex items-center gap-2">
        <span
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-lg",
            accent.bg,
            accent.text,
          )}
        >
          <NotebookText className="h-4 w-4" strokeWidth={1.75} />
        </span>
        <h3 className="text-sm font-semibold text-foreground">Drafting Room</h3>
      </div>

      <div className="mt-3 flex flex-1 flex-col justify-center">
        <p className="text-sm font-medium text-foreground">
          This week's journal entry
        </p>
        <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
          Unlocks every Friday or after 40 logged hours.
        </p>
      </div>

      <Button className="mt-3 h-9 w-full" size="sm" onClick={onDraft}>
        <NotebookText className="h-3.5 w-3.5" />
        Draft Weekly Journal
        <ChevronRight className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Card 3 — Timesheet summary                                               */
/* -------------------------------------------------------------------------- */

function TimesheetCard({
  timeLogs,
  userId,
  accent,
  onView,
}: {
  timeLogs: ReturnType<typeof useAppStore.getState>["timeLogs"];
  userId: string;
  accent: BentoCardProps["accent"];
  onView: () => void;
}) {
  const now = Date.now();
  const weekMs = weeklyTimeMs(timeLogs, userId, now);
  const today = todaysTimeLogs(timeLogs, userId);
  const todayMs = today.reduce((sum, t) => sum + elapsedMs(t, now), 0);

  return (
    <div className="flex h-full flex-col p-5">
      <div className="flex items-center gap-2">
        <span
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-lg",
            accent.bg,
            accent.text,
          )}
        >
          <Timer className="h-4 w-4" strokeWidth={1.75} />
        </span>
        <h3 className="text-sm font-semibold text-foreground">Timesheet</h3>
      </div>

      <div className="mt-3 flex flex-1 flex-col justify-center gap-3">
        <div>
          <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            This week
          </p>
          <p className="font-mono text-2xl font-bold tabular-nums text-foreground">
            {formatDuration(weekMs)}
          </p>
        </div>
        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
          <span>Today: {formatDuration(todayMs)}</span>
          <span>{today.length} session{today.length === 1 ? "" : "s"}</span>
        </div>
      </div>

      <Button
        variant="outline"
        size="sm"
        className="mt-3 h-8 w-full"
        onClick={onView}
      >
        View timesheet
        <ChevronRight className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Card 4 — Evaluations (full-width banner on lg)                           */
/* -------------------------------------------------------------------------- */

function EvaluationsCard({
  evaluations,
  studentId,
  accent,
  onView,
}: {
  evaluations: ReturnType<typeof useAppStore.getState>["evaluations"];
  studentId: string;
  accent: BentoCardProps["accent"];
  onView: () => void;
}) {
  const mine = evaluationsForStudent(evaluations, studentId);
  const latest =
    mine.find((e) => e.status === "submitted") ?? mine[0];

  return (
    <div className="flex h-full flex-col p-5 sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-lg",
              accent.bg,
              accent.text,
            )}
          >
            <FileText className="h-4 w-4" strokeWidth={1.75} />
          </span>
          <h3 className="text-sm font-semibold text-foreground">
            Latest evaluation
          </h3>
        </div>
        <Button variant="ghost" size="sm" className="h-7" onClick={onView}>
          View all <ChevronRight className="h-3.5 w-3.5" />
        </Button>
      </div>

      {latest ? (
        <div className="mt-4 flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:gap-6">
          <div className="flex items-baseline gap-2">
            <span
              className={cn(
                "font-mono text-4xl font-bold tabular-nums",
                accent.text,
              )}
            >
              {averageScore(latest).toFixed(1)}
            </span>
            <span className="text-xs text-muted-foreground">/ 5.0 average</span>
          </div>
          <p className="text-xs text-muted-foreground">
            {latest.status === "submitted"
              ? "Submitted by your supervisor."
              : `Status: ${latest.status}.`}
          </p>
        </div>
      ) : (
        <div className="mt-4 flex flex-1 items-center justify-center py-4">
          <p className="text-xs text-muted-foreground">
            No evaluations yet — your supervisor hasn't submitted one this term.
          </p>
        </div>
      )}
    </div>
  );
}

export default StudentDashboard;
