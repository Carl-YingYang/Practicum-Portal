"use client";

import * as React from "react";
import { useAppStore } from "@/store/use-app-store";
import { PageHeader } from "@/components/portal/layout/page-header";
import { SectionCard } from "@/components/portal/shared/section-card";
import { EmptyState } from "@/components/portal/shared/empty-state";
import {
  FormStatusBadge,
  SubmissionStatusBadge,
} from "@/components/portal/shared/badges";
import { Avatar } from "@/components/portal/shared/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { CreateFormWizard } from "@/components/portal/shared/create-form-wizard";
import { AssignFormModal } from "@/components/portal/shared/assign-form-modal";
import { FormPreviewModal } from "@/components/portal/shared/form-preview-modal";
import { SubmissionReviewSlideOver } from "@/components/portal/shared/submission-review-slide-over";
import { PersonDetailsSlideOver } from "@/components/portal/shared/person-details-slide-over";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  Plus,
  Search,
  MoreHorizontal,
  Pencil,
  Copy,
  Trash2,
  Eye,
  Send,
  Archive,
  RotateCcw,
  FileText,
  Calendar,
  Layers,
  Inbox,
  UserCheck,
  ClipboardCheck,
  CheckCircle2,
  Users,
  GraduationCap,
  ChevronRight,
  Clock,
} from "lucide-react";
import {
  type FormCategory,
  type FormDocument,
  type FormSubmission,
  type FormSubmissionStatus,
  FORM_CATEGORY_LABELS,
} from "@/lib/types";
import { portalUsers } from "@/lib/mock-data";
import {
  submissionsForForm,
  pendingSubmissionsForCoordinator,
  formResponseStats,
  assignmentsForForm,
} from "@/lib/selectors";
import { format, formatDistanceToNow, differenceInDays } from "date-fns";

const categoryOptions: { value: FormCategory | "all"; label: string }[] = [
  { value: "all", label: "All categories" },
  { value: "evaluation", label: FORM_CATEGORY_LABELS.evaluation },
  { value: "journal", label: FORM_CATEGORY_LABELS.journal },
  { value: "ojt", label: FORM_CATEGORY_LABELS.ojt },
  { value: "program", label: FORM_CATEGORY_LABELS.program },
  { value: "other", label: FORM_CATEGORY_LABELS.other },
];

const submissionStatusFilters: { value: FormSubmissionStatus | "all" | "pending_review"; label: string }[] = [
  { value: "all", label: "All statuses" },
  { value: "pending_review", label: "Pending review" },
  { value: "submitted", label: "Submitted" },
  { value: "under_review", label: "Under review" },
  { value: "approved", label: "Approved" },
  { value: "needs_revision", label: "Needs revision" },
  { value: "in_progress", label: "In progress" },
];

type HubTab = "forms" | "submissions" | "assignments";

export function FormsHub() {
  const { toast } = useToast();
  const navigate = useAppStore((s) => s.navigate);
  const viewParams = useAppStore((s) => s.viewParams);
  const forms = useAppStore((s) => s.formDocuments);
  const assignments = useAppStore((s) => s.formAssignments);
  const submissions = useAppStore((s) => s.formSubmissions);
  const supervisors = useAppStore((s) => s.supervisors);
  const students = useAppStore((s) => s.students);
  const deleteFormDocument = useAppStore((s) => s.deleteFormDocument);
  const duplicateFormDocument = useAppStore((s) => s.duplicateFormDocument);
  const publishFormDocument = useAppStore((s) => s.publishFormDocument);
  const unpublishFormDocument = useAppStore((s) => s.unpublishFormDocument);
  const archiveFormDocument = useAppStore((s) => s.archiveFormDocument);

  // tab state — synced from viewParams.tab when the dashboard deep-links in.
  // Local tab clicks update `tab` directly WITHOUT touching viewParams, so
  // this effect must only depend on viewParams.tab (not `tab`), otherwise
  // it would revert a local click back to the viewParams value.
  const initialTab = (viewParams.tab as HubTab) ?? "forms";
  const [tab, setTab] = React.useState<HubTab>(initialTab);
  React.useEffect(() => {
    setTab((viewParams.tab as HubTab) ?? "forms");
  }, [viewParams.tab]);

  // modal state
  const [wizardOpen, setWizardOpen] = React.useState(false);
  const [assignTarget, setAssignTarget] = React.useState<FormDocument | null>(null);
  const [previewForm, setPreviewForm] = React.useState<FormDocument | null>(null);
  const [reviewSubmissionId, setReviewSubmissionId] = React.useState<string | undefined>();
  const [personSlideOver, setPersonSlideOver] = React.useState<{ studentId?: string; supervisorId?: string } | null>(null);

  // filters for the Forms tab
  const [search, setSearch] = React.useState("");
  const [categoryFilter, setCategoryFilter] = React.useState<FormCategory | "all">("all");
  const [statusFilter, setStatusFilter] = React.useState<"all" | "draft" | "published" | "archived">("all");

  // filters for the Submissions tab
  const [subSearch, setSubSearch] = React.useState("");
  const [subFormFilter, setSubFormFilter] = React.useState<string>("all");
  const [subStatusFilter, setSubStatusFilter] = React.useState<FormSubmissionStatus | "all" | "pending_review">("pending_review");

  // KPI stats
  const stats = React.useMemo(() => {
    const published = forms.filter((f) => f.status === "published").length;
    const pending = pendingSubmissionsForCoordinator(submissions).length;
    const approved = submissions.filter((s) => s.status === "approved").length;
    const responseRate = (() => {
      const publishedForms = forms.filter((f) => f.status === "published");
      if (publishedForms.length === 0) return 0;
      let totalAssigned = 0;
      let totalSubmitted = 0;
      for (const f of publishedForms) {
        const st = formResponseStats(f, assignments, submissions, supervisors, students);
        totalAssigned += st.assigned;
        totalSubmitted += st.submitted;
      }
      return totalAssigned === 0 ? 0 : Math.round((totalSubmitted / totalAssigned) * 100);
    })();
    return { published, pending, approved, responseRate };
  }, [forms, submissions, assignments, supervisors, students]);

  function handleFormAction(form: FormDocument, action: "edit" | "duplicate" | "publish" | "unpublish" | "archive" | "delete" | "assign" | "preview" | "responses") {
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
        toast({ title: "Form published", description: "Ready to assign to supervisors or students." });
        break;
      case "unpublish":
        unpublishFormDocument(form.id);
        toast({ title: "Reverted to draft" });
        break;
      case "archive":
        archiveFormDocument(form.id);
        toast({ title: "Form archived" });
        break;
      case "delete":
        deleteFormDocument(form.id);
        toast({ title: "Form deleted" });
        break;
      case "assign":
        setAssignTarget(form);
        break;
      case "preview":
        setPreviewForm(form);
        break;
      case "responses":
        setSubFormFilter(form.id);
        setSubStatusFilter("all");
        setTab("submissions");
        break;
    }
  }

  // filtered forms for Forms tab
  const filteredForms = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    return forms
      .filter((f) => (categoryFilter === "all" ? true : f.category === categoryFilter))
      .filter((f) => (statusFilter === "all" ? true : f.status === statusFilter))
      .filter((f) => (q ? f.title.toLowerCase().includes(q) || f.description.toLowerCase().includes(q) : true))
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }, [forms, search, categoryFilter, statusFilter]);

  // filtered submissions for Submissions tab
  const filteredSubs = React.useMemo(() => {
    const q = subSearch.trim().toLowerCase();
    return submissions
      .filter((s) => (subFormFilter === "all" ? true : s.formId === subFormFilter))
      .filter((s) => {
        if (subStatusFilter === "all") return true;
        if (subStatusFilter === "pending_review") return s.status === "submitted" || s.status === "under_review";
        return s.status === subStatusFilter;
      })
      .filter((s) => {
        if (!q) return true;
        const form = forms.find((f) => f.id === s.formId);
        const submitter = portalUsers.find((u) => u.id === s.userId);
        const target = s.targetStudentId ? students.find((st) => st.id === s.targetStudentId) : undefined;
        const hay = `${form?.title ?? ""} ${submitter?.name ?? ""} ${target?.name ?? ""}`.toLowerCase();
        return hay.includes(q);
      })
      .sort((a, b) => {
        // pending_review first, then by submittedAt desc
        const rank = (st: FormSubmissionStatus) =>
          st === "submitted" ? 0 : st === "under_review" ? 1 : st === "needs_revision" ? 2 : st === "in_progress" ? 3 : st === "approved" ? 4 : 5;
        const r = rank(a.status) - rank(b.status);
        if (r !== 0) return r;
        return (a.submittedAt ?? a.updatedAt) < (b.submittedAt ?? b.updatedAt) ? 1 : -1;
      });
  }, [submissions, subFormFilter, subStatusFilter, subSearch, forms, students]);

  const pendingCount = stats.pending;

  return (
    <div className="space-y-4">
      <PageHeader
        title="Forms & Reviews"
        breadcrumb="Forms"
        description="Publish evaluation forms, track responses, and review submissions in one place."
        actions={
          <Button onClick={() => setWizardOpen(true)} className="gap-1.5">
            <Plus className="h-4 w-4" />
            New form
          </Button>
        }
      />

      {/* KPI strip */}
      <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
        <KpiTile label="Published forms" value={stats.published} icon={Send} tone="emerald" />
        <KpiTile
          label="Pending reviews"
          value={pendingCount}
          icon={Inbox}
          tone="amber"
          clickable={pendingCount > 0}
          onClick={() => setTab("submissions")}
        />
        <KpiTile label="Approved" value={stats.approved} icon={CheckCircle2} tone="teal" />
        <KpiTile label="Response rate" value={`${stats.responseRate}%`} icon={ClipboardCheck} tone="slate" />
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as HubTab)}>
        <TabsList className="h-9">
          <TabsTrigger value="forms" className="gap-1.5 text-[12.5px]">
            <FileText className="h-3.5 w-3.5" /> Forms
          </TabsTrigger>
          <TabsTrigger value="submissions" className="gap-1.5 text-[12.5px]">
            <Inbox className="h-3.5 w-3.5" /> Submissions
            {pendingCount > 0 && (
              <span className="ml-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] font-bold text-white">
                {pendingCount}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="assignments" className="gap-1.5 text-[12.5px]">
            <UserCheck className="h-3.5 w-3.5" /> Assignments
          </TabsTrigger>
        </TabsList>

        {/* ============================ FORMS TAB ============================ */}
        <TabsContent value="forms" className="mt-3 space-y-3">
          <SectionCard>
            <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search forms by title or description..."
                  className="h-9 pl-8"
                />
              </div>
              <div className="flex items-center gap-2">
                <Select value={categoryFilter} onValueChange={(v) => setCategoryFilter(v as FormCategory | "all")}>
                  <SelectTrigger className="h-9 w-[170px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categoryOptions.map((o) => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}>
                  <SelectTrigger className="h-9 w-[140px]">
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

          {filteredForms.length === 0 ? (
            <SectionCard>
              <EmptyState
                icon={FileText}
                title="No forms found"
                description="Try adjusting your filters, or create a new form to get started."
                actionLabel="New form"
                onAction={() => setWizardOpen(true)}
              />
            </SectionCard>
          ) : (
            <div className="grid gap-2.5 lg:grid-cols-2">
              {filteredForms.map((form) => (
                <FormCard
                  key={form.id}
                  form={form}
                  assignments={assignments}
                  submissions={submissions}
                  supervisors={supervisors}
                  students={students}
                  onAction={(a) => handleFormAction(form, a)}
                />
              ))}
            </div>
          )}
        </TabsContent>

        {/* ============================ SUBMISSIONS TAB ============================ */}
        <TabsContent value="submissions" className="mt-3 space-y-3">
          <SectionCard>
            <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={subSearch}
                  onChange={(e) => setSubSearch(e.target.value)}
                  placeholder="Search by form, submitter, or student..."
                  className="h-9 pl-8"
                />
              </div>
              <div className="flex items-center gap-2">
                <Select value={subFormFilter} onValueChange={setSubFormFilter}>
                  <SelectTrigger className="h-9 w-[200px]">
                    <SelectValue placeholder="All forms" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All forms</SelectItem>
                    {forms.filter((f) => f.status === "published").map((f) => (
                      <SelectItem key={f.id} value={f.id}>{f.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={subStatusFilter} onValueChange={(v) => setSubStatusFilter(v as typeof subStatusFilter)}>
                  <SelectTrigger className="h-9 w-[150px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {submissionStatusFilters.map((o) => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </SectionCard>

          {filteredSubs.length === 0 ? (
            <SectionCard>
              <EmptyState
                icon={Inbox}
                title="No submissions match"
                description="Try a different filter, or wait for assigned users to submit their responses."
                tone="slate"
              />
            </SectionCard>
          ) : (
            <SectionCard noPadding contentClassName="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-[12.5px]">
                  <thead>
                    <tr className="border-b border-border/60 bg-muted/30 text-[10.5px] uppercase tracking-wide text-muted-foreground">
                      <th className="px-3.5 py-2 text-left font-medium">Form</th>
                      <th className="px-3.5 py-2 text-left font-medium">Submitter</th>
                      <th className="hidden px-3.5 py-2 text-left font-medium md:table-cell">Target student</th>
                      <th className="px-3.5 py-2 text-left font-medium">Status</th>
                      <th className="hidden px-3.5 py-2 text-left font-medium sm:table-cell">Submitted</th>
                      <th className="px-3.5 py-2 text-right font-medium"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSubs.map((sub) => {
                      const form = forms.find((f) => f.id === sub.formId);
                      const submitter = portalUsers.find((u) => u.id === sub.userId);
                      const target = sub.targetStudentId ? students.find((st) => st.id === sub.targetStudentId) : undefined;
                      const isPending = sub.status === "submitted" || sub.status === "under_review";
                      return (
                        <tr
                          key={sub.id}
                          onClick={() => setReviewSubmissionId(sub.id)}
                          className={cn(
                            "cursor-pointer border-b border-border/40 transition-colors hover:bg-muted/30",
                            isPending && "bg-amber-50/40 dark:bg-amber-950/10"
                          )}
                        >
                          <td className="px-3.5 py-2.5">
                            <div className="flex items-center gap-1.5">
                              <FileText className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                              <div className="min-w-0">
                                <div className="truncate font-medium text-foreground">{form?.title ?? "—"}</div>
                                <div className="text-[10.5px] text-muted-foreground">
                                  {form ? FORM_CATEGORY_LABELS[form.category] : ""}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-3.5 py-2.5">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (submitter?.role === "supervisor" && submitter.supervisorId) {
                                  setPersonSlideOver({ supervisorId: submitter.supervisorId });
                                } else if (submitter?.role === "student" && submitter.studentId) {
                                  setPersonSlideOver({ studentId: submitter.studentId });
                                }
                              }}
                              className="flex items-center gap-1.5 text-left hover:underline"
                            >
                              <Avatar name={submitter?.name ?? "?"} size="sm" color={submitter?.avatarColor ?? "#64748b"} />
                              <div className="min-w-0">
                                <div className="truncate font-medium text-foreground">{submitter?.name ?? "—"}</div>
                                <div className="text-[10.5px] capitalize text-muted-foreground">{submitter?.role}</div>
                              </div>
                            </button>
                          </td>
                          <td className="hidden px-3.5 py-2.5 md:table-cell">
                            {target ? (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setPersonSlideOver({ studentId: target.id });
                                }}
                                className="text-left hover:underline"
                              >
                                <div className="truncate font-medium text-foreground">{target.name}</div>
                                <div className="text-[10.5px] text-muted-foreground">{target.studentNumber}</div>
                              </button>
                            ) : (
                              <span className="text-muted-foreground/60">—</span>
                            )}
                          </td>
                          <td className="px-3.5 py-2.5">
                            <SubmissionStatusBadge status={sub.status} withIcon />
                          </td>
                          <td className="hidden px-3.5 py-2.5 sm:table-cell text-muted-foreground">
                            {sub.submittedAt ? formatDistanceToNow(new Date(sub.submittedAt), { addSuffix: true }) : "—"}
                          </td>
                          <td className="px-3.5 py-2.5 text-right">
                            <ChevronRight className="ml-auto h-4 w-4 text-muted-foreground" />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </SectionCard>
          )}
        </TabsContent>

        {/* ============================ ASSIGNMENTS TAB ============================ */}
        <TabsContent value="assignments" className="mt-3 space-y-3">
          {assignments.length === 0 ? (
            <SectionCard>
              <EmptyState
                icon={UserCheck}
                title="No assignments yet"
                description="Publish a form, then assign it to supervisors or students from the Forms tab."
                tone="slate"
              />
            </SectionCard>
          ) : (
            <div className="grid gap-2.5 lg:grid-cols-2">
              {assignments.map((a) => {
                const form = forms.find((f) => f.id === a.formId);
                if (!form) return null;
                const stats = formResponseStats(form, assignments, submissions, supervisors, students);
                const targetLabel =
                  a.target === "all_supervisors" ? "All supervisors" :
                  a.target === "all_students" ? "All students" :
                  `Specific users (${a.userIds?.length ?? 0})`;
                const TargetIcon = a.target === "all_supervisors" ? Users : a.target === "all_students" ? GraduationCap : UserCheck;
                const dueInDays = a.dueDate ? differenceInDays(new Date(a.dueDate), new Date()) : null;
                const overdue = dueInDays !== null && dueInDays < 0;
                return (
                  <div key={a.id} className="flex flex-col gap-2 rounded-lg border border-border/60 bg-card p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <FormStatusBadge status={form.status} />
                          <span className="rounded-full bg-muted/60 px-2 py-0.5 text-[11px] font-medium text-muted-foreground ring-1 ring-inset ring-border/60">
                            {FORM_CATEGORY_LABELS[form.category]}
                          </span>
                        </div>
                        <h3 className="mt-1.5 truncate text-[14px] font-semibold text-foreground">{form.title}</h3>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 shrink-0 gap-1 text-[11px] text-muted-foreground"
                        onClick={() => { setSubFormFilter(form.id); setSubStatusFilter("all"); setTab("submissions"); }}
                      >
                        View responses <ChevronRight className="h-3 w-3" />
                      </Button>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-[11.5px] text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <TargetIcon className="h-3 w-3" /> {targetLabel}
                      </span>
                      {a.dueDate && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className={cn(
                                "inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10.5px] font-medium ring-1 ring-inset",
                                overdue
                                  ? "bg-red-50 text-red-700 ring-red-200/70 dark:bg-red-950/40 dark:text-red-300 dark:ring-red-900/50"
                                  : dueInDays !== null && dueInDays <= 7
                                    ? "bg-amber-50 text-amber-800 ring-amber-200/70 dark:bg-amber-950/40 dark:text-amber-300 dark:ring-amber-900/50"
                                    : "bg-muted/60 text-muted-foreground ring-border/60"
                              )}>
                                <Calendar className="h-3 w-3" />
                                {overdue ? `Overdue ${Math.abs(dueInDays!)}d` : `Due ${format(new Date(a.dueDate), "MMM d")}`}
                              </span>
                            </TooltipTrigger>
                            <TooltipContent>Due {format(new Date(a.dueDate), "MMM d, yyyy")}</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                    </div>

                    {/* Response progress bar */}
                    <div className="rounded-md bg-muted/30 px-2.5 py-2">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-medium text-foreground">
                          {stats.submitted} / {stats.assigned} submitted
                        </span>
                        <span className="text-muted-foreground">
                          {stats.approved} approved · {stats.needsRevision} needs revision
                        </span>
                      </div>
                      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-primary transition-all"
                          style={{ width: `${stats.assigned === 0 ? 0 : Math.min(100, (stats.submitted / stats.assigned) * 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Modals & slide-overs */}
      <CreateFormWizard open={wizardOpen} onOpenChange={setWizardOpen} />
      <AssignFormModal open={!!assignTarget} onOpenChange={(v) => !v && setAssignTarget(null)} form={assignTarget} />
      <FormPreviewModal open={!!previewForm} onOpenChange={(v) => !v && setPreviewForm(null)} form={previewForm} mode="template" />
      <SubmissionReviewSlideOver
        open={!!reviewSubmissionId}
        onOpenChange={(v) => !v && setReviewSubmissionId(undefined)}
        submissionId={reviewSubmissionId}
      />
      <PersonDetailsSlideOver
        open={!!personSlideOver}
        onOpenChange={(v) => !v && setPersonSlideOver(null)}
        studentId={personSlideOver?.studentId}
        supervisorId={personSlideOver?.supervisorId}
      />
    </div>
  );
}

// ---------- local helpers ----------

function KpiTile({
  label,
  value,
  icon: Icon,
  tone = "slate",
  clickable,
  onClick,
}: {
  label: string;
  value: React.ReactNode;
  icon: React.ComponentType<{ className?: string }>;
  tone?: "slate" | "emerald" | "amber" | "teal";
  clickable?: boolean;
  onClick?: () => void;
}) {
  const toneCls =
    tone === "emerald"
      ? "text-emerald-600 bg-emerald-50 ring-emerald-200/70 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-900/50"
      : tone === "amber"
        ? "text-amber-600 bg-amber-50 ring-amber-200/70 dark:bg-amber-950/40 dark:text-amber-300 dark:ring-amber-900/50"
        : tone === "teal"
          ? "text-teal-600 bg-teal-50 ring-teal-200/70 dark:bg-teal-950/40 dark:text-teal-300 dark:ring-teal-900/50"
          : "text-slate-600 bg-slate-100/70 ring-slate-200/70 dark:bg-slate-800/60 dark:text-slate-300 dark:ring-slate-700/60";
  return (
    <button
      type="button"
      disabled={!clickable}
      onClick={clickable ? onClick : undefined}
      className={cn(
        "flex items-center gap-2.5 rounded-lg border border-border/60 bg-card px-3.5 py-2.5 text-left",
        clickable && "transition-colors hover:bg-muted/40"
      )}
    >
      <span className={cn("flex h-8 w-8 items-center justify-center rounded-md ring-1 ring-inset", toneCls)}>
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0">
        <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
        <div className="text-lg font-semibold tabular-nums leading-tight">{value}</div>
      </div>
    </button>
  );
}

function FormCard({
  form,
  assignments,
  submissions,
  supervisors,
  students,
  onAction,
}: {
  form: FormDocument;
  assignments: ReturnType<typeof useAppStore.getState>["formAssignments"];
  submissions: FormSubmission[];
  supervisors: ReturnType<typeof useAppStore.getState>["supervisors"];
  students: ReturnType<typeof useAppStore.getState>["students"];
  onAction: (a: "edit" | "duplicate" | "publish" | "unpublish" | "archive" | "delete" | "assign" | "preview" | "responses") => void;
}) {
  const updated = formatDistanceToNow(new Date(form.updatedAt), { addSuffix: true });
  const blockCount = form.blocks.length;
  const ratingTables = form.blocks.filter((b) => b.type === "rating-table").length;
  const stats = formResponseStats(form, assignments, submissions, supervisors, students);
  const formAssignments = assignmentsForForm(assignments, form.id);

  return (
    <div className="group relative flex flex-col gap-2 rounded-lg border border-border/60 bg-card p-4 transition-shadow hover:shadow-sm">
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
          <h3 className="mt-1.5 truncate text-[14.5px] font-semibold text-foreground">
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
            <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0 opacity-60 group-hover:opacity-100">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={() => onAction("edit")}>
              <Pencil className="mr-2 h-3.5 w-3.5" /> Edit
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onAction("preview")}>
              <Eye className="mr-2 h-3.5 w-3.5" /> Preview
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onAction("duplicate")}>
              <Copy className="mr-2 h-3.5 w-3.5" /> Duplicate
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onAction("assign")} disabled={form.status !== "published"}>
              <UserCheck className="mr-2 h-3.5 w-3.5" /> Assign to...
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onAction("responses")} disabled={stats.submitted === 0}>
              <Inbox className="mr-2 h-3.5 w-3.5" /> View responses
              {stats.submitted > 0 && (
                <span className="ml-auto rounded-full bg-primary/10 px-1.5 text-[10px] font-semibold text-primary">
                  {stats.submitted}
                </span>
              )}
            </DropdownMenuItem>
            {form.status === "published" ? (
              <DropdownMenuItem onClick={() => onAction("unpublish")}>
                <RotateCcw className="mr-2 h-3.5 w-3.5" /> Revert to draft
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

      {/* Response stats (only for published forms with assignments) */}
      {form.status === "published" && formAssignments.length > 0 && (
        <div className="rounded-md bg-muted/30 px-2.5 py-1.5">
          <div className="flex items-center justify-between text-[11px]">
            <span className="font-medium text-foreground">
              {stats.submitted} / {stats.assigned} responses
            </span>
            <span className="text-muted-foreground">
              {stats.approved} approved
              {stats.needsRevision > 0 && <> · {stats.needsRevision} needs revision</>}
            </span>
          </div>
          <div className="mt-1 h-1 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${stats.assigned === 0 ? 0 : Math.min(100, (stats.submitted / stats.assigned) * 100)}%` }}
            />
          </div>
        </div>
      )}

      <div className="flex items-center gap-3 pt-0.5 text-[11.5px] text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <Layers className="h-3 w-3" />
          {blockCount} {blockCount === 1 ? "block" : "blocks"}
        </span>
        {ratingTables > 0 && (
          <span className="inline-flex items-center gap-1">
            <FileText className="h-3 w-3" />
            {ratingTables} {ratingTables === 1 ? "table" : "tables"}
          </span>
        )}
        <span className="ml-auto inline-flex items-center gap-1">
          <Calendar className="h-3 w-3" />
          {updated}
        </span>
      </div>

      <div className="flex items-center gap-1.5 pt-1">
        <Button size="sm" variant="default" className="h-7 gap-1.5" onClick={() => onAction("edit")}>
          <Pencil className="h-3.5 w-3.5" /> Open editor
        </Button>
        {form.status === "published" ? (
          <>
            <Button size="sm" variant="outline" className="h-7 gap-1.5" onClick={() => onAction("assign")}>
              <UserCheck className="h-3.5 w-3.5" /> Assign
            </Button>
            {stats.submitted > 0 && (
              <Button size="sm" variant="outline" className="h-7 gap-1.5" onClick={() => onAction("responses")}>
                <Inbox className="h-3.5 w-3.5" /> {stats.submitted} response{stats.submitted === 1 ? "" : "s"}
              </Button>
            )}
          </>
        ) : (
          <Button size="sm" variant="outline" className="h-7 gap-1.5" onClick={() => onAction("publish")}>
            <Send className="h-3.5 w-3.5" /> Publish
          </Button>
        )}
      </div>
    </div>
  );
}
