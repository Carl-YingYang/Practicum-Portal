"use client";

import { cn } from "@/lib/utils";
import {
  CheckCircle2,
  Clock,
  FileEdit,
  XCircle,
  Send,
  UserX,
  type LucideIcon,
} from "lucide-react";
import type { JournalStatus, EvaluationStatus, FormStatus, Role } from "@/lib/types";

type Tone = "slate" | "amber" | "emerald" | "red" | "teal";

const toneStyles: Record<Tone, string> = {
  slate:
    "bg-slate-100/80 text-slate-700 ring-slate-200/70 dark:bg-slate-800/60 dark:text-slate-300 dark:ring-slate-700/60",
  amber:
    "bg-amber-50 text-amber-800 ring-amber-200/70 dark:bg-amber-950/40 dark:text-amber-300 dark:ring-amber-900/50",
  emerald:
    "bg-emerald-50 text-emerald-800 ring-emerald-200/70 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-900/50",
  red: "bg-red-50 text-red-700 ring-red-200/70 dark:bg-red-950/40 dark:text-red-300 dark:ring-red-900/50",
  teal: "bg-teal-50 text-teal-800 ring-teal-200/70 dark:bg-teal-950/40 dark:text-teal-300 dark:ring-teal-900/50",
};

const toneDot: Record<Tone, string> = {
  slate: "bg-slate-400",
  amber: "bg-amber-500",
  emerald: "bg-emerald-500",
  red: "bg-red-500",
  teal: "bg-teal-500",
};

interface BadgeProps {
  tone?: Tone;
  icon?: LucideIcon;
  children: React.ReactNode;
  className?: string;
  outline?: boolean;
  /** Show a leading status dot instead of an icon (more modern, less loud). */
  dot?: boolean;
}

export function Badge({
  tone = "slate",
  icon: Icon,
  children,
  className,
  outline,
  dot,
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset",
        toneStyles[tone],
        outline && "bg-transparent",
        className
      )}
    >
      {dot && (
        <span className={cn("h-1.5 w-1.5 rounded-full", toneDot[tone])} aria-hidden />
      )}
      {Icon && !dot && <Icon className="h-3 w-3" />}
      {children}
    </span>
  );
}

// ---- Status-specific badges (dot-led for a calmer, more modern feel) ----

const journalStatusConfig: Record<
  JournalStatus,
  { tone: Tone; label: string; icon: LucideIcon }
> = {
  draft: { tone: "slate", label: "Draft", icon: FileEdit },
  pending: { tone: "amber", label: "Pending", icon: Clock },
  approved: { tone: "emerald", label: "Approved", icon: CheckCircle2 },
  rejected: { tone: "red", label: "Rejected", icon: XCircle },
};

export function JournalStatusBadge({ status }: { status: JournalStatus }) {
  const cfg = journalStatusConfig[status];
  return (
    <Badge tone={cfg.tone} dot>
      {cfg.label}
    </Badge>
  );
}

const evaluationStatusConfig: Record<
  EvaluationStatus,
  { tone: Tone; label: string; icon: LucideIcon }
> = {
  draft: { tone: "slate", label: "Draft", icon: FileEdit },
  submitted: { tone: "teal", label: "Submitted", icon: Send },
};

export function EvaluationStatusBadge({ status }: { status: EvaluationStatus }) {
  const cfg = evaluationStatusConfig[status];
  return (
    <Badge tone={cfg.tone} dot>
      {cfg.label}
    </Badge>
  );
}

const formStatusConfig: Record<
  FormStatus,
  { tone: Tone; label: string }
> = {
  draft: { tone: "slate", label: "Draft" },
  published: { tone: "emerald", label: "Published" },
  archived: { tone: "amber", label: "Archived" },
};

export function FormStatusBadge({ status }: { status: FormStatus }) {
  const cfg = formStatusConfig[status];
  return (
    <Badge tone={cfg.tone} dot>
      {cfg.label}
    </Badge>
  );
}

export function UnassignedBadge() {
  return (
    <Badge tone="amber" icon={UserX} outline>
      Unassigned
    </Badge>
  );
}

// ---- Role badge ----
const roleConfig: Record<Role, { tone: Tone; label: string }> = {
  student: { tone: "slate", label: "Student" },
  supervisor: { tone: "teal", label: "Supervisor" },
  coordinator: { tone: "teal", label: "Coordinator" },
};

export function RoleBadge({ role, solid }: { role: Role; solid?: boolean }) {
  const cfg = roleConfig[role];
  return (
    <Badge tone={cfg.tone} className={solid ? "" : "bg-transparent"}>
      {cfg.label}
    </Badge>
  );
}

// ---- Score badge ----
export function ScoreBadge({ score, className }: { score: number; className?: string }) {
  let tone: Tone = "slate";
  if (score > 0) {
    if (score <= 2) tone = "red";
    else if (score <= 3) tone = "amber";
    else tone = "emerald";
  }
  return (
    <Badge tone={tone} className={cn("tabular-nums font-semibold", className)}>
      {score === 0 ? "—" : score.toFixed(1)}
    </Badge>
  );
}
