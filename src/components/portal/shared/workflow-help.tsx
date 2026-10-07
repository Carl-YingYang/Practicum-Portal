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
        "Check or publish saves the draft and synchronizes Word section placeholders. Follow any Fix link to the setting, inspect Sample Word, then confirm publication.",
        "Ready active students are selected by default. Review the recipients and any missing account/supervisor, then confirm assignment. Linked forms go to the correct accounts together.",
        "Review form responses in Form Library → Submissions. Then review the assembled report sections in Practicum → Review & export.",
        "Build the final Word report after required checks pass. Draft exports need an explicit choice. Wet signatures and grammarian review happen outside the portal.",
      ]
    : role === "supervisor"
      ? [
          "Open My Interns, choose the intern and select Review practicum report.",
          "Open Forms for one checklist per intern. To do is work remaining; Awaiting review means submitted; Approved means complete. Check the intern and cycle before answering.",
          "Save answers, then submit for coordinator review. Drafts remain editable; submitted answers stay locked until revision is requested.",
          "Review student sections that are ready. You cannot approve your own supervisor response.",
        ]
      : [
          "Open My Practicum Report and choose the official assigned format. Independent drafts are separate from official assignments.",
          "Write your own sections. Journals and attendance use saved records in the report's placement period; do not manually add their hours.",
          "Answer your linked forms. From your supervisor shows readonly submitted responses with Word/PDF downloads; approved assigned responses join the matching report section.",
          "For image sections, write a placeholder description and caption. Student evidence uploads are disabled; add photos to the final offline Word document if your professor requires them. Save and mark sections ready for review.",
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
