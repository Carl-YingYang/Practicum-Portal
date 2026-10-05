"use client";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { JournalStatusBadge } from "@/components/portal/shared/badges";
import { cadenceLabels } from "@/domain/journal-period";
import { formatDate } from "@/lib/selectors";
import { cn } from "@/lib/utils";
import type { Journal } from "@/lib/types";
import { FilePlus2 } from "lucide-react";
export function JournalListRail({
  journals,
  activeId,
  onSelect,
  onNew,
}: {
  journals: Journal[];
  activeId?: string;
  onSelect: (j: Journal) => void;
  onNew: () => void;
}) {
  const [filter, setFilter] = React.useState("all");
  const [search, setSearch] = React.useState("");
  const filtered = journals.filter(
    (journal) =>
      (filter === "all" || journal.status === filter) &&
      `${journal.tasks} ${journal.date}`
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  return (
    <div className="flex h-full flex-col gap-2">
      <Button onClick={onNew} className="h-10 w-full justify-start">
        <FilePlus2 className="h-4 w-4" /> New Journal
      </Button>
      <div className="mb-1 px-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        My Journals · {journals.length}
      </div>
      <Input
        aria-label="Search my journals"
        placeholder="Search journals…"
        className="min-h-11"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      <select
        aria-label="Filter my journals"
        className="min-h-11 rounded-lg border border-input bg-background px-2 text-xs"
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
      >
        <option value="all">All statuses</option>
        <option value="draft">Draft</option>
        <option value="pending">Submitted</option>
        <option value="approved">Approved</option>
        <option value="rejected">Needs revision</option>
      </select>
      <div className="max-h-[65vh] flex-1 space-y-1.5 overflow-y-auto pr-1 scroll-area-custom">
        {filtered.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
            {journals.length === 0
              ? "No journals yet. Start with New Journal."
              : "No matching journals. Clear your search or change the filter."}
          </p>
        ) : (
          filtered.map((j) => (
            <button
              key={j.id}
              type="button"
              onClick={() => onSelect(j)}
              className={cn(
                "w-full rounded-lg border p-2.5 text-left transition-colors",
                activeId === j.id
                  ? "border-primary bg-primary/5"
                  : "border-border bg-card hover:border-border/80 hover:bg-muted/40",
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium text-foreground">
                  {cadenceLabels[j.cadence ?? "weekly"]} entry
                </span>
                <JournalStatusBadge status={j.status} />
              </div>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                {formatDate(j.date)} · {j.hours}h
              </p>
              <p className="mt-1 line-clamp-2 text-[11px] text-muted-foreground/80">
                {j.tasks || "Empty draft"}
              </p>
              <p className="mt-1 text-xs font-medium text-primary">
                {["draft", "rejected"].includes(j.status)
                  ? "Continue editing"
                  : "View journal"}
              </p>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
