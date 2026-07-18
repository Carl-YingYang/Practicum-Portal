"use client";

import * as React from "react";
import { useAppStore } from "@/store/use-app-store";
import { PageHeader } from "@/components/portal/layout/page-header";
import { SectionCard } from "@/components/portal/shared/section-card";
import { EmptyState } from "@/components/portal/shared/empty-state";
import { FormStatusBadge } from "@/components/portal/shared/badges";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  Plus,
  Search,
  MoreHorizontal,
  Pencil,
  Copy,
  Trash2,
  Send,
  Archive,
  RotateCcw,
  FileText,
  Calendar,
  Layers,
  HelpCircle,
  ArrowRight,
} from "lucide-react";
import {
  type FormCategory,
  type FormDocument,
  FORM_CATEGORY_LABELS,
} from "@/lib/types";
import { formatDistanceToNow } from "date-fns";

const categoryOptions: { value: FormCategory | "all"; label: string }[] = [
  { value: "all", label: "All types" },
  { value: "evaluation", label: FORM_CATEGORY_LABELS.evaluation },
  { value: "journal", label: FORM_CATEGORY_LABELS.journal },
  { value: "ojt", label: FORM_CATEGORY_LABELS.ojt },
  { value: "program", label: FORM_CATEGORY_LABELS.program },
  { value: "other", label: FORM_CATEGORY_LABELS.other },
];

export function FormsList() {
  const { toast } = useToast();
  const navigate = useAppStore((s) => s.navigate);
  const forms = useAppStore((s) => s.formDocuments);
  const deleteFormDocument = useAppStore((s) => s.deleteFormDocument);
  const duplicateFormDocument = useAppStore((s) => s.duplicateFormDocument);
  const publishFormDocument = useAppStore((s) => s.publishFormDocument);
  const unpublishFormDocument = useAppStore((s) => s.unpublishFormDocument);
  const archiveFormDocument = useAppStore((s) => s.archiveFormDocument);
  const createFormDocument = useAppStore((s) => s.createFormDocument);

  const [search, setSearch] = React.useState("");
  const [categoryFilter, setCategoryFilter] = React.useState<FormCategory | "all">("all");
  const [statusFilter, setStatusFilter] = React.useState<"all" | "draft" | "published" | "archived">("all");
  const [newOpen, setNewOpen] = React.useState(false);
  const [newTitle, setNewTitle] = React.useState("");
  const [newDesc, setNewDesc] = React.useState("");
  const [newCat, setNewCat] = React.useState<FormCategory>("evaluation");

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    return forms
      .filter((f) => (categoryFilter === "all" ? true : f.category === categoryFilter))
      .filter((f) => (statusFilter === "all" ? true : f.status === statusFilter))
      .filter((f) =>
        q ? f.title.toLowerCase().includes(q) || f.description.toLowerCase().includes(q) : true
      )
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }, [forms, search, categoryFilter, statusFilter]);

  const stats = React.useMemo(() => {
    return {
      total: forms.length,
      published: forms.filter((f) => f.status === "published").length,
      drafts: forms.filter((f) => f.status === "draft").length,
      archived: forms.filter((f) => f.status === "archived").length,
    };
  }, [forms]);

  function handleCreate() {
    const title = newTitle.trim();
    if (!title) {
      toast({ title: "Title required", description: "Give your form a title to start.", variant: "destructive" });
      return;
    }
    const id = createFormDocument({ title, description: newDesc.trim(), category: newCat });
    setNewOpen(false);
    setNewTitle("");
    setNewDesc("");
    setNewCat("evaluation");
    toast({ title: "Form created", description: "Now add your questions in the editor." });
    navigate("coordinator.form-editor", { formId: id });
  }

  function handleAction(form: FormDocument, action: "edit" | "duplicate" | "publish" | "unpublish" | "archive" | "delete") {
    switch (action) {
      case "edit":
        navigate("coordinator.form-editor", { formId: form.id });
        break;
      case "duplicate": {
        const newId = duplicateFormDocument(form.id);
        toast({ title: "Form duplicated", description: "A draft copy has been created." });
        if (newId) navigate("coordinator.form-editor", { formId: newId });
        break;
      }
      case "publish":
        publishFormDocument(form.id);
        toast({ title: "Form published", description: "Supervisors can now view and fill this form." });
        break;
      case "unpublish":
        unpublishFormDocument(form.id);
        toast({ title: "Reverted to draft", description: "Supervisors will no longer see this form." });
        break;
      case "archive":
        archiveFormDocument(form.id);
        toast({ title: "Form archived" });
        break;
      case "delete":
        deleteFormDocument(form.id);
        toast({ title: "Form deleted" });
        break;
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Forms"
        breadcrumb="Forms"
        description="Create forms for supervisors to fill out. Publish when ready."
        actions={
          <Button onClick={() => setNewOpen(true)} className="gap-1.5">
            <Plus className="h-4 w-4" />
            New form
          </Button>
        }
      />

      {/* How it works — guided helper for first-time users */}
      <div className="flex items-start gap-3 rounded-xl border border-teal-200/70 bg-teal-50/50 p-3.5 dark:border-teal-900/50 dark:bg-teal-950/20">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300">
          <HelpCircle className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold text-foreground">How forms work</p>
          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[12px] text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-teal-600 text-[9px] font-bold text-white">1</span>
              You create a form here
            </span>
            <ArrowRight className="h-3 w-3 text-muted-foreground/50" />
            <span className="inline-flex items-center gap-1">
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-teal-600 text-[9px] font-bold text-white">2</span>
              Add questions and publish
            </span>
            <ArrowRight className="h-3 w-3 text-muted-foreground/50" />
            <span className="inline-flex items-center gap-1">
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-teal-600 text-[9px] font-bold text-white">3</span>
              Supervisors fill it out
            </span>
          </div>
        </div>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        <KpiTile label="Total" value={stats.total} icon={Layers} />
        <KpiTile label="Published" value={stats.published} icon={Send} tone="emerald" />
        <KpiTile label="Drafts" value={stats.drafts} icon={Pencil} tone="slate" />
        <KpiTile label="Archived" value={stats.archived} icon={Archive} tone="amber" />
      </div>

      {/* Filters */}
      <SectionCard>
        <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search forms..."
              className="h-9 pl-8"
            />
          </div>
          <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center sm:gap-2">
            <Select value={categoryFilter} onValueChange={(v) => setCategoryFilter(v as FormCategory | "all")}>
              <SelectTrigger className="h-9 w-full sm:w-[170px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {categoryOptions.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}>
              <SelectTrigger className="h-9 w-full sm:w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="published">Published</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </SectionCard>

      {/* List */}
      {filtered.length === 0 ? (
        <SectionCard>
          <EmptyState
            icon={FileText}
            title="No forms yet"
            description="Create your first form — supervisors will see it here once you publish."
            actionLabel="Create form"
            onAction={() => setNewOpen(true)}
          />
        </SectionCard>
      ) : (
        <div className="grid min-w-0 gap-2.5 lg:grid-cols-2">
          {filtered.map((form) => (
            <FormCard
              key={form.id}
              form={form}
              onAction={(a) => handleAction(form, a)}
            />
          ))}
        </div>
      )}

      {/* New form dialog */}
      <Dialog open={newOpen} onOpenChange={setNewOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Create a new form</DialogTitle>
            <DialogDescription>
              Start with a title and type. You can add questions in the next step.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-1">
            <div className="space-y-1.5">
              <Label htmlFor="form-title">Title</Label>
              <Input
                id="form-title"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="e.g. Mid-term Performance Evaluation"
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="form-desc">Description <span className="text-muted-foreground/60">(optional)</span></Label>
              <Textarea
                id="form-desc"
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                placeholder="What is this form for? When should supervisors use it?"
                rows={3}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="form-cat">Type</Label>
              <Select value={newCat} onValueChange={(v) => setNewCat(v as FormCategory)}>
                <SelectTrigger id="form-cat" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categoryOptions.filter((o) => o.value !== "all").map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="ghost">Cancel</Button>
            </DialogClose>
            <Button onClick={handleCreate}>Create &amp; add questions</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function KpiTile({
  label,
  value,
  icon: Icon,
  tone = "slate",
}: {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  tone?: "slate" | "emerald" | "amber";
}) {
  const toneCls =
    tone === "emerald"
      ? "text-emerald-600 bg-emerald-50 ring-emerald-200/70 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-900/50"
      : tone === "amber"
        ? "text-amber-600 bg-amber-50 ring-amber-200/70 dark:bg-amber-950/40 dark:text-amber-300 dark:ring-amber-900/50"
        : "text-slate-600 bg-slate-100/70 ring-slate-200/70 dark:bg-slate-800/60 dark:text-slate-300 dark:ring-slate-700/60";
  return (
    <div className="flex items-center gap-2.5 rounded-lg border border-border/60 bg-card px-3.5 py-2.5">
      <span className={cn("flex h-8 w-8 items-center justify-center rounded-md ring-1 ring-inset", toneCls)}>
        <Icon className="h-4 w-4" />
      </span>
      <div>
        <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
        <div className="text-lg font-semibold tabular-nums leading-tight">{value}</div>
      </div>
    </div>
  );
}

function FormCard({
  form,
  onAction,
}: {
  form: FormDocument;
  onAction: (a: "edit" | "duplicate" | "publish" | "unpublish" | "archive" | "delete") => void;
}) {
  const updated = formatDistanceToNow(new Date(form.updatedAt), { addSuffix: true });
  const sectionCount = form.blocks.length;
  const ratingTables = form.blocks.filter((b) => b.type === "rating-table").length;
  const isPublished = form.status === "published";

  return (
    <div className="group relative flex min-w-0 flex-col gap-2.5 overflow-hidden rounded-lg border border-border/60 bg-card p-4 transition-shadow hover:shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <FormStatusBadge status={form.status} />
            <span className="rounded-full bg-muted/60 px-2 py-0.5 text-[11px] font-medium text-muted-foreground ring-1 ring-inset ring-border/60">
              {FORM_CATEGORY_LABELS[form.category]}
            </span>
            {form.version > 0 && (
              <span className="text-[11px] text-muted-foreground">v{form.version}</span>
            )}
          </div>
          <h3 className="mt-1.5 line-clamp-2 text-[14.5px] font-semibold text-foreground">
            {form.title}
          </h3>
          {form.description && (
            <p className="mt-0.5 line-clamp-2 text-[12px] text-muted-foreground">
              {form.description}
            </p>
          )}
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuItem onClick={() => onAction("edit")}>
              <Pencil className="mr-2 h-3.5 w-3.5" /> Edit
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onAction("duplicate")}>
              <Copy className="mr-2 h-3.5 w-3.5" /> Duplicate
            </DropdownMenuItem>
            {isPublished ? (
              <DropdownMenuItem onClick={() => onAction("unpublish")}>
                <RotateCcw className="mr-2 h-3.5 w-3.5" /> Unpublish
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem onClick={() => onAction("publish")}>
                <Send className="mr-2 h-3.5 w-3.5" /> Publish
              </DropdownMenuItem>
            )}
            {form.status !== "archived" && (
              <DropdownMenuItem onClick={() => onAction("archive")}>
                <Archive className="mr-2 h-3.5 w-3.5" /> Archive
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => onAction("delete")}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="mr-2 h-3.5 w-3.5" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="flex flex-wrap items-center gap-3 text-[11.5px] text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <Layers className="h-3 w-3" />
          {sectionCount} {sectionCount === 1 ? "section" : "sections"}
        </span>
        {ratingTables > 0 && (
          <span className="inline-flex items-center gap-1">
            <FileText className="h-3 w-3" />
            {ratingTables} rating {ratingTables === 1 ? "table" : "tables"}
          </span>
        )}
        <span className="ml-auto inline-flex items-center gap-1">
          <Calendar className="h-3 w-3" />
          {updated}
        </span>
      </div>

      {/* Primary actions — one clear CTA per status */}
      <div className="flex flex-wrap items-center gap-2 pt-0.5">
        <Button size="sm" variant="default" className="h-8 gap-1.5" onClick={() => onAction("edit")}>
          <Pencil className="h-3.5 w-3.5" />
          {isPublished ? "View / edit" : "Edit form"}
        </Button>
        {!isPublished && form.status !== "archived" && (
          <Button size="sm" variant="outline" className="h-8 gap-1.5" onClick={() => onAction("publish")}>
            <Send className="h-3.5 w-3.5" /> Publish
          </Button>
        )}
      </div>
    </div>
  );
}
