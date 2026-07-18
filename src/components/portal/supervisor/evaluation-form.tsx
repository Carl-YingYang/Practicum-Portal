"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  Loader2,
  AlertTriangle,
  Building2,
  GraduationCap,
  ClipboardCheck,
  Pencil,
} from "lucide-react";
import { useAppStore } from "@/store/use-app-store";
import { getStudent, getCompany } from "@/lib/selectors";
import { PageHeader } from "@/components/portal/layout/page-header";
import { SectionCard } from "@/components/portal/shared/section-card";
import { Avatar } from "@/components/portal/shared/avatar";
import { CriterionBlock } from "@/components/portal/shared/rating-scale";
import { ActionBar } from "@/components/portal/shared/action-bar";
import { ConfirmDialog } from "@/components/portal/shared/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { RATING_CRITERIA, RATING_ANCHORS } from "@/lib/types";

const TERM = "2024-2025";
const MAX_COMMENT = 500;

type RatingKey = "qualityOfWork" | "jobKnowledge" | "dependability";
type Ratings = Record<RatingKey, number>;
type Comments = Record<"strengths" | "weaknesses" | "recommendations", string>;

const COMMENT_FIELDS: { key: keyof Comments; label: string; hint: string; placeholder: string }[] = [
  {
    key: "strengths",
    label: "Strengths",
    hint: "What is the intern doing well? Aim for at least 30 characters.",
    placeholder: "Describe the intern's notable strengths…",
  },
  {
    key: "weaknesses",
    label: "Weaknesses",
    hint: "Where can the intern improve? Aim for at least 30 characters.",
    placeholder: "Describe areas for improvement…",
  },
  {
    key: "recommendations",
    label: "Recommendations",
    hint: "Suggestions for growth or next steps.",
    placeholder: "Share recommendations for the intern…",
  },
];

export function EvaluationForm() {
  const viewParams = useAppStore((s) => s.viewParams);
  const currentUser = useAppStore((s) => s.currentUser);
  const students = useAppStore((s) => s.students);
  const evaluations = useAppStore((s) => s.evaluations);
  const companies = useAppStore((s) => s.companies);
  const navigate = useAppStore((s) => s.navigate);
  const back = useAppStore((s) => s.back);
  const canGoBack = useAppStore((s) => s.history.length > 0);
  const saveEvaluation = useAppStore((s) => s.saveEvaluation);

  const supervisorId = currentUser?.supervisorId ?? "";

  // Resolve the editing draft (if any) and the target student.
  const editingDraft = useMemo(() => {
    if (!viewParams.evaluationId) return undefined;
    const e = evaluations.find((x) => x.id === viewParams.evaluationId);
    return e && e.status === "draft" ? e : undefined;
  }, [viewParams.evaluationId, evaluations]);

  const targetStudentId =
    editingDraft?.studentId ?? viewParams.preselectStudentId ?? viewParams.studentId;
  const student = getStudent(students, targetStudentId);
  const company = student ? getCompany(companies, student.companyId) : undefined;

  const isEditing = !!editingDraft;

  // ----- Local form state -----
  const [ratings, setRatings] = useState<Ratings>({
    qualityOfWork: editingDraft?.qualityOfWork ?? 0,
    jobKnowledge: editingDraft?.jobKnowledge ?? 0,
    dependability: editingDraft?.dependability ?? 0,
  });
  const [comments, setComments] = useState<Comments>({
    strengths: editingDraft?.strengths ?? "",
    weaknesses: editingDraft?.weaknesses ?? "",
    recommendations: editingDraft?.recommendations ?? "",
  });

  const [savedId, setSavedId] = useState<string | null>(editingDraft?.id ?? null);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(
    editingDraft ? new Date(editingDraft.createdAt) : null
  );
  const [savedIndicator, setSavedIndicator] = useState<"idle" | "saving" | "saved">(
    editingDraft ? "saved" : "idle"
  );

  const [reviewOpen, setReviewOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);

  // ----- Autosave feel (debounced indicator on change) -----
  // The "saving" state is set synchronously in change handlers; the effect
  // below only sets up a debounced timeout to transition to "saved".
  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    const t = setTimeout(() => setSavedIndicator("saved"), 700);
    return () => clearTimeout(t);
  }, [ratings, comments]);

  const updateRating = (key: RatingKey, v: number) => {
    setRatings((r) => ({ ...r, [key]: v }));
    setSavedIndicator("saving");
  };

  const updateComment = (key: keyof Comments, v: string) => {
    setComments((c) => ({ ...c, [key]: v }));
    setSavedIndicator("saving");
  };

  const allRated =
    ratings.qualityOfWork > 0 && ratings.jobKnowledge > 0 && ratings.dependability > 0;
  const liveAverage = allRated
    ? (ratings.qualityOfWork + ratings.jobKnowledge + ratings.dependability) / 3
    : 0;

  // Dirty check (compares against the originally loaded draft).
  const isDirty = useMemo(() => {
    if (editingDraft) {
      return (
        editingDraft.qualityOfWork !== ratings.qualityOfWork ||
        editingDraft.jobKnowledge !== ratings.jobKnowledge ||
        editingDraft.dependability !== ratings.dependability ||
        editingDraft.strengths !== comments.strengths ||
        editingDraft.weaknesses !== comments.weaknesses ||
        editingDraft.recommendations !== comments.recommendations
      );
    }
    return (
      ratings.qualityOfWork > 0 ||
      ratings.jobKnowledge > 0 ||
      ratings.dependability > 0 ||
      comments.strengths.trim() !== "" ||
      comments.weaknesses.trim() !== "" ||
      comments.recommendations.trim() !== ""
    );
  }, [editingDraft, ratings, comments]);

  // ----- Actions -----
  const handleSaveDraft = () => {
    if (!student) return;
    const id = saveEvaluation({
      id: savedId ?? undefined,
      studentId: student.id,
      supervisorId,
      term: TERM,
      qualityOfWork: ratings.qualityOfWork,
      jobKnowledge: ratings.jobKnowledge,
      dependability: ratings.dependability,
      strengths: comments.strengths,
      weaknesses: comments.weaknesses,
      recommendations: comments.recommendations,
      submit: false,
    });
    setSavedId(id);
    setLastSavedAt(new Date());
    setSavedIndicator("saved");
    toast.success("Draft saved", {
      description: "You can return to this evaluation later.",
    });
  };

  const handleSubmit = () => {
    if (!student || !allRated) return;
    const id = saveEvaluation({
      id: savedId ?? undefined,
      studentId: student.id,
      supervisorId,
      term: TERM,
      qualityOfWork: ratings.qualityOfWork,
      jobKnowledge: ratings.jobKnowledge,
      dependability: ratings.dependability,
      strengths: comments.strengths,
      weaknesses: comments.weaknesses,
      recommendations: comments.recommendations,
      submit: true,
    });
    setReviewOpen(false);
    toast.success("Evaluation submitted", {
      description: "The evaluation is now locked and visible to the intern.",
    });
    navigate("supervisor.evaluation-view", { evaluationId: id });
  };

  const handleCancelClick = () => {
    if (isDirty) {
      setCancelOpen(true);
    } else if (canGoBack) {
      back();
    } else {
      navigate("supervisor.interns");
    }
  };

  if (!student) {
    return (
      <div>
        <PageHeader showBack title="Create Evaluation" />
        <SectionCard>
          <div className="py-8 text-center">
            <p className="text-sm text-muted-foreground">
              No intern selected. Please choose an intern to evaluate.
            </p>
            <Button
              className="mt-4"
              onClick={() => navigate("supervisor.interns")}
            >
              Go to My Interns
            </Button>
          </div>
        </SectionCard>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        showBack
        title={isEditing ? "Edit Evaluation" : "Create Evaluation"}
        description="Rate the intern across three criteria and add qualitative comments."
      />

      <div className="mx-auto grid max-w-5xl grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-8">
        {/* Main form column */}
        <div className="space-y-6">
          {/* Context bar — read-only student info */}
          <SectionCard title="Intern being evaluated">
            <div className="flex items-start gap-4">
              <Avatar name={student.name} size="lg" />
              <div className="min-w-0 flex-1">
                <p className="text-base font-semibold text-foreground">
                  {student.name}
                </p>
                <p className="font-mono text-xs text-muted-foreground">
                  {student.studentNumber}
                </p>
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1.5">
                    <GraduationCap className="h-3.5 w-3.5" />
                    {student.course}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Building2 className="h-3.5 w-3.5" />
                    {company?.name ?? "—"}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <ClipboardCheck className="h-3.5 w-3.5" />
                    Required: {student.requiredHours}h
                  </span>
                </div>
              </div>
              <span className="rounded-md bg-muted px-2 py-1 text-xs font-medium text-muted-foreground">
                Term {TERM}
              </span>
            </div>
          </SectionCard>

          {/* Criteria */}
          <div className="space-y-4">
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Criteria
              </h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Rate each criterion on a 1–5 scale. Press keys 1–5 to rate the focused criterion.
              </p>
            </div>
            {RATING_CRITERIA.map((c, i) => (
              <CriterionBlock
                key={c.key}
                label={c.label}
                hint={c.hint}
                value={ratings[c.key]}
                onChange={(v) => updateRating(c.key, v)}
                index={i + 1}
              />
            ))}
          </div>

          {/* Comments */}
          <div className="space-y-4">
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Comments
              </h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Qualitative feedback supports the ratings above.
              </p>
            </div>
            {COMMENT_FIELDS.map((f) => (
              <CommentField
                key={f.key}
                label={f.label}
                hint={f.hint}
                placeholder={f.placeholder}
                value={comments[f.key]}
                onChange={(v) => updateComment(f.key, v)}
              />
            ))}
          </div>
        </div>

        {/* Sticky live summary card */}
        <div className="lg:sticky lg:top-24 lg:self-start">
          <SummaryCard
            ratings={ratings}
            comments={comments}
            liveAverage={liveAverage}
            allRated={allRated}
            savedId={savedId}
            savedIndicator={savedIndicator}
            lastSavedAt={lastSavedAt}
          />
        </div>
      </div>

      {/* Action bar */}
      <ActionBar>
        <span
          className={cn(
            "hidden text-xs sm:mr-auto sm:block",
            allRated ? "text-muted-foreground" : "text-amber-700 dark:text-amber-300"
          )}
        >
          {allRated
            ? "Ready to review"
            : "Rate all 3 criteria to continue"}
        </span>
        <Button variant="ghost" onClick={handleCancelClick}>
          Cancel
        </Button>
        <Button variant="outline" onClick={handleSaveDraft}>
          Save Draft
        </Button>
        <Button disabled={!allRated} onClick={() => setReviewOpen(true)}>
          Review
        </Button>
      </ActionBar>

      {/* Review dialog */}
      <AlertDialog open={reviewOpen} onOpenChange={setReviewOpen}>
        <AlertDialogContent className="sm:max-w-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Review and submit evaluation</AlertDialogTitle>
            <AlertDialogDescription>
              Please review the evaluation below. Once submitted, the evaluation
              will be locked and visible to the intern.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="max-h-[55vh] space-y-4 overflow-y-auto scroll-area-custom pr-1">
            {/* Intern context */}
            <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/30 p-3">
              <Avatar name={student.name} size="md" />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-foreground">
                  {student.name}
                </p>
                <p className="font-mono text-xs text-muted-foreground">
                  {student.studentNumber} · {student.course} · {company?.name}
                </p>
              </div>
            </div>

            {/* Ratings summary */}
            <div className="rounded-lg border border-border">
              <div className="border-b border-border bg-muted/30 px-4 py-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Ratings
                </p>
              </div>
              <ul className="divide-y divide-border">
                {RATING_CRITERIA.map((c) => (
                  <li
                    key={c.key}
                    className="flex items-center justify-between px-4 py-2.5"
                  >
                    <span className="text-sm font-medium text-foreground">
                      {c.label}
                    </span>
                    <span className="flex items-center gap-2">
                      <span className="text-sm font-bold tabular-nums text-foreground">
                        {ratings[c.key]}/5
                      </span>
                      <span className="rounded bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                        {RATING_ANCHORS[ratings[c.key]]}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
              <div className="flex items-center justify-between border-t border-border bg-muted/30 px-4 py-2.5">
                <span className="text-sm font-semibold text-foreground">
                  Average
                </span>
                <span className="text-lg font-bold tabular-nums text-foreground">
                  {liveAverage.toFixed(2)}/5
                </span>
              </div>
            </div>

            {/* Comments summary */}
            <div className="rounded-lg border border-border">
              <div className="border-b border-border bg-muted/30 px-4 py-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Comments
                </p>
              </div>
              <ul className="divide-y divide-border">
                {COMMENT_FIELDS.map((f) => {
                  const value = comments[f.key];
                  const isEmpty = value.trim() === "";
                  return (
                    <li key={f.key} className="px-4 py-3">
                      <div className="mb-1 flex items-center justify-between">
                        <p className="text-sm font-semibold text-foreground">
                          {f.label}
                        </p>
                        {isEmpty && (
                          <span className="inline-flex items-center gap-1 text-xs text-amber-700 dark:text-amber-300">
                            <AlertTriangle className="h-3 w-3" />
                            Empty — recommended to add
                          </span>
                        )}
                      </div>
                      {isEmpty ? (
                        <p className="text-sm italic text-muted-foreground">
                          (No comment provided)
                        </p>
                      ) : (
                        <p className="whitespace-pre-wrap text-sm text-foreground">
                          {value}
                        </p>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleSubmit}>
              Submit Evaluation
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Cancel confirm (if dirty) */}
      <ConfirmDialog
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        title="Discard changes?"
        description="You have unsaved changes. Saving a draft will keep them; leaving now will lose them."
        confirmLabel="Discard and leave"
        cancelLabel="Keep editing"
        destructive
        onConfirm={() => {
          setCancelOpen(false);
          if (canGoBack) back();
          else navigate("supervisor.interns");
        }}
      />
    </div>
  );
}

// ============================================================
// Sub-components
// ============================================================

function CommentField({
  label,
  hint,
  placeholder,
  value,
  onChange,
}: {
  label: string;
  hint: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-base font-semibold text-foreground">{label}</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>
        </div>
        <span
          className={cn(
            "shrink-0 text-xs tabular-nums",
            value.length > MAX_COMMENT
              ? "text-red-600"
              : value.length >= 30
              ? "text-muted-foreground"
              : "text-muted-foreground"
          )}
        >
          {value.length}/{MAX_COMMENT}
        </span>
      </div>
      <Textarea
        value={value}
        onChange={(e) => onChange(e.target.value.slice(0, MAX_COMMENT))}
        rows={4}
        placeholder={placeholder}
        aria-label={label}
        className="resize-y"
      />
    </div>
  );
}

function SummaryCard({
  ratings,
  comments,
  liveAverage,
  allRated,
  savedId,
  savedIndicator,
  lastSavedAt,
}: {
  ratings: Ratings;
  comments: Comments;
  liveAverage: number;
  allRated: boolean;
  savedId: string | null;
  savedIndicator: "idle" | "saving" | "saved";
  lastSavedAt: Date | null;
}) {
  const totalCommentsFilled = COMMENT_FIELDS.filter(
    (f) => comments[f.key].trim() !== ""
  ).length;

  return (
    <SectionCard title="Live summary">
      <div className="space-y-4">
        {/* Big average */}
        <div className="rounded-xl bg-gradient-to-br from-teal-50 to-amber-50 p-4 text-center dark:from-teal-950/40 dark:to-amber-950/30">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Computed average
          </p>
          {allRated ? (
            <p className="mt-1 text-4xl font-bold tabular-nums text-foreground">
              {liveAverage.toFixed(2)}
              <span className="text-lg font-medium text-muted-foreground">/5</span>
            </p>
          ) : (
            <p className="mt-1 text-4xl font-bold text-muted-foreground">—</p>
          )}
          <p className="mt-1 text-xs text-muted-foreground">
            {allRated
              ? "Average of all 3 criteria"
              : "Rate all 3 criteria to see average"}
          </p>
        </div>

        {/* Per-criterion scores */}
        <ul className="space-y-2">
          {RATING_CRITERIA.map((c) => (
            <li
              key={c.key}
              className="flex items-center justify-between text-sm"
            >
              <span className="text-muted-foreground">{c.label}</span>
              <span
                className={cn(
                  "font-semibold tabular-nums",
                  ratings[c.key] > 0 ? "text-foreground" : "text-muted-foreground"
                )}
              >
                {ratings[c.key] > 0 ? `${ratings[c.key]}/5` : "—"}
              </span>
            </li>
          ))}
        </ul>

        {/* Comments progress */}
        <div className="border-t border-border pt-3">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Comments filled</span>
            <span className="font-medium tabular-nums text-foreground">
              {totalCommentsFilled}/3
            </span>
          </div>
        </div>

        {/* Save indicator */}
        <div className="border-t border-border pt-3">
          <SaveIndicator
            savedId={savedId}
            savedIndicator={savedIndicator}
            lastSavedAt={lastSavedAt}
          />
        </div>
      </div>
    </SectionCard>
  );
}

function SaveIndicator({
  savedId,
  savedIndicator,
  lastSavedAt,
}: {
  savedId: string | null;
  savedIndicator: "idle" | "saving" | "saved";
  lastSavedAt: Date | null;
}) {
  // After Save Draft: explicit "Draft saved" with check icon.
  if (savedId && savedIndicator !== "saving") {
    return (
      <p className="flex items-center gap-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-300">
        <Check className="h-3.5 w-3.5" />
        Draft saved
        {lastSavedAt && (
          <span className="font-normal text-muted-foreground">
            · {lastSavedAt.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
          </span>
        )}
      </p>
    );
  }

  // Saving… (autosave simulation)
  if (savedIndicator === "saving") {
    return (
      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        Saving…
      </p>
    );
  }

  // Autosave settled but no draft saved yet.
  if (savedIndicator === "saved") {
    return (
      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Check className="h-3.5 w-3.5" />
        All changes saved
      </p>
    );
  }

  // Idle (initial state, no edits yet).
  return (
    <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
      <Pencil className="h-3.5 w-3.5" />
      Not saved yet
    </p>
  );
}
