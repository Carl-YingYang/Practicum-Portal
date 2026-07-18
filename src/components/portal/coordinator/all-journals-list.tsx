"use client";

import * as React from "react";
import { useAppStore } from "@/store/use-app-store";
import {
  formatDate,
  getCompany,
  getStudent,
  getSupervisor,
  weekLabel,
} from "@/lib/selectors";
import type { Journal, JournalStatus } from "@/lib/types";
import { PageHeader } from "@/components/portal/layout/page-header";
import { SectionCard } from "@/components/portal/shared/section-card";
import { EmptyState } from "@/components/portal/shared/empty-state";
import { ConfirmDialog } from "@/components/portal/shared/confirm-dialog";
import {
  JournalStatusBadge,
} from "@/components/portal/shared/badges";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ClipboardList,
  FileText,
  FileSpreadsheet,
  Check,
  X,
  CheckCheck,
  XCircle,
  Inbox,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { downloadCsv } from "@/lib/client-pdf";
import {
  usePagination,
  DataTablePagination,
} from "@/components/portal/shared/pagination";

interface Row {
  id: string;
  studentName: string;
  studentNumber: string;
  supervisorName: string;
  companyName: string;
  week: string;
  date: string;
  hours: number;
  status: JournalStatus;
}

export function AllJournalsList() {
  const navigate = useAppStore((s) => s.navigate);
  const journals = useAppStore((s) => s.journals);
  const students = useAppStore((s) => s.students);
  const supervisors = useAppStore((s) => s.supervisors);
  const companies = useAppStore((s) => s.companies);
  const approveJournal = useAppStore((s) => s.approveJournal);
  const rejectJournal = useAppStore((s) => s.rejectJournal);

  const [status, setStatus] = React.useState<string>("all");
  const [companyId, setCompanyId] = React.useState<string>("all");

  // Bulk selection state
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const [rejectOpen, setRejectOpen] = React.useState(false);
  const [rejectReason, setRejectReason] = React.useState("");

  const rows: Row[] = React.useMemo(() => {
    return journals
      .map((j) => {
        const st = getStudent(students, j.studentId);
        const sup = getSupervisor(supervisors, st?.supervisorId ?? null);
        const company = st ? getCompany(companies, st.companyId) : undefined;
        return {
          id: j.id,
          studentName: st?.name ?? "Unknown",
          studentNumber: st?.studentNumber ?? "",
          supervisorName: sup?.name ?? "—",
          companyName: company?.name ?? "—",
          week: weekLabel(j.date),
          date: j.date,
          hours: j.hours,
          status: j.status,
        };
      })
      .filter((r) => {
        if (status !== "all" && r.status !== status) return false;
        if (companyId !== "all") {
          const st = students.find((s) => s.studentNumber === r.studentNumber);
          if (!st || st.companyId !== companyId) return false;
        }
        return true;
      })
      .sort((a, b) => (a.date < b.date ? 1 : -1));
  }, [journals, students, supervisors, companies, status, companyId]);

  /** Export the filtered journals list to CSV. */
  const handleExportCsv = () => {
    const head = [
      "Student",
      "Student Number",
      "Supervisor",
      "Company",
      "Week",
      "Hours",
      "Status",
    ];
    const body = rows.map((r) => [
      r.studentName,
      r.studentNumber,
      r.supervisorName,
      r.companyName,
      r.week,
      `${r.hours}h`,
      r.status,
    ]);
    const stamp = new Date().toISOString().slice(0, 10);
    const filename = `journals-${stamp}.csv`;
    downloadCsv(filename, head, body);
    toast.success("CSV exported", {
      description: `${rows.length} journals exported to ${filename}`,
    });
  };

  // Only pending journals can be bulk-approved/rejected.
  const selectedRows = rows.filter((r) => selected.has(r.id));
  const actionableSelected = selectedRows.filter(
    (r) => r.status === "pending"
  );
  const actionableCount = actionableSelected.length;
  const allActionablePendingSelected =
    actionableCount > 0 &&
    actionableCount ===
      rows.filter((r) => r.status === "pending").length;

  const toggleRow = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAllPending = () => {
    const pendingIds = rows.filter((r) => r.status === "pending").map((r) => r.id);
    setSelected((prev) => {
      const next = new Set(prev);
      // If all pending already selected, deselect them; otherwise select all pending.
      const allSel =
        pendingIds.length > 0 && pendingIds.every((id) => next.has(id));
      if (allSel) {
        pendingIds.forEach((id) => next.delete(id));
      } else {
        pendingIds.forEach((id) => next.add(id));
      }
      return next;
    });
  };

  const clearSelection = () => setSelected(new Set());

  const handleBulkApprove = () => {
    actionableSelected.forEach((r) => approveJournal(r.id));
    toast.success(
      `Approved ${actionableCount} journal${actionableCount === 1 ? "" : "s"}`
    );
    clearSelection();
  };

  const handleBulkReject = () => {
    if (!rejectReason.trim()) {
      toast.error("Please provide a rejection reason.");
      return;
    }
    actionableSelected.forEach((r) =>
      rejectJournal(r.id, rejectReason.trim())
    );
    toast.success(
      `Rejected ${actionableCount} journal${actionableCount === 1 ? "" : "s"}`
    );
    setRejectReason("");
    setRejectOpen(false);
    clearSelection();
  };

  // Pending count for header context
  const pendingCount = rows.filter((r) => r.status === "pending").length;

  // Pagination — reset to page 1 when filters change.
  const filterKey = `${status}:${companyId}:${rows.length}`;
  const {
    page,
    setPage,
    size,
    setSize,
    totalPages,
    paginating,
    pageRows,
    fromIndex,
    toIndex,
  } = usePagination({ rows, pageSize: 10, resetKey: filterKey });

  return (
    <div>
      <PageHeader
        title="All Journals"
        description={`${journals.length} journals across the cohort · ${pendingCount} pending approval.`}
        breadcrumb="Journals"
        actions={
          <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
            <Button variant="outline" onClick={handleExportCsv} className="w-full sm:w-auto">
              <FileSpreadsheet className="h-4 w-4" />
              Export CSV
            </Button>
            <Button variant="outline" onClick={() => navigate("coordinator.reports")} className="w-full sm:w-auto">
              <FileText className="h-4 w-4" />
              Compliance Report
            </Button>
          </div>
        }
      />

      <SectionCard noPadding contentClassName="p-0">
        <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center sm:gap-4">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Filters
          </span>
          <div className="grid flex-1 grid-cols-2 gap-2 sm:grid-cols-2">
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-full" size="sm">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All status</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
              </SelectContent>
            </Select>
            <Select value={companyId} onValueChange={setCompanyId}>
              <SelectTrigger className="w-full" size="sm">
                <SelectValue placeholder="Company" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All companies</SelectItem>
                {companies.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Bulk hint bar — always visible when there are pending journals */}
        {pendingCount > 0 && selected.size === 0 && (
          <div className="flex items-center gap-2 border-b border-border/60 bg-muted/20 px-4 py-2 text-xs text-muted-foreground">
            <Inbox className="h-3.5 w-3.5 shrink-0" />
            <span className="min-w-0">
              Tip: select pending journals with the checkboxes to approve or
              reject several at once.
            </span>
          </div>
        )}

        {/* Bulk action bar */}
        {selected.size > 0 && (
          <div className="sticky top-16 z-20 flex flex-wrap items-center gap-2 border-b border-border bg-teal-50/80 px-4 py-2.5 backdrop-blur dark:bg-teal-950/30">
            <span className="text-sm font-medium text-foreground">
              {selected.size} selected
              {actionableCount !== selected.size && (
                <span className="ml-1 text-xs text-muted-foreground">
                  ({actionableCount} actionable)
                </span>
              )}
            </span>
            <div className="ml-auto flex flex-wrap items-center gap-2">
              <Button
                size="sm"
                onClick={handleBulkApprove}
                disabled={actionableCount === 0}
                className="gap-1.5 bg-emerald-600 text-white hover:bg-emerald-700"
              >
                <CheckCheck className="h-3.5 w-3.5" />
                Approve {actionableCount > 0 ? `(${actionableCount})` : ""}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setRejectOpen(true)}
                disabled={actionableCount === 0}
                className="gap-1.5 border-red-300 text-red-600 hover:bg-red-50 hover:text-red-700 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950/40"
              >
                <XCircle className="h-3.5 w-3.5" />
                Reject {actionableCount > 0 ? `(${actionableCount})` : ""}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={clearSelection}
                className="gap-1.5 text-muted-foreground"
              >
                <X className="h-3.5 w-3.5" />
                Clear
              </Button>
            </div>
          </div>
        )}

        {rows.length === 0 ? (
          <div className="p-6">
            <EmptyState
              icon={ClipboardList}
              title="No journals match your filters"
              description="Adjust the filters above to see journal entries."
            />
          </div>
        ) : (
          <>
            {/* Mobile card list — outer is a <div> (NOT <button>) so the
                inner Checkbox (which renders as a button) is valid HTML. */}
            <div className="space-y-2.5 md:hidden">
              {pageRows.map((r) => {
                const isSelected = selected.has(r.id);
                const isPending = r.status === "pending";
                return (
                  <div
                    key={r.id}
                    role="button"
                    tabIndex={0}
                    onClick={() =>
                      navigate("coordinator.journal-view", { journalId: r.id })
                    }
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        navigate("coordinator.journal-view", { journalId: r.id });
                      }
                    }}
                    className={cn(
                      "block w-full cursor-pointer rounded-2xl border bg-card p-4 text-left transition-all hover:border-border hover:shadow-sm active:scale-[0.99] active:bg-muted/40",
                      r.status === "rejected"
                        ? "border-amber-200/70 dark:border-amber-900/40"
                        : isSelected
                        ? "border-teal-300 dark:border-teal-800"
                        : "border-border/70"
                    )}
                  >
                    <div className="flex items-start gap-2.5">
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleRow(r.id)}
                        disabled={!isPending}
                        onClick={(e) => e.stopPropagation()}
                        aria-label={`Select journal for ${r.studentName}`}
                        className={cn("mt-0.5", !isPending && "opacity-40 cursor-not-allowed")}
                      />
                      <div className="min-w-0 flex-1 space-y-1.5">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="truncate text-sm font-semibold text-foreground">
                              {r.studentName}
                            </div>
                            <div className="truncate font-mono text-xs text-muted-foreground">
                              {r.studentNumber}
                            </div>
                          </div>
                          <div className="shrink-0">
                            <JournalStatusBadge status={r.status} />
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                          <span className="inline-flex min-w-0 items-center gap-1">
                            <span className="shrink-0 font-medium text-foreground/70">Sup:</span>
                            <span className="truncate">{r.supervisorName}</span>
                          </span>
                          <span className="shrink-0 text-border">·</span>
                          <span className="truncate">{r.companyName}</span>
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-medium text-foreground/80">
                            {r.week}
                          </span>
                          <span className="text-xs tabular-nums text-muted-foreground">
                            {r.hours}h
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop / tablet table */}
            <div className="hidden overflow-x-auto scroll-area-custom md:block">
            <Table>
              <TableHeader>
                <TableRow className="border-border/60 hover:bg-transparent">
                  <TableHead className="w-10 pl-4 sm:pl-6">
                    <Checkbox
                      checked={
                        pendingCount > 0 && allActionablePendingSelected
                      }
                      onCheckedChange={toggleAllPending}
                      aria-label="Select all pending journals"
                      disabled={pendingCount === 0}
                    />
                  </TableHead>
                  <TableHead className="h-10 text-xs font-semibold uppercase tracking-[0.07em] text-muted-foreground/90">
                    Student
                  </TableHead>
                  <TableHead className="hidden h-10 text-xs font-semibold uppercase tracking-[0.07em] text-muted-foreground/90 md:table-cell">
                    Supervisor
                  </TableHead>
                  <TableHead className="hidden h-10 text-xs font-semibold uppercase tracking-[0.07em] text-muted-foreground/90 md:table-cell">
                    Company
                  </TableHead>
                  <TableHead className="h-10 text-xs font-semibold uppercase tracking-[0.07em] text-muted-foreground/90">
                    Week
                  </TableHead>
                  <TableHead className="h-10 text-right text-xs font-semibold uppercase tracking-[0.07em] text-muted-foreground/90">
                    Hours
                  </TableHead>
                  <TableHead className="h-10 text-xs font-semibold uppercase tracking-[0.07em] text-muted-foreground/90">
                    Status
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pageRows.map((r) => {
                  const isSelected = selected.has(r.id);
                  const isPending = r.status === "pending";
                  return (
                    <TableRow
                      key={r.id}
                      onClick={() =>
                        navigate("coordinator.journal-view", {
                          journalId: r.id,
                        })
                      }
                      className={cn(
                        "h-[52px] cursor-pointer border-border/70 transition-colors hover:bg-muted/50",
                        r.status === "rejected" &&
                          "bg-amber-50/40 dark:bg-amber-950/15",
                        isSelected && "bg-teal-50/60 dark:bg-teal-950/20"
                      )}
                    >
                      <TableCell
                        className="pl-4 sm:pl-6"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleRow(r.id)}
                          disabled={!isPending}
                          aria-label={`Select journal for ${r.studentName}`}
                          className={cn(
                            !isPending && "opacity-40 cursor-not-allowed"
                          )}
                        />
                      </TableCell>
                      <TableCell className="relative pl-2">
                        {r.status === "rejected" && (
                          <span className="absolute left-0 top-1/2 h-7 w-[3px] -translate-y-1/2 rounded-r-full bg-amber-400" />
                        )}
                        <div className="min-w-0">
                          <div className="truncate text-sm font-medium text-foreground">
                            {r.studentName}
                          </div>
                          <div className="truncate font-mono text-xs text-muted-foreground">
                            {r.studentNumber}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden text-sm text-muted-foreground md:table-cell">
                        {r.supervisorName}
                      </TableCell>
                      <TableCell className="hidden text-sm text-muted-foreground md:table-cell">
                        {r.companyName}
                      </TableCell>
                      <TableCell className="text-sm text-foreground">
                        {r.week}
                      </TableCell>
                      <TableCell className="text-right text-sm tabular-nums">
                        {r.hours}h
                      </TableCell>
                      <TableCell>
                        <JournalStatusBadge status={r.status} />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            </div>

            {/* Pagination footer */}
            {paginating && (
              <DataTablePagination
                page={page}
                totalPages={totalPages}
                size={size}
                totalItems={rows.length}
                fromIndex={fromIndex}
                toIndex={toIndex}
                onPageChange={setPage}
                onPageSizeChange={(s) => {
                  setSize(s);
                  setPage(1);
                }}
              />
            )}
          </>
        )}
      </SectionCard>

      {/* Bulk reject reason dialog */}
      <ConfirmDialog
        open={rejectOpen}
        onOpenChange={(o) => {
          setRejectOpen(o);
          if (!o) setRejectReason("");
        }}
        title={`Reject ${actionableCount} journal${actionableCount === 1 ? "" : "s"}?`}
        description={
          <span>
            The selected interns will be notified. They can edit and resubmit
            their journals with your feedback.
          </span>
        }
        confirmLabel="Reject journals"
        cancelLabel="Cancel"
        destructive
        onConfirm={handleBulkReject}
      >
        <div className="mt-3 space-y-2">
          <label
            htmlFor="reject-reason"
            className="text-xs font-medium text-foreground"
          >
            Reason for rejection <span className="text-destructive">*</span>
          </label>
          <Textarea
            id="reject-reason"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="e.g. Hours don't match logged time. Please update and resubmit."
            rows={3}
            className="resize-none"
          />
        </div>
      </ConfirmDialog>
    </div>
  );
}
