"use client";

import * as React from "react";
import { useAppStore } from "@/store/use-app-store";
import { PageHeader } from "@/components/portal/layout/page-header";
import { SectionCard } from "@/components/portal/shared/section-card";
import { EmptyState } from "@/components/portal/shared/empty-state";
import { FormStatusBadge } from "@/components/portal/shared/badges";
import { FormBlockRenderer } from "@/components/portal/shared/form-block-renderer";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import {
  ChevronLeft,
  Printer,
  RotateCcw,
  CheckCircle2,
  FileText,
  Calendar,
  Layers,
  MoreHorizontal,
  Download,
} from "lucide-react";
import {
  type FormDocument,
  FORM_CATEGORY_LABELS,
} from "@/lib/types";
import { format } from "date-fns";

type FieldValue = string | Record<string, string>;

export function SupervisorFormViewer({ formId }: { formId?: string }) {
  const { toast } = useToast();
  const navigate = useAppStore((s) => s.navigate);
  const back = useAppStore((s) => s.back);
  const canBack = useAppStore((s) => s.history.length > 0);
  const form = useAppStore((s) => s.formDocuments.find((d) => d.id === formId));

  const [values, setValues] = React.useState<Record<string, FieldValue>>({});
  const [submitted, setSubmitted] = React.useState(false);

  if (!form) {
    return (
      <div className="space-y-4">
        <PageHeader title="Form not found" showBack={canBack} />
        <SectionCard>
          <EmptyState
            icon={FileText}
            title="This form doesn't exist"
            description="It may have been unpublished by the coordinator."
            actionLabel="Back to forms"
            onAction={() => navigate("supervisor.forms")}
          />
        </SectionCard>
      </div>
    );
  }

  if (form.status !== "published") {
    return (
      <div className="space-y-4">
        <PageHeader title={form.title} showBack={canBack} />
        <SectionCard>
          <EmptyState
            icon={FileText}
            title="This form is no longer published"
            description="The coordinator reverted it to draft or archived it."
            actionLabel="Back to forms"
            onAction={() => navigate("supervisor.forms")}
          />
        </SectionCard>
      </div>
    );
  }

  const publishedDate = form.publishedAt ? format(new Date(form.publishedAt), "MMM d, yyyy 'at' h:mm a") : "";
  const blockCount = form.blocks.length;
  const ratingTables = form.blocks.filter((b) => b.type === "rating-table").length;

  function handlePrint() {
    toast({ title: "Print preview", description: "In production this would open a print-friendly view." });
  }

  function handleDownload() {
    toast({ title: "Export queued", description: "A PDF export would be generated in production." });
  }

  function handleReset() {
    setValues({});
    setSubmitted(false);
    toast({ title: "Form cleared" });
  }

  function handleSubmit() {
    setSubmitted(true);
    toast({
      title: "Form submitted",
      description: "Your responses have been recorded (in-memory for this demo).",
    });
  }

  return (
    <div className="space-y-3">
      {/* Sticky action bar */}
      <div className="sticky top-0 z-20 -mx-5 border-b border-border/60 bg-background/95 px-5 py-2 backdrop-blur sm:-mx-6 sm:px-6">
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="ghost" size="sm" onClick={back} className="gap-1 text-muted-foreground hover:text-foreground">
            <ChevronLeft className="h-4 w-4" /> Back to forms
          </Button>
          <div className="hidden h-5 w-px bg-border/70 sm:block" />
          <div className="flex items-center gap-1.5">
            <FormStatusBadge status={form.status} />
            <span className="rounded-full bg-muted/60 px-2 py-0.5 text-[11px] font-medium text-muted-foreground ring-1 ring-inset ring-border/60">
              {FORM_CATEGORY_LABELS[form.category]}
            </span>
            <span className="text-[11px] text-muted-foreground">v{form.version}</span>
          </div>
          <div className="ml-auto flex items-center gap-1.5">
            <Button variant="outline" size="sm" className="gap-1.5" onClick={handlePrint}>
              <Printer className="h-3.5 w-3.5" /> Print
            </Button>
            <Button variant="outline" size="sm" className="gap-1.5" onClick={handleDownload}>
              <Download className="h-3.5 w-3.5" /> Export
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuItem onClick={handleReset}>
                  <RotateCcw className="mr-2 h-3.5 w-3.5" /> Clear responses
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      <PageHeader
        title={form.title}
        description={form.description || undefined}
        showBack={false}
      />

      {/* Meta strip */}
      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border/60 bg-card px-3.5 py-2 text-[11.5px] text-muted-foreground">
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
        <span className="ml-auto inline-flex items-center gap-1.5 text-muted-foreground">
          {submitted ? (
            <>
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
              <span className="text-emerald-700 dark:text-emerald-400">Responses submitted</span>
            </>
          ) : (
            <span>Responses are saved in-memory while you fill this out.</span>
          )}
        </span>
      </div>

      {/* The form itself */}
      <SectionCard>
        <div className="space-y-3.5">
          {form.blocks.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="This form is empty"
              description="The coordinator hasn't added any blocks yet."
            />
          ) : (
            form.blocks.map((b) => (
              <FormBlockRenderer
                key={b.id}
                block={b}
                interactive={!submitted}
                values={values}
                onValueChange={(id, v) => setValues((prev) => ({ ...prev, [id]: v }))}
              />
            ))
          )}
        </div>
      </SectionCard>

      {/* Submit / footer */}
      {!submitted ? (
        <div className="flex flex-wrap items-center justify-end gap-2 rounded-lg border border-border/60 bg-card p-3">
          <Button variant="ghost" size="sm" onClick={handleReset} className="gap-1.5 text-muted-foreground">
            <RotateCcw className="h-3.5 w-3.5" /> Clear
          </Button>
          <Button size="sm" onClick={handleSubmit} className="gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5" /> Submit responses
          </Button>
        </div>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-emerald-200/70 bg-emerald-50/60 p-3 dark:border-emerald-900/50 dark:bg-emerald-950/30">
          <div className="flex items-center gap-2 text-[13px] text-emerald-800 dark:text-emerald-300">
            <CheckCircle2 className="h-4 w-4" />
            <span className="font-medium">Responses submitted.</span>
            <span className="text-emerald-700/80 dark:text-emerald-400/80">You can still print or export a copy for your records.</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Button variant="outline" size="sm" onClick={handlePrint} className="gap-1.5">
              <Printer className="h-3.5 w-3.5" /> Print
            </Button>
            <Button variant="outline" size="sm" onClick={handleReset} className="gap-1.5">
              <RotateCcw className="h-3.5 w-3.5" /> Fill again
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
