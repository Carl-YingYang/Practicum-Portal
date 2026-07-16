"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/use-app-store";
import {
  capacityStatus,
  supervisorLoad,
  type CapacityStatus,
} from "@/lib/selectors";
import type { Department, Supervisor } from "@/lib/types";
import { Avatar } from "@/components/portal/shared/avatar";
import { Input } from "@/components/ui/input";
import { Search, Check, Building2, Users } from "lucide-react";

interface SupervisorPickerProps {
  /** Currently selected supervisor id (controlled). */
  value: string | null;
  /** Called when a supervisor is selected. */
  onChange: (supervisorId: string | null) => void;
  /** Optional department to filter/sort by (usually the student's department). */
  department?: Department;
  /** Optional company id — supervisors from the same company get a badge. */
  companyId?: string;
  /** Hide the filter chips + search (compact mode). */
  compact?: boolean;
}

const capacityStyles: Record<
  CapacityStatus,
  { dot: string; label: string; bar: string; text: string }
> = {
  available: {
    dot: "bg-emerald-500",
    label: "Available",
    bar: "bg-emerald-500",
    text: "text-emerald-600 dark:text-emerald-400",
  },
  "near-limit": {
    dot: "bg-amber-500",
    label: "Near limit",
    bar: "bg-amber-500",
    text: "text-amber-600 dark:text-amber-400",
  },
  full: {
    dot: "bg-red-500",
    label: "Full",
    bar: "bg-red-500",
    text: "text-red-600 dark:text-red-400",
  },
};

type FilterMode = "same-dept" | "available" | "all";

/**
 * SupervisorPicker — a card list that shows real context so the coordinator
 * can pick the RIGHT supervisor for an intern.
 *
 * Each card shows: avatar, name, title, department match indicator, current
 * load (X / capacity) with a progress bar, and capacity status.
 *
 * Above the list: filter chips (Same department | Available only | All),
 * search input, default sort by best match (same dept → available → name).
 */
export function SupervisorPicker({
  value,
  onChange,
  department,
  companyId,
  compact,
}: SupervisorPickerProps) {
  const supervisors = useAppStore((s) => s.supervisors);
  const students = useAppStore((s) => s.students);
  const companies = useAppStore((s) => s.companies);

  const [search, setSearch] = React.useState("");
  const [filter, setFilter] = React.useState<FilterMode>("same-dept");

  const companyName = (id: string) =>
    companies.find((c) => c.id === id)?.name ?? "—";

  // Default filter to "all" if no department is provided.
  React.useEffect(() => {
    if (!department && filter === "same-dept") setFilter("all");
  }, [department, filter]);

  const filtered = React.useMemo(() => {
    let list = supervisors.filter((s) => s.status === "active");

    // Filter
    if (filter === "same-dept" && department) {
      list = list.filter((s) => s.department === department);
    } else if (filter === "available") {
      list = list.filter((s) => {
        const status = capacityStatus(students, s);
        return status !== "full";
      });
    }

    // Search
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.title.toLowerCase().includes(q) ||
          s.department.toLowerCase().includes(q)
      );
    }

    // Sort: same dept first, then available, then near-limit, then full, then name
    return [...list].sort((a, b) => {
      if (department) {
        const aMatch = a.department === department ? 0 : 1;
        const bMatch = b.department === department ? 0 : 1;
        if (aMatch !== bMatch) return aMatch - bMatch;
      }
      const aStatus = capacityStatus(students, a);
      const bStatus = capacityStatus(students, b);
      const statusOrder: Record<CapacityStatus, number> = {
        available: 0,
        "near-limit": 1,
        full: 2,
      };
      if (statusOrder[aStatus] !== statusOrder[bStatus]) {
        return statusOrder[aStatus] - statusOrder[bStatus];
      }
      return a.name.localeCompare(b.name);
    });
  }, [supervisors, students, filter, search, department]);

  if (compact) {
    return (
      <div className="space-y-2">
        {filtered.map((sup) => (
          <SupervisorCard
            key={sup.id}
            supervisor={sup}
            selected={value === sup.id}
            onSelect={() => onChange(sup.id)}
            load={supervisorLoad(students, sup.id)}
            status={capacityStatus(students, sup)}
            sameDept={department ? sup.department === department : null}
            sameCompany={companyId ? sup.companyId === companyId : null}
            companyName={companyName(sup.companyId)}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Filter chips */}
      <div className="flex flex-wrap gap-1.5">
        <FilterChip
          active={filter === "same-dept"}
          onClick={() => setFilter("same-dept")}
          disabled={!department}
        >
          Same department
        </FilterChip>
        <FilterChip
          active={filter === "available"}
          onClick={() => setFilter("available")}
        >
          Available only
        </FilterChip>
        <FilterChip active={filter === "all"} onClick={() => setFilter("all")}>
          All
        </FilterChip>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or title"
          className="pl-9"
        />
      </div>

      {/* Results */}
      {department && (
        <p className="text-xs text-muted-foreground">
          Best matches for{" "}
          <span className="font-medium text-foreground">{department}</span>{" "}
          department
        </p>
      )}

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border/70 bg-muted/20 px-4 py-8 text-center">
          <Users className="mx-auto mb-2 h-6 w-6 text-muted-foreground/60" />
          <p className="text-sm font-medium text-foreground">No supervisors</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Try changing the filter or search.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((sup) => (
            <SupervisorCard
              key={sup.id}
              supervisor={sup}
              selected={value === sup.id}
              onSelect={() => onChange(sup.id)}
              load={supervisorLoad(students, sup.id)}
              status={capacityStatus(students, sup)}
              sameDept={department ? sup.department === department : null}
              sameCompany={companyId ? sup.companyId === companyId : null}
              companyName={companyName(sup.companyId)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  disabled,
  children,
}: {
  active: boolean;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "inline-flex h-8 items-center rounded-full border px-3 text-xs font-medium transition-colors",
        active
          ? "border-primary bg-primary text-primary-foreground shadow-sm"
          : "border-border bg-background text-muted-foreground hover:border-border hover:bg-muted hover:text-foreground",
        disabled && "cursor-not-allowed opacity-50 hover:bg-background",
      )}
    >
      {children}
    </button>
  );
}

function SupervisorCard({
  supervisor,
  selected,
  onSelect,
  load,
  status,
  sameDept,
  sameCompany,
  companyName,
}: {
  supervisor: Supervisor;
  selected: boolean;
  onSelect: () => void;
  load: number;
  status: CapacityStatus;
  sameDept: boolean | null;
  sameCompany: boolean | null;
  companyName: string;
}) {
  const cap = capacityStyles[status];
  const pct = supervisor.capacity > 0 ? (load / supervisor.capacity) * 100 : 0;
  const isFull = status === "full";

  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={isFull}
      className={cn(
        "flex w-full items-start gap-3 rounded-xl border p-3 text-left transition-all",
        selected
          ? "border-primary bg-primary/5 ring-1 ring-primary/30"
          : "border-border/60 bg-card hover:border-border hover:bg-muted/30",
        isFull && !selected && "cursor-not-allowed opacity-60",
      )}
    >
      <Avatar name={supervisor.name} size="md" className="mt-0.5 shrink-0" />
      <div className="min-w-0 flex-1">
        {/* Name + selected check + capacity pill (single row) */}
        <div className="flex items-center justify-between gap-2">
          <p className="truncate text-sm font-semibold text-foreground">
            {supervisor.name}
          </p>
          <div className="flex shrink-0 items-center gap-1.5">
            <span className={cn("flex items-center gap-1 text-[10px] font-medium", cap.text)}>
              <span className={cn("h-1.5 w-1.5 rounded-full", cap.dot)} />
              {cap.label}
            </span>
            {selected && (
              <Check className="h-4 w-4 text-primary" strokeWidth={2.5} />
            )}
          </div>
        </div>
        <p className="truncate text-xs text-muted-foreground">
          {supervisor.title}
        </p>

        {/* Department + company match indicators */}
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
            {supervisor.department}
          </span>
          {sameDept === true && (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
              <Check className="h-2.5 w-2.5" strokeWidth={3} />
              Same dept
            </span>
          )}
          {sameCompany === true && (
            <span className="inline-flex items-center gap-1 rounded-full bg-teal-50 px-2 py-0.5 text-[10px] font-medium text-teal-700 dark:bg-teal-950/40 dark:text-teal-400">
              <Building2 className="h-2.5 w-2.5" />
              {companyName}
            </span>
          )}
        </div>

        {/* Load + capacity bar */}
        <div className="mt-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] tabular-nums text-muted-foreground">
              {load} / {supervisor.capacity} interns
            </span>
          </div>
          <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className={cn("h-full rounded-full transition-all", cap.bar)}
              style={{ width: `${Math.min(100, pct)}%` }}
            />
          </div>
        </div>
      </div>
    </button>
  );
}
