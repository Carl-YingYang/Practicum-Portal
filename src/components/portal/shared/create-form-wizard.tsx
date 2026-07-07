"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { useAppStore } from "@/store/use-app-store";
import { cn } from "@/lib/utils";
import {
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Send,
  Users,
  GraduationCap,
  UserCheck,
  CalendarClock,
  FileText,
  Layers,
  Sparkles,
} from "lucide-react";
import {
  type FormCategory,
  type FormAssignmentTarget,
  FORM_CATEGORY_LABELS,
} from "@/lib/types";
import { format } from "date-fns";

const categoryOptions: { value: FormCategory; label: string; hint: string }[] = [
  { value: "evaluation", label: FORM_CATEGORY_LABELS.evaluation, hint: "Supervisor rates intern performance" },
  { value: "journal", label: FORM_CATEGORY_LABELS.journal, hint: "Student weekly reflection" },
  { value: "ojt", label: FORM_CATEGORY_LABELS.ojt, hint: "On-the-job training sheet" },
  { value: "program", label: FORM_CATEGORY_LABELS.program, hint: "End-of-program feedback" },
  { value: "other", label: FORM_CATEGORY_LABELS.other, hint: "Custom form" },
];

const targetOptions: {
  value: FormAssignmentTarget;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  {
    value: "all_supervisors",
    label: "All Company Supervisors",
    description: "Every active supervisor will be asked to fill this form.",
    icon: Users,
  },
  {
    value: "all_students",
    label: "All Students",
    description: "Every active student will be asked to fill this form.",
    icon: GraduationCap,
  },
  {
    value: "specific_users",
    label: "Specific people",
    description: "Choose individual supervisors or students to assign.",
    icon: UserCheck,
  },
];

/**
 * CreateFormWizard — a 3-step guided modal for creating + publishing + assigning
 * a form in one flow. Replaces the old small "New form" dialog.
 *
 * Step 1: Details (title, description, category)
 * Step 2: Build (links out to the full editor, or skip to assign-and-publish
 *         with a starter template — coordinator can refine later)
 * Step 3: Assign & Publish (target audience + optional due date + publish toggle)
 */
export function CreateFormWizard({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { toast } = useToast();
  const createFormDocument = useAppStore((s) => s.createFormDocument);
  const publishFormDocument = useAppStore((s) => s.publishFormDocument);
  const assignForm = useAppStore((s) => s.assignForm);
  const navigate = useAppStore((s) => s.navigate);

  const [step, setStep] = React.useState<1 | 2 | 3>(1);
  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [category, setCategory] = React.useState<FormCategory>("evaluation");
  const [target, setTarget] = React.useState<FormAssignmentTarget>("all_supervisors");
  const [dueDate, setDueDate] = React.useState<Date | undefined>(undefined);
  const [publishNow, setPublishNow] = React.useState(true);

  // reset on close
  React.useEffect(() => {
    if (!open) {
      const t = setTimeout(() => {
        setStep(1);
        setTitle("");
        setDescription("");
        setCategory("evaluation");
        setTarget("all_supervisors");
        setDueDate(undefined);
        setPublishNow(true);
      }, 250);
      return () => clearTimeout(t);
    }
  }, [open]);

  function handleNext() {
    if (step === 1 && !title.trim()) {
      toast({ title: "Title required", description: "Give your form a title to continue.", variant: "destructive" });
      return;
    }
    if (step === 1) setStep(2);
    else if (step === 2) setStep(3);
  }

  function handleBack() {
    if (step === 3) setStep(2);
    else if (step === 2) setStep(1);
  }

  function handleFinish(goToEditor: boolean) {
    if (!title.trim()) {
      toast({ title: "Title required", variant: "destructive" });
      return;
    }
    const id = createFormDocument({
      title: title.trim(),
      description: description.trim(),
      category,
    });

    let published = false;
    if (publishNow) {
      publishFormDocument(id);
      published = true;
      // only assign if we published (can't assign a draft meaningfully)
      assignForm({
        formId: id,
        target,
        dueDate: dueDate ? format(dueDate, "yyyy-MM-dd") : undefined,
      });
    }

    onOpenChange(false);
    toast({
      title: published ? "Form published & assigned" : "Draft created",
      description: published
        ? `Assigned to ${targetOptions.find((t) => t.value === target)?.label.toLowerCase()}. You can review responses from the Forms & Reviews hub.`
        : "Open the editor to add blocks, then publish to assign it.",
    });

    if (goToEditor) {
      navigate("coordinator.form-editor", { formId: id });
    } else {
      navigate("coordinator.forms");
    }
  }

  const selectedTarget = targetOptions.find((t) => t.value === target)!;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px] p-0 gap-0 overflow-hidden">
        {/* Progress header */}
        <div className="border-b border-border/60 bg-muted/30 px-5 py-3">
          <div className="flex items-center gap-2">
            {([1, 2, 3] as const).map((n) => (
              <React.Fragment key={n}>
                <div
                  className={cn(
                    "flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-semibold transition-colors",
                    step >= n
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground ring-1 ring-inset ring-border"
                  )}
                >
                  {step > n ? <CheckCircle2 className="h-3.5 w-3.5" /> : n}
                </div>
                {n < 3 && (
                  <div
                    className={cn(
                      "h-px flex-1 transition-colors",
                      step > n ? "bg-primary/60" : "bg-border"
                    )}
                  />
                )}
              </React.Fragment>
            ))}
            <div className="ml-auto text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Step {step} of 3
            </div>
          </div>
        </div>

        <DialogHeader className="px-5 pt-4 pb-1">
          <DialogTitle className="text-base">
            {step === 1 && "Create a new form"}
            {step === 2 && "Build your form"}
            {step === 3 && "Assign & publish"}
          </DialogTitle>
          <DialogDescription className="text-xs">
            {step === 1 && "Set the basics. You'll add questions in the editor next."}
            {step === 2 && "Choose how to proceed — refine in the editor now, or skip to assign and refine later."}
            {step === 3 && "Pick who should fill this form and when it's due. Then publish to send it out."}
          </DialogDescription>
        </DialogHeader>

        <div className="px-5 py-3">
          {/* STEP 1: Details */}
          {step === 1 && (
            <div className="space-y-3.5">
              <div className="space-y-1.5">
                <Label htmlFor="cfw-title">Form title</Label>
                <Input
                  id="cfw-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Mid-term Performance Evaluation"
                  autoFocus
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cfw-desc">Description <span className="text-muted-foreground font-normal">(optional)</span></Label>
                <Textarea
                  id="cfw-desc"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Briefly describe when and how this form is used."
                  rows={2}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Category</Label>
                <div className="grid grid-cols-1 gap-1.5">
                  {categoryOptions.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setCategory(opt.value)}
                      className={cn(
                        "flex items-center gap-2.5 rounded-md border px-3 py-2 text-left transition-colors",
                        category === opt.value
                          ? "border-primary bg-primary/5 ring-1 ring-inset ring-primary/30"
                          : "border-border/60 hover:bg-muted/40"
                      )}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="text-[13px] font-medium text-foreground">{opt.label}</div>
                        <div className="text-[11px] text-muted-foreground">{opt.hint}</div>
                      </div>
                      {category === opt.value && <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Build */}
          {step === 2 && (
            <div className="space-y-3">
              <div className="rounded-lg border border-border/60 bg-card p-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 text-primary">
                    <FileText className="h-4.5 w-4.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[13px] font-semibold text-foreground">{title || "Untitled form"}</div>
                    <div className="text-[11px] text-muted-foreground">
                      {FORM_CATEGORY_LABELS[category]}
                      {description && <> · {description}</>}
                    </div>
                  </div>
                </div>
              </div>

              <p className="text-xs text-muted-foreground leading-relaxed">
                Your form starts with a single heading block. You have two options:
              </p>

              <div className="grid grid-cols-1 gap-2">
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="flex items-start gap-3 rounded-lg border border-border/60 p-3.5 text-left transition-colors hover:bg-muted/40"
                >
                  <Sparkles className="mt-0.5 h-4 w-4 text-amber-500 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="text-[13px] font-medium text-foreground">Assign & publish now, refine later</div>
                    <div className="text-[11px] text-muted-foreground mt-0.5">
                      Publish with a starter template, assign to your audience, then open the editor to add questions. Recommended — gets the workflow moving.
                    </div>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={handleBack}
                  className="flex items-start gap-3 rounded-lg border border-border/60 p-3.5 text-left transition-colors hover:bg-muted/40"
                >
                  <Layers className="mt-0.5 h-4 w-4 text-teal-600 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="text-[13px] font-medium text-foreground">Build in the editor first</div>
                    <div className="text-[11px] text-muted-foreground mt-0.5">
                      Open the full block editor, add all your questions and rating tables, then come back to publish. Best for complex forms.
                    </div>
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: Assign & Publish */}
          {step === 3 && (
            <div className="space-y-3.5">
              <div className="space-y-1.5">
                <Label>Assign to</Label>
                <div className="grid grid-cols-1 gap-1.5">
                  {targetOptions.map((opt) => {
                    const Icon = opt.icon;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setTarget(opt.value)}
                        className={cn(
                          "flex items-start gap-2.5 rounded-md border px-3 py-2 text-left transition-colors",
                          target === opt.value
                            ? "border-primary bg-primary/5 ring-1 ring-inset ring-primary/30"
                            : "border-border/60 hover:bg-muted/40"
                        )}
                      >
                        <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", target === opt.value ? "text-primary" : "text-muted-foreground")} />
                        <div className="min-w-0 flex-1">
                          <div className="text-[13px] font-medium text-foreground">{opt.label}</div>
                          <div className="text-[11px] text-muted-foreground">{opt.description}</div>
                        </div>
                        {target === opt.value && <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />}
                      </button>
                    );
                  })}
                </div>
                {target === "specific_users" && (
                  <p className="rounded-md bg-amber-50 px-2.5 py-1.5 text-[11px] text-amber-800 ring-1 ring-inset ring-amber-200/70 dark:bg-amber-950/40 dark:text-amber-300 dark:ring-amber-900/50">
                    Specific-user assignment opens a picker in the editor. For this demo we'll create the assignment record and you can refine recipients there.
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="cfw-due">Due date <span className="text-muted-foreground font-normal">(optional)</span></Label>
                <div className="flex items-center gap-2">
                  <CalendarClock className="h-4 w-4 text-muted-foreground" />
                  <Input
                    id="cfw-due"
                    type="date"
                    value={dueDate ? format(dueDate, "yyyy-MM-dd") : ""}
                    onChange={(e) => setDueDate(e.target.value ? new Date(e.target.value) : undefined)}
                    className="h-9 max-w-[180px]"
                  />
                  {dueDate && (
                    <Button type="button" variant="ghost" size="sm" className="h-7 text-[11px] text-muted-foreground" onClick={() => setDueDate(undefined)}>
                      Clear
                    </Button>
                  )}
                </div>
              </div>

              <label
                htmlFor="cfw-publish"
                className="flex items-start gap-2.5 rounded-md border border-border/60 bg-muted/30 px-3 py-2.5 cursor-pointer"
              >
                <Checkbox
                  id="cfw-publish"
                  checked={publishNow}
                  onCheckedChange={(v) => setPublishNow(v === true)}
                  className="mt-0.5"
                />
                <div className="min-w-0 flex-1">
                  <div className="text-[13px] font-medium text-foreground flex items-center gap-1.5">
                    <Send className="h-3.5 w-3.5 text-primary" />
                    Publish immediately on create
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">
                    {publishNow
                      ? `Assigned ${selectedTarget.label.toLowerCase()} will be notified and can start filling immediately.`
                      : "Saves as a draft. You'll need to publish manually before anyone can fill it."}
                  </div>
                </div>
              </label>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-2 border-t border-border/60 px-5 py-3">
          <div className="text-[11px] text-muted-foreground">
            {step === 1 && "You can edit all of this later."}
            {step === 2 && "Skipping to assign creates a starter template."}
            {step === 3 && publishNow && "Publishing sends the form to assigned users."}
            {step === 3 && !publishNow && "Saves as draft — publish later from the editor."}
          </div>
          <div className="flex items-center gap-2">
            {step > 1 && (
              <Button variant="ghost" size="sm" onClick={handleBack} className="gap-1.5">
                <ArrowLeft className="h-3.5 w-3.5" /> Back
              </Button>
            )}
            {step < 3 ? (
              <Button size="sm" onClick={handleNext} className="gap-1.5">
                Next <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            ) : (
              <>
                <Button variant="outline" size="sm" onClick={() => handleFinish(true)} className="gap-1.5">
                  <Layers className="h-3.5 w-3.5" /> Create &amp; edit
                </Button>
                <Button size="sm" onClick={() => handleFinish(false)} className="gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  {publishNow ? "Publish & assign" : "Create draft"}
                </Button>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
