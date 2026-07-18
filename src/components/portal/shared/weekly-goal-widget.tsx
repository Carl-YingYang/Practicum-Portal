"use client";

import { useMemo } from "react";
import { useAppStore } from "@/store/use-app-store";
import {
  weeklyTimeMs,
  formatDuration,
  getStudent,
} from "@/lib/selectors";
import { Card } from "@/components/ui/card";
import { Target } from "lucide-react";
import { cn } from "@/lib/utils";

interface WeeklyGoalWidgetProps {
  studentId: string;
}

export function WeeklyGoalWidget({ studentId }: WeeklyGoalWidgetProps) {
  const timeLogs = useAppStore((s) => s.timeLogs);
  const students = useAppStore((s) => s.students);

  const weekMs = useMemo(() => weeklyTimeMs(timeLogs, studentId), [timeLogs, studentId]);

  const weeklyTargetHours = useMemo(() => {
    const student = getStudent(students, studentId);
    if (!student || student.requiredHours <= 0) return 0;
    // Calculate remaining hours and weeks
    const remainingHours = Math.max(0, student.requiredHours - student.loggedHours);
    if (remainingHours <= 0) return 0;
    // Estimate weeks remaining: assume ~4 weeks per month from creation date
    const created = new Date(student.createdAt);
    const now = new Date();
    const totalWeeksElapsed = Math.max(1, Math.round((now.getTime() - created.getTime()) / (7 * 24 * 60 * 60 * 1000)));
    // Assume a standard practicum is about 20 weeks (5 months)
    const totalWeeks = 20;
    const weeksRemaining = Math.max(1, totalWeeks - totalWeeksElapsed);
    const target = remainingHours / weeksRemaining;
    // Minimum 5h/week, maximum 40h/week
    return Math.min(40, Math.max(5, Math.round(target * 10) / 10));
  }, [students, studentId]);

  const weekHours = weekMs / 3600_000;
  const pct = weeklyTargetHours > 0 ? Math.min(100, Math.round((weekHours / weeklyTargetHours) * 100)) : 0;

  // Motivational message & color based on progress
  let message: string;
  let ringColor: string;
  let textColor: string;

  if (pct >= 80) {
    message = "Great progress!";
    ringColor = "#059669"; // emerald
    textColor = "text-emerald-600 dark:text-emerald-400";
  } else if (pct >= 50) {
    message = "Keep going!";
    ringColor = "#0f766e"; // teal
    textColor = "text-teal-600 dark:text-teal-400";
  } else if (pct > 0) {
    message = "Pick up the pace";
    ringColor = "#d97706"; // amber
    textColor = "text-amber-600 dark:text-amber-400";
  } else {
    message = "Start logging time";
    ringColor = "#94a3b8"; // slate
    textColor = "text-muted-foreground";
  }

  // Circular ring SVG
  const size = 72;
  const strokeWidth = 7;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (pct / 100) * circumference;

  return (
    <Card className="flex items-center gap-4 border-border/70 px-4 py-3 sm:px-5">
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            className="text-slate-100 dark:text-slate-800"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={ringColor}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className="transition-[stroke-dashoffset] duration-700 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-sm font-bold tabular-nums text-foreground">{pct}%</span>
        </div>
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <Target className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-xs font-medium text-muted-foreground">Weekly Goal</span>
        </div>
        <p className="mt-0.5 text-sm font-semibold text-foreground">
          This week: {formatDuration(weekMs)}
        </p>
        {weeklyTargetHours > 0 && (
          <p className="text-xs text-muted-foreground">
            Weekly target: {weeklyTargetHours}h
          </p>
        )}
        <p className={cn("mt-0.5 text-xs font-medium", textColor)}>
          {message}
        </p>
      </div>
    </Card>
  );
}
