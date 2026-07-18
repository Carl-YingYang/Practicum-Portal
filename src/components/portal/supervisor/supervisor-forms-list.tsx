"use client";

import * as React from "react";
import { useAppStore } from "@/store/use-app-store";
import { PageHeader } from "@/components/portal/layout/page-header";
import { SectionCard } from "@/components/portal/shared/section-card";
import { EmptyState } from "@/components/portal/shared/empty-state";
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
  Search,
  FileText,
  ChevronRight,
} from "lucide-react";
import {
  type FormCategory,
  type FormDocument,
  FORM_CATEGORY_LABELS,
} from "@/lib/types";
import { assignedFormsForUser } from "@/lib/selectors";

const categoryOptions: { value: FormCategory | "all"; label: string }[] = [
  { value: "all", label: "All types" },
  { value: "evaluation", label: FORM_CATEGORY_LABELS.evaluation },
  { value: "journal", label: FORM_CATEGORY_LABELS.journal },
  { value: "ojt", label: FORM_CATEGORY_LABELS.ojt },
  { value: "program", label: FORM_CATEGORY_LABELS.program },
  { value: "other", label: FORM_CATEGORY_LABELS.other },
];

export function SupervisorFormsList() {
  const navigate = useAppStore((s) => s.navigate);
  const forms = useAppStore((s) => s.formDocuments);
  const assignments = useAppStore((s) => s.formAssignments);
  const currentUser = useAppStore((s) => s.currentUser)!;

  const [search, setSearch] = React.useState("");
  const [categoryFilter, setCategoryFilter] = React.useState<FormCategory | "all">("all");

  // Only forms actually assigned to this supervisor (by role or specific
  // user) should appear in their inbox — not every published form.
  const assigned = React.useMemo(
    () => assignedFormsForUser(forms, assignments, currentUser),
    [forms, assignments, currentUser]
  );

  const published = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    return assigned
      .map(({ form }) => form)
      .filter((f) => (categoryFilter === "all" ? true : f.category === categoryFilter))
      .filter((f) =>
        q ? f.title.toLowerCase().includes(q) || f.description.toLowerCase().includes(q) : true
      )
      .sort((a, b) => new Date(b.publishedAt ?? b.updatedAt).getTime() - new Date(a.publishedAt ?? a.updatedAt).getTime());
  }, [assigned, search, categoryFilter]);

  const grouped = React.useMemo(() => {
    const map = new Map<FormCategory, FormDocument[]>();
    for (const f of published) {
      const arr = map.get(f.category) ?? [];
      arr.push(f);
      map.set(f.category, arr);
    }
    return Array.from(map.entries());
  }, [published]);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Forms"
        breadcrumb="Forms"
        description="Forms shared by the coordinator. Open one to fill it in."
      />

      <SectionCard>
        <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
          <div className="relative w-full flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search forms…"
              className="h-9 pl-8"
            />
          </div>
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
        </div>
      </SectionCard>

      {published.length === 0 ? (
        <SectionCard>
          <EmptyState
            icon={FileText}
            title="No shared forms yet"
            description="Forms published by the coordinator will appear here for you to fill out."
          />
        </SectionCard>
      ) : (
        <div className="space-y-6">
          {grouped.map(([cat, items]) => (
            <div key={cat} className="space-y-3">
              <h2 className="text-sm font-semibold text-foreground">
                {FORM_CATEGORY_LABELS[cat]}
                <span className="ml-1.5 text-muted-foreground">({items.length})</span>
              </h2>
              <div className="grid gap-3 lg:grid-cols-2">
                {items.map((f) => (
                  <SupervisorFormCard key={f.id} form={f} onOpen={() => navigate("supervisor.form-view", { formId: f.id })} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SupervisorFormCard({ form, onOpen }: { form: FormDocument; onOpen: () => void }) {
  const sectionCount = form.blocks.length;

  return (
    <button
      type="button"
      onClick={onOpen}
      className="group flex w-full flex-col gap-3 rounded-2xl border border-border/60 bg-card p-5 text-left transition-all hover:border-border hover:shadow-sm active:scale-[0.99]"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-semibold text-foreground">
            {form.title}
          </h3>
          {form.description && (
            <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
              {form.description}
            </p>
          )}
        </div>
        <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground/60" />
      </div>

      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <span className="rounded-full bg-muted px-2.5 py-1 font-medium">
          {sectionCount} {sectionCount === 1 ? "section" : "sections"}
        </span>
        <span className="rounded-full bg-muted px-2.5 py-1 font-medium">
          {FORM_CATEGORY_LABELS[form.category]}
        </span>
      </div>
    </button>
  );
}
