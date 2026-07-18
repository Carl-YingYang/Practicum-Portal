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
import { FormBlockRenderer } from "@/components/portal/shared/form-block-renderer";
import { FormStatusBadge, SubmissionStatusBadge } from "@/components/portal/shared/badges";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Printer,
  Download,
  Layers,
  FileText,
  Calendar,
  Eye,
} from "lucide-react";
import { type FormDocument, type FormSubmission, FORM_CATEGORY_LABELS } from "@/lib/types";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

type FieldValue = string | Record<string, string>;

/**
 * FormPreviewModal — a large, scrollable preview of a form.
 * Two modes:
 *   - "template": shows the blank form as supervisors/students will see it (interactive).
 *   - "submission": shows a filled-in submission (read-only, with the submitter's values).
 */
export function FormPreviewModal({
  open,
  onOpenChange,
  form,
  submission,
  mode = "template",
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  form: FormDocument | null;
  submission?: FormSubmission | null;
  mode?: "template" | "submission";
}) {
  const { toast } = useToast();
  const [values, setValues] = React.useState<Record<string, FieldValue>>({});

  React.useEffect(() => {
    if (open && submission) {
      setValues(submission.values);
    } else if (open) {
      setValues({});
    }
  }, [open, submission]);

  if (!form) return null;

  const blockCount = form.blocks.length;
  const ratingTables = form.blocks.filter((b) => b.type === "rating-table").length;
  const publishedDate = form.publishedAt ? format(new Date(form.publishedAt), "MMM d, yyyy 'at' h:mm a") : "";

  function handlePrint() {
    toast({ title: "Print preview", description: "In production this would open a print-friendly view." });
  }
  function handleDownload() {
    toast({ title: "Export queued", description: "A PDF export would be generated in production." });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[760px] p-0 gap-0 overflow-hidden max-h-[92vh]">
        {/* Header */}
        <DialogHeader className="border-b border-border/60 px-5 py-3.5 pr-12">
          <div className="flex flex-wrap items-center gap-1.5">
            {mode === "submission" && submission ? (
              <SubmissionStatusBadge status={submission.status} withIcon />
            ) : (
              <FormStatusBadge status={form.status} />
            )}
            <span className="rounded-full bg-muted/60 px-2 py-0.5 text-[11px] font-medium text-muted-foreground ring-1 ring-inset ring-border/60">
              {FORM_CATEGORY_LABELS[form.category]}
            </span>
            <span className="text-[11px] text-muted-foreground">v{form.version}</span>
            {mode === "template" && (
              <span className="ml-auto inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                <Eye className="h-3 w-3" /> Preview mode
              </span>
            )}
          </div>
          <DialogTitle className="mt-1.5 text-base leading-tight">{form.title}</DialogTitle>
          {form.description && (
            <DialogDescription className="text-xs leading-relaxed">{form.description}</DialogDescription>
          )}
        </DialogHeader>

        {/* Meta strip */}
        <div className="flex flex-wrap items-center gap-3 border-b border-border/60 bg-muted/20 px-5 py-2 text-[11.5px] text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Layers className="h-3 w-3" /> {blockCount} {blockCount === 1 ? "block" : "blocks"}
          </span>
          {ratingTables > 0 && (
            <span className="inline-flex items-center gap-1">
              <FileText className="h-3 w-3" /> {ratingTables} rating {ratingTables === 1 ? "table" : "tables"}
            </span>
          )}
          {publishedDate && (
            <span className="inline-flex items-center gap-1">
              <Calendar className="h-3 w-3" /> Published {publishedDate}
            </span>
          )}
          {mode === "submission" && submission?.submittedAt && (
            <span className="inline-flex items-center gap-1">
              <Calendar className="h-3 w-3" /> Submitted {format(new Date(submission.submittedAt), "MMM d, yyyy 'at' h:mm a")}
            </span>
          )}
        </div>

        {/* Body — scrollable form preview */}
        <ScrollArea className="max-h-[55vh]">
          <div className="space-y-3.5 px-5 py-4">
            {form.blocks.length === 0 ? (
              <div className="rounded-md border border-dashed border-border/70 px-4 py-8 text-center text-[12px] text-muted-foreground">
                This form has no blocks yet. Open the editor to add questions, rating tables, and signature fields.
              </div>
            ) : (
              form.blocks.map((b) => (
                <FormBlockRenderer
                  key={b.id}
                  block={b}
                  interactive={mode === "template"}
                  values={values}
                  onValueChange={(id, v) => setValues((prev) => ({ ...prev, [id]: v }))}
                />
              ))
            )}
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 border-t border-border/60 px-5 py-3">
          <Button variant="outline" size="sm" onClick={handlePrint} className="gap-1.5">
            <Printer className="h-3.5 w-3.5" /> Print
          </Button>
          <Button variant="outline" size="sm" onClick={handleDownload} className="gap-1.5">
            <Download className="h-3.5 w-3.5" /> Export PDF
          </Button>
          <Button size="sm" onClick={() => onOpenChange(false)}>
            Done
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
