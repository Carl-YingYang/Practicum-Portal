"use client";

import * as React from "react";
import { useAppStore } from "@/store/use-app-store";
import { useEffectiveSchool } from "@/lib/use-effective-school";
import { HeroSlideshow } from "@/components/portal/shared/HeroSlideshow";
import { SchoolIdentityCard } from "@/components/portal/shared/school-identity-card";
import { ProgressRing } from "@/components/portal/shared/progress-ring";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ACCENT_HEX } from "@/lib/types";
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
  Timer,
} from "lucide-react";

/* ========================================================================== */
/*  StudentDashboard — Editorial Calm Bento (brand-driven)                    */
/*  ------------------------------------------------------------------------  */
/*  Reads the effective school's branding (accent + hero images + cards).     */
/*  Editorial aesthetic: cream surfaces, ink text, one accent, flat cards.    */
/*  No gradient washes, no mono fonts, no colored pills, no glows.            */
/* ========================================================================== */

const REQUIRED_HOURS = 250;

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

  const { school } = useEffectiveSchool();
  const accentKey = school.accentColor as keyof typeof ACCENT_HEX;
  const accentHex = ACCENT_HEX[accentKey] ?? ACCENT_HEX.sage;
  const visible = school.visibleCards;

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

  // Inject the accent as a CSS custom property for this dashboard scope.
  const accentStyle = {
    "--brand-accent": accentHex.base,
    "--brand-accent-soft": accentHex.soft,
  } as React.CSSProperties;

  return (
    <div className="space-y-5" style={accentStyle}>
      {/* Hero — editorial, brand-driven, crossfade */}
      <HeroSlideshow
        images={school.heroImages}
        accentColor={accentKey}
        staticCaption={`${greeting()}, ${firstName} — welcome to ${school.name}.`}
      />

      {/* Bento grid — flat editorial cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 auto-rows-[minmax(168px,auto)]">
        {visible.includes("time_clock") && (
          <div className="sm:col-span-2 lg:col-span-2 lg:row-span-2">
            <TimeClockCard
              student={student}
              userId={student.id}
              timeLogs={timeLogs}
              clockIn={clockIn}
              clockOut={clockOut}
              accentHex={accentHex}
            />
          </div>
        )}

        {visible.includes("drafting_room") && (
          <DraftingRoomCard
            accentHex={accentHex}
            onDraft={() => {
              toast.info("Opening weekly journal draft…", {
                description: "A new journal entry is being prepared for this week.",
              });
              navigate("student.journal-new");
            }}
          />
        )}

        {visible.includes("timesheet") && (
          <TimesheetCard
            timeLogs={timeLogs}
            userId={student.id}
            accentHex={accentHex}
            onView={() => navigate("student.time-clock")}
          />
        )}

        {visible.includes("evaluations") && (
          <EvaluationsCard
            evaluations={evaluations}
            studentId={student.id}
            accentHex={accentHex}
            onView={() => navigate("student.evaluations")}
          />
        )}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Editorial card shell — flat, no gradient washes                           */
/* -------------------------------------------------------------------------- */

function EditorialCard({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "flex h-full flex-col overflow-hidden rounded-2xl border border-border/50 bg-card shadow-sm",
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

function TimeClockCard({
  student,
  userId,
  timeLogs,
  clockIn,
  clockOut,
  accentHex,
}: {
  student: { loggedHours: number; requiredHours: number };
  userId: string;
  timeLogs: ReturnType<typeof useAppStore.getState>["timeLogs"];
  clockIn: ReturnType<typeof useAppStore.getState>["clockIn"];
  clockOut: ReturnType<typeof useAppStore.getState>["clockOut"];
  accentHex: { base: string; soft: string };
}) {
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
    <EditorialCard>
      <div className="flex h-full flex-col p-5 sm:p-6">
        {/* Status row — flat, no colored pill */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span
              className="h-2 w-2 rounded-full"
              style={{
                backgroundColor: active ? "#10b981" : "#9ca3af",
                animation: active ? "pulse 2s ease-in-out infinite" : undefined,
              }}
            />
            <span className="text-sm font-medium text-foreground">
              {active ? "On the clock" : "Clocked out"}
            </span>
          </div>
          <span className="text-sm text-muted-foreground">
            {new Date().toLocaleDateString("en-US", {
              weekday: "long",
              month: "short",
              day: "numeric",
            })}
          </span>
        </div>

        {/* Main: timer + progress */}
        <div className="mt-5 flex flex-1 flex-col items-center justify-center gap-5 sm:flex-row sm:gap-6">
          <div className="flex-1 text-center sm:text-left">
            {active ? (
              <>
                <p className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl" style={{ fontVariantNumeric: "tabular-nums" }}>
                  {formatTimer(elapsedMs(active, now))}
                </p>
                <p className="mt-1.5 text-sm text-muted-foreground">
                  Clocked in at {formatTime(active.clockInAt)}
                  {active.note ? ` · ${active.note}` : ""}
                </p>
              </>
            ) : (
              <>
                <p className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                  Ready to start?
                </p>
                <p className="mt-1.5 text-sm text-muted-foreground">
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
                className="h-9 w-full rounded-lg border border-border/70 bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground/70 focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20"
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

          {/* Progress ring — 250h */}
          <div className="flex shrink-0 flex-col items-center">
            <ProgressRing value={pct} size={132} strokeWidth={11} label="complete" />
            <p className="mt-2 text-center text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">
                {student.loggedHours}
              </span>{" "}
              hours rendered out of {REQUIRED_HOURS}
            </p>
          </div>
        </div>

        {/* Footer mini-stats — flat */}
        <div className="mt-5 grid grid-cols-3 gap-2 border-t border-border/40 pt-4">
          <MiniStat icon={Clock} label="Today" value={formatDuration(todayMs)} />
          <MiniStat icon={CalendarDays} label="This week" value={formatDuration(weekMs)} />
          <MiniStat icon={Hourglass} label="Remaining" value={`${remaining}h`} />
        </div>
      </div>
    </EditorialCard>
  );
}

function MiniStat({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Clock;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-semibold text-foreground">{value}</p>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Card 2 — Drafting Room                                                   */
/* -------------------------------------------------------------------------- */

function DraftingRoomCard({
  accentHex,
  onDraft,
}: {
  accentHex: { base: string; soft: string };
  onDraft: () => void;
}) {
  return (
    <EditorialCard>
      {/* School identity card as branded header strip */}
      <div className="border-b border-border/40">
        <SchoolIdentityCard variant="compact" interactive />
      </div>
      <div className="flex h-full flex-col p-5">
        <div className="flex items-center gap-2">
          <NotebookText className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
          <h3 className="text-sm font-semibold text-foreground">Drafting Room</h3>
        </div>

        <div className="mt-3 flex flex-1 flex-col justify-center">
          <p className="text-sm font-medium text-foreground">
            This week's journal entry
          </p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            Unlocks every Friday or after 40 logged hours.
          </p>
        </div>

        <Button className="mt-3 h-9 w-full" size="sm" onClick={onDraft}>
          <NotebookText className="h-3.5 w-3.5" />
          Draft Weekly Journal
          <ChevronRight className="h-3.5 w-3.5" />
        </Button>
      </div>
    </EditorialCard>
  );
}

/* -------------------------------------------------------------------------- */
/*  Card 3 — Timesheet                                                       */
/* -------------------------------------------------------------------------- */

function TimesheetCard({
  timeLogs,
  userId,
  accentHex,
  onView,
}: {
  timeLogs: ReturnType<typeof useAppStore.getState>["timeLogs"];
  userId: string;
  accentHex: { base: string; soft: string };
  onView: () => void;
}) {
  const now = Date.now();
  const weekMs = weeklyTimeMs(timeLogs, userId, now);
  const today = todaysTimeLogs(timeLogs, userId);
  const todayMs = today.reduce((sum, t) => sum + elapsedMs(t, now), 0);

  return (
    <EditorialCard>
      <div className="flex h-full flex-col p-5">
        <div className="flex items-center gap-2">
          <Timer className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
          <h3 className="text-sm font-semibold text-foreground">Timesheet</h3>
        </div>

        <div className="mt-3 flex flex-1 flex-col justify-center gap-2">
          <div>
            <p className="text-xs text-muted-foreground">This week</p>
            <p className="text-2xl font-bold text-foreground">
              {formatDuration(weekMs)}
            </p>
          </div>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
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
    </EditorialCard>
  );
}

/* -------------------------------------------------------------------------- */
/*  Card 4 — Evaluations (full-width)                                        */
/* -------------------------------------------------------------------------- */

function EvaluationsCard({
  evaluations,
  studentId,
  accentHex,
  onView,
}: {
  evaluations: ReturnType<typeof useAppStore.getState>["evaluations"];
  studentId: string;
  accentHex: { base: string; soft: string };
  onView: () => void;
}) {
  const mine = evaluationsForStudent(evaluations, studentId);
  const latest = mine.find((e) => e.status === "submitted") ?? mine[0];

  return (
    <EditorialCard>
      <div className="flex h-full flex-col p-5">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
          <h3 className="text-sm font-semibold text-foreground">Latest evaluation</h3>
        </div>

        {latest ? (
          <div className="mt-3 flex flex-1 flex-col justify-center gap-1">
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-bold" style={{ color: accentHex.base }}>
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
          <div className="mt-3 flex flex-1 items-center justify-center py-2">
            <p className="text-xs text-muted-foreground">
              No evaluations yet.
            </p>
          </div>
        )}

        <Button variant="outline" size="sm" className="mt-3 h-8 w-full" onClick={onView}>
          View all <ChevronRight className="h-3.5 w-3.5" />
        </Button>
      </div>
    </EditorialCard>
  );
}

export default StudentDashboard;
