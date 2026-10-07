"use client";
import { useFormEditorHistory } from "@/hooks/use-form-editor-history";
import { ConfirmDialog } from "../shared/confirm-dialog";
import { FormExportActions } from "../shared/form-export-actions";
import { isRatingHeading } from "@/domain/form-templates";
import { formStructureErrors } from "@/domain/form-templates";

import * as React from "react";
import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  arrayMove,
  verticalListSortingStrategy,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { flushChanges } from "@/client/portal-client";
import { useAsyncAction } from "@/hooks/use-async-action";
import { useAppStore } from "@/store/use-app-store";
import { FormReportLink } from "../templates/form-report-link";
import { PageHeader } from "@/components/portal/layout/page-header";
import { SectionCard } from "@/components/portal/shared/section-card";
import { EmptyState } from "@/components/portal/shared/empty-state";
import { FormStatusBadge } from "@/components/portal/shared/badges";
import { FormBlockRenderer } from "@/components/portal/shared/form-block-renderer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  GripVertical,
  Plus,
  ChevronUp,
  ChevronDown,
  Trash2,
  Copy,
  Heading1,
  Heading2,
  Heading3,
  Pilcrow,
  Info,
  Minus,
  TextCursorInput,
  AlignLeft,
  Table2,
  PenLine,
  Eye,
  Pencil,
  Send,
  RotateCcw,
  Archive,
  X,
  FileText,
  MoreVertical,
} from "lucide-react";
import {
  type FormBlock,
  type FormBlockType,
  type FormCategory,
  type FormDocument,
  FORM_CATEGORY_LABELS,
} from "@/lib/types";

interface BlockTypeMeta {
  type: FormBlockType;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  hint: string;
}

const BLOCK_TYPES: BlockTypeMeta[] = [
  {
    type: "heading",
    label: "Heading",
    icon: Heading2,
    hint: "Section / sub-section title",
  },
  { type: "paragraph", label: "Paragraph", icon: Pilcrow, hint: "Body text" },
  {
    type: "instruction",
    label: "Instruction",
    icon: Info,
    hint: "Muted helper text",
  },
  { type: "divider", label: "Divider", icon: Minus, hint: "Horizontal rule" },
  {
    type: "info-field",
    label: "Info field",
    icon: TextCursorInput,
    hint: "Label + blank (one line)",
  },
  {
    type: "fill-in",
    label: "Fill-in",
    icon: AlignLeft,
    hint: "Label + multi-line answer area",
  },
  {
    type: "rating-table",
    label: "Rating table",
    icon: Table2,
    hint: "Criteria × scale matrix",
  },
  {
    type: "signature",
    label: "Signature",
    icon: PenLine,
    hint: "Signature line + caption",
  },
];

export function FormEditor({ formId }: { formId?: string }) {
  const { toast } = useToast();
  const { pending, error: actionError, run } = useAsyncAction();
  const syncStatus = useAppStore((s) => s.syncStatus);
  const navigate = useAppStore((s) => s.navigate);
  const back = useAppStore((s) => s.back);
  const canBack = useAppStore((s) => s.history.length > 0);

  const form = useAppStore((s) => s.formDocuments.find((d) => d.id === formId));
  const editorHistory = useFormEditorHistory(form);
  const updateFormMeta = useAppStore((s) => s.updateFormMeta);
  const updateFormBlock = useAppStore((s) => s.updateFormBlock);
  const addFormBlock = useAppStore((s) => s.addFormBlock);
  const removeFormBlock = useAppStore((s) => s.removeFormBlock);
  const moveFormBlock = useAppStore((s) => s.moveFormBlock);
  const reorderFormBlocks = useAppStore((s) => s.reorderFormBlocks);
  const duplicateFormBlock = useAppStore((s) => s.duplicateFormBlock);
  const publishFormDocument = useAppStore((s) => s.publishFormDocument);
  const unpublishFormDocument = useAppStore((s) => s.unpublishFormDocument);
  const archiveFormDocument = useAppStore((s) => s.archiveFormDocument);

  const [confirmation, setConfirmation] = React.useState<
    "publish" | "archive" | null
  >(null);
  const [previewMode, setPreviewMode] = React.useState(false);
  const [previewValues, setPreviewValues] = React.useState<
    Record<string, string | Record<string, string>>
  >({});

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  if (!form) {
    return (
      <div className="space-y-4">
        <PageHeader title="Form not found" showBack={canBack} />
        <SectionCard>
          <EmptyState
            icon={FileText}
            title="This form doesn't exist"
            description="It may have been deleted. Pick another form from the list."
            actionLabel="Back to forms"
            onAction={() => navigate("coordinator.forms")}
          />
        </SectionCard>
      </div>
    );
  }

  function handleDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id || !form) return;
    const ids = form.blocks.map((b) => b.id);
    const oldIdx = ids.indexOf(active.id as string);
    const newIdx = ids.indexOf(over.id as string);
    if (oldIdx < 0 || newIdx < 0) return;
    reorderFormBlocks(form.id, arrayMove(ids, oldIdx, newIdx));
  }

  function handleAddBlock(type: FormBlockType, afterBlockId?: string) {
    if (!form || form.status !== "draft" || pending) return;
    addFormBlock(form.id, type, afterBlockId);
    toast({
      title: "Block added",
      description: BLOCK_TYPES.find((b) => b.type === type)?.label,
    });
  }

  async function handlePublish() {
    if (!form) return;
    if (!form.title.trim()) {
      throw new Error("Give the form a title before publishing.");
    }
    if (form.blocks.length === 0) {
      toast({
        title: "Cannot publish empty form",
        description: "Add at least one block first.",
        variant: "destructive",
      });
      return;
    }
    const errors = formStructureErrors(form);
    if (errors.length) throw new Error(errors.join(" "));
    publishFormDocument(form.id);
    await flushChanges();
    toast({
      title: "Form published",
      description: `v${form.version + 1} is available to assigned recipients. Never-submitted ordinary drafts follow this version; submitted answers and report rubrics stay unchanged.`,
    });
  }

  async function handleUnpublish() {
    if (!form) return;
    unpublishFormDocument(form.id);
    await flushChanges();
    toast({ title: "Reverted to draft" });
  }

  async function handleArchive() {
    if (!form) return;
    archiveFormDocument(form.id);
    await flushChanges();
    toast({ title: "Form archived" });
    navigate("coordinator.forms");
  }

  const showingPreview = previewMode || form.status !== "draft";
  const outlineItems = form.blocks.filter((b) => b.type === "heading");

  return (
    <TooltipProvider delayDuration={250}>
      <div className="space-y-3">
        <FormReportLink formId={form.id} />
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={
              pending ||
              editorHistory.busy ||
              form.status !== "draft" ||
              !editorHistory.canUndo
            }
            onClick={() => void editorHistory.undo()}
          >
            Undo
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={
              pending ||
              editorHistory.busy ||
              form.status !== "draft" ||
              !editorHistory.canRedo
            }
            onClick={() => void editorHistory.redo()}
          >
            Redo
          </Button>
          <FormExportActions form={form} values={previewValues} sample />
        </div>
        {editorHistory.error && (
          <p role="alert" className="text-sm text-destructive">
            {editorHistory.error}
          </p>
        )}
        {/* Sticky editor toolbar */}
        <div className="sticky top-16 z-20 -mx-4 border-b border-border/60 bg-background/95 px-4 py-2 backdrop-blur sm:-mx-6 sm:px-6">
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={back}
              className="gap-1 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" /> Exit
            </Button>
            <div className="hidden h-5 w-px bg-border/70 sm:block" />
            <div className="flex items-center gap-1.5">
              <FormStatusBadge status={form.status} />
              {form.version > 0 && (
                <span className="text-[11px] text-muted-foreground">
                  v{form.version}
                </span>
              )}
            </div>
            <div className="flex w-full flex-wrap items-center gap-1.5 sm:ml-auto sm:w-auto">
              <Button
                variant={showingPreview ? "default" : "outline"}
                size="sm"
                disabled={pending || form.status !== "draft"}
                onClick={() => setPreviewMode((v) => !v)}
                className="gap-1.5"
              >
                {showingPreview ? (
                  <Pencil className="h-3.5 w-3.5" />
                ) : (
                  <Eye className="h-3.5 w-3.5" />
                )}
                {form.status !== "draft"
                  ? "Preview"
                  : previewMode
                    ? "Edit"
                    : "Preview"}
              </Button>
              {form.status === "published" ? (
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pending}
                  aria-busy={pending}
                  onClick={() => void run(handleUnpublish)}
                  className="gap-1.5"
                >
                  <RotateCcw className="h-3.5 w-3.5" />{" "}
                  {pending ? "Saving…" : "Unpublish"}
                </Button>
              ) : (
                <Button
                  size="sm"
                  disabled={pending || form.status !== "draft"}
                  aria-busy={pending}
                  onClick={() => setConfirmation("publish")}
                  className="gap-1.5"
                >
                  <Send className="h-3.5 w-3.5" />{" "}
                  {pending ? "Saving…" : "Publish"}
                </Button>
              )}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-11"
                    aria-label="Form actions"
                    disabled={pending}
                  >
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44">
                  <DropdownMenuItem
                    disabled={pending}
                    onClick={() => setConfirmation("archive")}
                  >
                    <Archive className="mr-2 h-3.5 w-3.5" /> Archive form
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>

        <p
          role={actionError ? "alert" : "status"}
          className={
            actionError
              ? "text-sm text-destructive"
              : "text-xs text-muted-foreground"
          }
        >
          {actionError ||
            (pending || syncStatus === "saving"
              ? "Saving form changes…"
              : syncStatus === "error"
                ? "Changes were not saved. Reconnect before retrying."
                : "Form changes saved")}
        </p>
        {form.status !== "draft" && (
          <p className="text-sm text-muted-foreground">
            {form.status === "published"
              ? "Published form — unpublish to edit. Republish updates ordinary unsubmitted drafts; submitted answers and assigned report versions retain their rubric."
              : "Archived form — read only."}
          </p>
        )}
        <div className="grid min-w-0 gap-3 xl:grid-cols-[180px_minmax(0,1fr)_180px]">
          {/* Left: outline */}
          <aside className="hidden min-w-0 xl:block">
            <SectionCard title="Outline" className="sticky top-36">
              {outlineItems.length === 0 ? (
                <p className="text-[12px] text-muted-foreground">
                  Headings you add will appear here.
                </p>
              ) : (
                <ul className="space-y-1">
                  {outlineItems.map((b) => (
                    <li key={b.id}>
                      <a
                        href={`#block-${b.id}`}
                        className={cn(
                          "block rounded px-1.5 py-1 text-[12px] text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground",
                          b.level === 1 && "font-semibold text-foreground",
                        )}
                      >
                        {b.text || "Untitled"}
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </SectionCard>
          </aside>

          {/* Center: title meta + blocks */}
          <div className="min-w-0 space-y-3">
            <SectionCard>
              <fieldset
                disabled={pending || form.status !== "draft"}
                className="min-w-0 space-y-2.5"
              >
                <div className="space-y-1">
                  <Label
                    htmlFor="form-title"
                    className="text-[11px] uppercase tracking-wide text-muted-foreground"
                  >
                    Form title
                  </Label>
                  <Input
                    id="form-title"
                    value={form.title}
                    onChange={(e) =>
                      updateFormMeta(form.id, { title: e.target.value })
                    }
                    className="h-9 text-[14.5px] font-semibold"
                    placeholder="Untitled form"
                  />
                </div>
                <div className="space-y-1">
                  <Label
                    htmlFor="form-desc"
                    className="text-[11px] uppercase tracking-wide text-muted-foreground"
                  >
                    Description
                  </Label>
                  <Textarea
                    id="form-desc"
                    value={form.description}
                    onChange={(e) =>
                      updateFormMeta(form.id, { description: e.target.value })
                    }
                    placeholder="What is this form for? When is it used?"
                    rows={2}
                    className="text-[13px]"
                  />
                </div>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Label
                      htmlFor="form-cat"
                      className="text-[11px] uppercase tracking-wide text-muted-foreground"
                    >
                      Category
                    </Label>
                    <Select
                      value={form.category}
                      onValueChange={(v) =>
                        updateFormMeta(form.id, { category: v as FormCategory })
                      }
                    >
                      <SelectTrigger id="form-cat" className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(FORM_CATEGORY_LABELS).map(
                          ([val, lbl]) => (
                            <SelectItem key={val} value={val}>
                              {lbl}
                            </SelectItem>
                          ),
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">
                      Blocks
                    </Label>
                    <div className="flex h-9 items-center rounded-md border border-input bg-muted/30 px-2.5 text-[13px] text-muted-foreground">
                      {form.blocks.length} total
                    </div>
                  </div>
                </div>
              </fieldset>
            </SectionCard>

            {/* Toolbar */}
            {!showingPreview && (
              <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-border/60 bg-card p-2">
                <span className="px-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  Insert:
                </span>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="h-7 gap-1.5">
                      <Plus className="h-3.5 w-3.5" /> Block
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-56">
                    {BLOCK_TYPES.map((b) => (
                      <DropdownMenuItem
                        key={b.type}
                        onClick={() => handleAddBlock(b.type)}
                      >
                        <b.icon className="mr-2 h-3.5 w-3.5" />
                        <div className="flex flex-col">
                          <span className="text-[13px] font-medium">
                            {b.label}
                          </span>
                          <span className="text-[11px] text-muted-foreground">
                            {b.hint}
                          </span>
                        </div>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
                {BLOCK_TYPES.map((b) => (
                  <Tooltip key={b.type}>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => handleAddBlock(b.type)}
                      >
                        <b.icon className="h-3.5 w-3.5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="text-[11px]">
                      {b.label}
                    </TooltipContent>
                  </Tooltip>
                ))}
              </div>
            )}

            {/* Blocks (edit or preview) */}
            {showingPreview ? (
              <SectionCard
                title="Live preview"
                description="How supervisors will see this form."
              >
                <div className="space-y-3">
                  {form.blocks.map((b) => (
                    <FormBlockRenderer
                      key={b.id}
                      block={b}
                      interactive
                      values={previewValues}
                      onValueChange={(id, v) =>
                        setPreviewValues((prev) => ({ ...prev, [id]: v }))
                      }
                    />
                  ))}
                  {form.blocks.length === 0 && (
                    <p className="text-[12.5px] text-muted-foreground">
                      No blocks yet — switch to Edit to add some.
                    </p>
                  )}
                </div>
              </SectionCard>
            ) : (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={form.blocks.map((b) => b.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-2">
                    {form.blocks.map((b, idx) => (
                      <SortableBlock
                        key={b.id}
                        block={b}
                        earlierQuestions={form.blocks
                          .slice(0, idx)
                          .filter((q) => q.type === "fill-in" && !q.showIf)}
                        index={idx}
                        total={form.blocks.length}
                        onChange={(patch) =>
                          updateFormBlock(form.id, b.id, patch)
                        }
                        onRemove={() => removeFormBlock(form.id, b.id)}
                        onMoveUp={() => moveFormBlock(form.id, b.id, "up")}
                        onMoveDown={() => moveFormBlock(form.id, b.id, "down")}
                        onDuplicate={() => duplicateFormBlock(form.id, b.id)}
                        onAddAfter={(type) => handleAddBlock(type, b.id)}
                      />
                    ))}
                    {form.blocks.length === 0 && (
                      <div className="rounded-lg border border-dashed border-border/70 bg-muted/20 p-6 text-center">
                        <p className="text-[13px] text-muted-foreground">
                          Start by inserting a block above.
                        </p>
                      </div>
                    )}
                  </div>
                </SortableContext>
              </DndContext>
            )}

            {/* Bottom insert helper */}
            {!showingPreview && form.blocks.length > 0 && (
              <div className="flex justify-center pt-1">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="gap-1.5 text-muted-foreground"
                    >
                      <Plus className="h-3.5 w-3.5" /> Add block at end
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="center" className="w-56">
                    {BLOCK_TYPES.map((b) => (
                      <DropdownMenuItem
                        key={b.type}
                        onClick={() => handleAddBlock(b.type)}
                      >
                        <b.icon className="mr-2 h-3.5 w-3.5" /> {b.label}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}
          </div>

          {/* Right: insert helper / tips */}
          <aside className="hidden min-w-0 xl:block">
            <SectionCard title="Block types" className="sticky top-36">
              <ul className="space-y-1.5">
                {BLOCK_TYPES.map((b) => (
                  <li key={b.type}>
                    <button
                      type="button"
                      onClick={() => handleAddBlock(b.type)}
                      disabled={showingPreview || pending}
                      className="flex w-full items-start gap-2 disabled:opacity-50 rounded-md px-1.5 py-1.5 text-left transition-colors hover:bg-muted/50"
                    >
                      <b.icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      <div className="min-w-0">
                        <div className="text-[12.5px] font-medium text-foreground">
                          {b.label}
                        </div>
                        <div className="text-[11px] text-muted-foreground">
                          {b.hint}
                        </div>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            </SectionCard>
          </aside>
        </div>
      </div>
      <ConfirmDialog
        open={confirmation !== null}
        onOpenChange={(open) => {
          if (!open) setConfirmation(null);
        }}
        title={
          confirmation === "archive"
            ? "Archive this form?"
            : "Publish this form?"
        }
        description={
          confirmation === "archive"
            ? "Recipients cannot start new responses. Saved answers and report rubrics remain available."
            : "Never-submitted ordinary drafts will use this version. Submitted responses and assigned report rubrics keep their original version. Check the sample before publishing."
        }
        confirmLabel={
          confirmation === "archive" ? "Archive form" : "Publish form"
        }
        onConfirm={confirmation === "archive" ? handleArchive : handlePublish}
      />
    </TooltipProvider>
  );
}

// ============================================================
// Sortable block wrapper with inline editing per block type
// ============================================================

function SortableBlock({
  block,
  earlierQuestions,
  index,
  total,
  onChange,
  onRemove,
  onMoveUp,
  onMoveDown,
  onDuplicate,
  onAddAfter,
}: {
  block: FormBlock;
  earlierQuestions: FormBlock[];
  index: number;
  total: number;
  onChange: (patch: Partial<FormBlock>) => void;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDuplicate: () => void;
  onAddAfter: (type: FormBlockType) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: block.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group relative rounded-lg border bg-card transition-shadow",
        isDragging
          ? "z-10 border-primary/60 shadow-md"
          : "border-border/60 hover:border-border/90",
      )}
    >
      {/* Block chrome: drag handle + type badge + actions */}
      <div className="flex flex-wrap items-center gap-1 border-b border-border/40 px-2 py-1">
        <button
          type="button"
          {...attributes}
          {...listeners}
          className="inline-flex size-11 shrink-0 items-center justify-center cursor-grab rounded p-1 text-muted-foreground/60 hover:bg-muted/70 hover:text-foreground active:cursor-grabbing"
          aria-label="Drag to reorder"
        >
          <GripVertical className="h-3.5 w-3.5" />
        </button>
        <span className="rounded bg-muted/60 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          {block.type}
        </span>
        <span className="text-[10.5px] text-muted-foreground/70">
          #{index + 1}
        </span>
        <div className="ml-auto flex items-center gap-0.5">
          <Button
            variant="ghost"
            size="icon"
            className="size-11"
            aria-label="Move block up"
            onClick={onMoveUp}
            disabled={index === 0}
          >
            <ChevronUp className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-11"
            aria-label="Move block down"
            onClick={onMoveDown}
            disabled={index === total - 1}
          >
            <ChevronDown className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-11"
            aria-label="Duplicate block"
            onClick={onDuplicate}
          >
            <Copy className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-11 text-muted-foreground hover:text-destructive"
            aria-label="Remove block"
            onClick={onRemove}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Block body: inline editor specific to the block type */}
      <div className="px-3 py-2.5" id={`block-${block.id}`}>
        <BlockInlineEditor
          block={block}
          onChange={onChange}
          onAddAfter={onAddAfter}
        />
        {["fill-in", "rating-table"].includes(block.type) &&
          earlierQuestions.length > 0 && (
            <details className="mt-3 border-t pt-2">
              <summary className="cursor-pointer text-xs text-muted-foreground">
                Conditional question
              </summary>
              <label className="mt-2 block text-xs">
                Show only when an earlier answer matches
                <select
                  className="mt-1 min-h-10 w-full rounded-md border bg-background px-2"
                  value={block.showIf?.blockId ?? ""}
                  onChange={(e) =>
                    onChange({
                      showIf: e.target.value
                        ? {
                            blockId: e.target.value,
                            equals: block.showIf?.equals ?? "Yes",
                          }
                        : null,
                    })
                  }
                >
                  <option value="">Always show</option>
                  {earlierQuestions.map((q) => (
                    <option key={q.id} value={q.id}>
                      {q.label}
                    </option>
                  ))}
                </select>
              </label>
              {block.showIf && (
                <label className="mt-2 block text-xs">
                  Matching answer
                  <Input
                    value={block.showIf.equals}
                    maxLength={1000}
                    onChange={(e) =>
                      onChange({
                        showIf: {
                          blockId: block.showIf!.blockId,
                          equals: e.target.value,
                        },
                      })
                    }
                  />
                </label>
              )}
              <p className="mt-1 text-xs text-muted-foreground">
                Matches ignore letter case and surrounding spaces. Hidden
                questions are not required or included in answered exports.
              </p>
            </details>
          )}
      </div>
    </div>
  );
}

function BlockInlineEditor({
  block,
  onChange,
  onAddAfter,
}: {
  block: FormBlock;
  onChange: (patch: Partial<FormBlock>) => void;
  onAddAfter: (type: FormBlockType) => void;
}) {
  switch (block.type) {
    case "heading":
      return (
        <div className="space-y-2">
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] uppercase tracking-wide text-muted-foreground">
              Level
            </span>
            <div className="flex items-center gap-0.5">
              {([1, 2, 3] as const).map((lvl) => (
                <Button
                  key={lvl}
                  variant={block.level === lvl ? "default" : "outline"}
                  size="sm"
                  className="h-6 gap-1 px-2 text-[11px]"
                  onClick={() => onChange({ level: lvl })}
                >
                  {lvl === 1 && <Heading1 className="h-3 w-3" />}
                  {lvl === 2 && <Heading2 className="h-3 w-3" />}
                  {lvl === 3 && <Heading3 className="h-3 w-3" />}H{lvl}
                </Button>
              ))}
            </div>
          </div>
          <Input
            value={block.text ?? ""}
            onChange={(e) => onChange({ text: e.target.value })}
            placeholder="Heading text"
            className={cn(
              "h-9 border-0 bg-transparent px-0 focus-visible:ring-0",
              block.level === 1
                ? "text-lg font-semibold"
                : block.level === 2
                  ? "text-[15px] font-semibold"
                  : "text-sm font-semibold",
            )}
          />
        </div>
      );

    case "paragraph":
      return (
        <Textarea
          value={block.text ?? ""}
          onChange={(e) => onChange({ text: e.target.value })}
          placeholder="Body paragraph..."
          rows={2}
          className="resize-y border-0 bg-transparent px-0 text-[13.5px] leading-relaxed focus-visible:ring-0"
        />
      );

    case "instruction":
      return (
        <Textarea
          value={block.text ?? ""}
          onChange={(e) => onChange({ text: e.target.value })}
          placeholder="Instruction text (shown in muted italics)..."
          rows={2}
          className="resize-y border-0 bg-muted/30 px-2 text-[12.5px] italic leading-relaxed focus-visible:ring-0"
        />
      );

    case "divider":
      return (
        <div className="flex items-center gap-2 py-1 text-[12px] text-muted-foreground">
          <div className="h-px flex-1 bg-border" />
          <span>Horizontal rule</span>
          <div className="h-px flex-1 bg-border" />
        </div>
      );

    case "info-field":
    case "fill-in":
      return (
        <div className="space-y-2">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <div className="space-y-1">
              <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">
                Label
              </Label>
              <Input
                value={block.label ?? ""}
                onChange={(e) => onChange({ label: e.target.value })}
                placeholder={
                  block.type === "info-field"
                    ? "e.g. Name, Date"
                    : "e.g. Question"
                }
                className="h-8 text-[13px]"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">
                Placeholder hint
              </Label>
              <Input
                value={block.placeholder ?? ""}
                onChange={(e) => onChange({ placeholder: e.target.value })}
                placeholder="(optional)"
                className="h-8 text-[13px]"
              />
            </div>
          </div>
          {block.type === "fill-in" && (
            <label className="flex items-center gap-2 text-[12px] text-muted-foreground">
              <input
                type="checkbox"
                checked={block.multiline ?? false}
                onChange={(e) => onChange({ multiline: e.target.checked })}
                className="h-3.5 w-3.5 rounded border-border"
              />
              Multi-line answer area
            </label>
          )}
          <div className="rounded-md border border-dashed border-border/60 p-2">
            <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
              Preview
            </div>
            <div className="mt-1">
              <FormBlockRenderer block={block} interactive={false} />
            </div>
          </div>
        </div>
      );

    case "rating-table":
      return <RatingTableEditor block={block} onChange={onChange} />;

    case "signature":
      return (
        <div className="space-y-2">
          <div className="space-y-1">
            <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">
              Caption
            </Label>
            <Input
              value={block.caption ?? ""}
              onChange={(e) => onChange({ caption: e.target.value })}
              placeholder="e.g. Signature over Printed Name"
              className="h-8 text-[13px]"
            />
          </div>
          <div className="rounded-md border border-dashed border-border/60 p-2">
            <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
              Preview
            </div>
            <div className="mt-1">
              <FormBlockRenderer block={block} interactive={false} />
            </div>
          </div>
        </div>
      );

    default:
      return null;
  }
}

function RatingTableEditor({
  block,
  onChange,
}: {
  block: FormBlock;
  onChange: (patch: Partial<FormBlock>) => void;
}) {
  const scaleLabels = block.scaleLabels ?? [];
  const criteria = block.criteria ?? [];

  function updateScale(idx: number, value: string) {
    const next = [...scaleLabels];
    next[idx] = value;
    onChange({ scaleLabels: next });
  }
  function addScale() {
    onChange({
      scaleLabels: [...scaleLabels, `Option ${scaleLabels.length + 1}`],
    });
  }
  function removeScale(idx: number) {
    onChange({ scaleLabels: scaleLabels.filter((_, i) => i !== idx) });
  }
  function updateCriterion(id: string, value: string) {
    onChange({
      criteria: criteria.map((c) => (c.id === id ? { ...c, label: value } : c)),
    });
  }
  function addCriterion() {
    const id = `c-${Date.now()}`;
    onChange({
      criteria: [
        ...criteria,
        { id, label: `New criterion ${criteria.length + 1}` },
      ],
    });
  }
  function removeCriterion(id: string) {
    onChange({ criteria: criteria.filter((c) => c.id !== id) });
  }

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm">
          Scoring method
          <select
            className="mt-1 w-full rounded border bg-background p-2"
            value={block.scoreMode ? "weighted" : "rating"}
            onChange={(e) =>
              onChange({ scoreMode: e.target.value === "weighted" })
            }
          >
            <option value="rating">Rating options</option>
            <option value="weighted">Numeric scores with maximums</option>
          </select>
        </label>
        <label className="text-sm">
          Score summary
          <select
            className="mt-1 w-full rounded border bg-background p-2"
            value={block.summaryMode ?? (block.scoreMode ? "total" : "none")}
            onChange={(e) =>
              onChange({
                summaryMode: e.target.value as FormBlock["summaryMode"],
              })
            }
          >
            <option value="none">No automatic summary</option>
            <option value="total">Total</option>
            <option value="average">Average</option>
          </select>
        </label>
      </div>
      <p className="text-xs text-muted-foreground">
        Heading rows group questions and never require scores. Summary values
        describe the configured scale; they are not automatic grades.
      </p>
      <div>
        <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">
          Scale columns ({scaleLabels.length})
        </Label>
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          {scaleLabels.map((s, idx) => (
            <div key={idx} className="flex items-center gap-0.5">
              <Input
                value={s}
                onChange={(e) => updateScale(idx, e.target.value)}
                className="h-7 w-[110px] text-[12px]"
              />
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-muted-foreground hover:text-destructive"
                onClick={() => removeScale(idx)}
                disabled={scaleLabels.length <= 1}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          ))}
          <Button
            variant="outline"
            size="sm"
            className="h-7 gap-1 text-[11px]"
            onClick={addScale}
          >
            <Plus className="h-3 w-3" /> Column
          </Button>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between">
          <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">
            Criteria rows ({criteria.length})
          </Label>
          <Button
            variant="outline"
            size="sm"
            className="h-7 gap-1 text-[11px]"
            onClick={addCriterion}
          >
            <Plus className="h-3 w-3" /> Row
          </Button>
        </div>
        <div className="mt-1.5 space-y-1">
          {criteria.map((c) => (
            <div
              key={c.id}
              className="flex min-w-0 flex-wrap items-center gap-1"
            >
              <select
                aria-label={`Row type for ${c.label}`}
                className="min-h-8 max-w-full rounded border bg-background px-1 text-xs"
                value={isRatingHeading(c) ? "heading" : "criterion"}
                onChange={(e) =>
                  onChange({
                    criteria: criteria.map((x) =>
                      x.id === c.id
                        ? {
                            ...x,
                            role: e.target.value as "heading" | "criterion",
                          }
                        : x,
                    ),
                  })
                }
              >
                <option value="criterion">Scored item</option>
                <option value="heading">Heading</option>
              </select>
              {block.scoreMode && !isRatingHeading(c) && (
                <Input
                  aria-label={`Maximum for ${c.label}`}
                  placeholder="Max"
                  value={c.max ?? ""}
                  className="w-16"
                  onChange={(e) =>
                    onChange({
                      criteria: criteria.map((x) =>
                        x.id === c.id ? { ...x, max: e.target.value } : x,
                      ),
                    })
                  }
                />
              )}
              <Input
                value={c.label}
                onChange={(e) => updateCriterion(c.id, e.target.value)}
                className="h-7 flex-1 text-[12.5px]"
              />
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-muted-foreground hover:text-destructive"
                onClick={() => removeCriterion(c.id)}
                disabled={criteria.length <= 1}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          ))}
          {criteria.length === 0 && (
            <p className="text-[12px] text-muted-foreground">
              No criteria yet — add at least one row.
            </p>
          )}
        </div>
      </div>

      <div className="rounded-md border border-dashed border-border/60 p-2">
        <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
          Preview
        </div>
        <div className="mt-1">
          <FormBlockRenderer block={block} interactive={false} />
        </div>
      </div>
    </div>
  );
}
