"use client";
import { useState } from "react";
import { useAppStore } from "@/store/use-app-store";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { CircleHelp } from "lucide-react";
export function WorkflowHelp() {
  const [open, setOpen] = useState(false);
  const role = useAppStore((s) => s.currentUser?.role);
  const coordinator = role === "coordinator";
  const steps = coordinator
    ? [
        "Open Practicum → Set up format. Start from the pilot and adjust sections, instructions and who answers each one.",
        "Create and publish an evaluation in Form Library. Choose Add to practicum report, then select its destination section and respondent.",
        "Download and inspect the blank Word layout. Publish the format after its checklist is complete. Publishing saves a fixed rubric and layout.",
        "Assign the published version to students. Their linked forms go to the student or assigned supervisor automatically.",
        "Review form responses in Form Library → Submissions. Then review the assembled report sections in Practicum → Review & export.",
        "Build the final Word report after required checks pass. Draft exports need an explicit choice. Wet signatures and grammarian review happen outside the portal.",
      ]
    : role === "supervisor"
      ? [
          "Open My Interns, choose the intern and select Review practicum report.",
          "Open a linked form or your Forms inbox. Check the intern and cycle shown at the top; assigned requirements keep a fixed rubric.",
          "Save answers, then submit for coordinator review. Drafts remain editable; submitted answers stay locked until revision is requested.",
          "Review student sections that are ready. You cannot approve your own supervisor response.",
        ]
      : [
          "Open My Practicum Report and choose the official assigned format. Independent drafts are separate from official assignments.",
          "Write your own sections. Journals and attendance use saved records in the report's placement period; do not manually add their hours.",
          "Open linked forms to answer them. A supervisor requirement shows who is responsible, so you do not fill it for them.",
          "Save, mark completed sections ready and check the feedback. A submitted form and a reviewed report section are separate steps.",
          "Preview the report, resolve its checklist and export Word. Upload the grammarian-reviewed DOCX against the export they checked.",
        ];
  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setOpen(true)}
        aria-label="How to use Practo"
      >
        <CircleHelp className="size-4" />
        <span className="hidden sm:inline">How to use</span>
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>How to use Practo</DialogTitle>
            <DialogDescription>
              {coordinator
                ? "Coordinator"
                : role === "supervisor"
                  ? "Supervisor"
                  : "Student"}{" "}
              workflow. You can reopen this guide anytime.
            </DialogDescription>
          </DialogHeader>
          <ol className="list-decimal space-y-3 pl-5 text-sm leading-relaxed">
            {steps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
          <div className="rounded-lg bg-muted p-3 text-sm">
            <strong>Forgot what a status means?</strong>
            <p className="mt-1">
              Draft = still editing. Submitted = waiting for a form review.
              Approved = accepted form response. For review = report section
              awaiting its reviewer. Reviewed = section checked against its
              current sources.
            </p>
          </div>
          <p className="text-xs text-muted-foreground">
            Changes to a published format need a new version. Existing
            assignments and downloaded Word files do not change automatically.
            If a save fails, keep the page open and retry; your local draft
            recovery remains available.
          </p>
        </DialogContent>
      </Dialog>
    </>
  );
}
