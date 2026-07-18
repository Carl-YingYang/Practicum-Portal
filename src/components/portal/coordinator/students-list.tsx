"use client";

import * as React from "react";
import { useAppStore } from "@/store/use-app-store";
import {
  averageScore,
  evaluationsForStudent,
  getCompany,
  getSupervisor,
  hoursPercent,
} from "@/lib/selectors";
import type { Student, StudentStatus } from "@/lib/types";
import { PageHeader } from "@/components/portal/layout/page-header";
import { DataTable, type Column } from "@/components/portal/shared/data-table";
import { SectionCard } from "@/components/portal/shared/section-card";
import { EmptyState } from "@/components/portal/shared/empty-state";
import { ConfirmDialog } from "@/components/portal/shared/confirm-dialog";
import { Avatar } from "@/components/portal/shared/avatar";
import { ProgressBar } from "@/components/portal/shared/progress-ring";
import { MobileListCard } from "@/components/portal/shared/mobile-list-card";
import { ReassignSupervisorSheet } from "@/components/portal/shared/reassign-supervisor-sheet";
import {
  ScoreBadge,
  UnassignedBadge,
  Badge,
} from "@/components/portal/shared/badges";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
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
  Plus,
  Search,
  MoreHorizontal,
  Eye,
  Pencil,
  UserX,
  Users,
  UserCog,
  FileSpreadsheet,
} from "lucide-react";
import { toast } from "sonner";
import { downloadCsv } from "@/lib/client-pdf";

const COURSES = ["BSIT", "BSCS", "BSIS"];

interface Row {
  student: Student;
  companyName: string;
  supervisorName: string | null;
  hoursPct: number;
  lastScore: number;
}

export function StudentsList() {
  const navigate = useAppStore((s) => s.navigate);
  const students = useAppStore((s) => s.students);
  const supervisors = useAppStore((s) => s.supervisors);
  const companies = useAppStore((s) => s.companies);
  const evaluations = useAppStore((s) => s.evaluations);
  const updateStudent = useAppStore((s) => s.updateStudent);

  const [search, setSearch] = React.useState("");
  const [course, setCourse] = React.useState<string>("all");
  const [companyId, setCompanyId] = React.useState<string>("all");
  const [supervisorFilter, setSupervisorFilter] = React.useState<string>("all");
  const [status, setStatus] = React.useState<string>("all");
  const [deactivateTarget, setDeactivateTarget] = React.useState<Student | null>(null);
  // Reassign state — single student
  const [reassignTarget, setReassignTarget] = React.useState<Student | null>(null);
  // Bulk-assign state — multiple students
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());
  const [bulkOpen, setBulkOpen] = React.useState(false);

  const rows: Row[] = React.useMemo(() => {
    return students
      .map((st) => {
        const company = getCompany(companies, st.companyId);
        const sup = getSupervisor(supervisors, st.supervisorId);
        const evals = evaluationsForStudent(evaluations, st.id);
        const submitted = evals.find((e) => e.status === "submitted");
        return {
          student: st,
          companyName: company?.name ?? "—",
          supervisorName: sup?.name ?? null,
          hoursPct: hoursPercent(st),
          lastScore: submitted ? averageScore(submitted) : 0,
        };
      })
      .filter((r) => {
        if (search) {
          const q = search.toLowerCase();
          if (
            !r.student.name.toLowerCase().includes(q) &&
            !r.student.studentNumber.toLowerCase().includes(q) &&
            !r.student.email.toLowerCase().includes(q) &&
            !r.student.position.toLowerCase().includes(q)
          )
            return false;
        }
        if (course !== "all" && r.student.course !== course) return false;
        if (companyId !== "all" && r.student.companyId !== companyId) return false;
        if (supervisorFilter === "unassigned" && r.student.supervisorId) return false;
        if (
          supervisorFilter !== "all" &&
          supervisorFilter !== "unassigned" &&
          r.student.supervisorId !== supervisorFilter
        )
          return false;
        if (status !== "all" && r.student.status !== status) return false;
        return true;
      });
  }, [students, supervisors, companies, evaluations, search, course, companyId, supervisorFilter, status]);

  // Bulk selection helpers — only unassigned students are selectable.
  const unassignedRows = rows.filter((r) => !r.student.supervisorId);
  const allUnassignedSelected =
    unassignedRows.length > 0 &&
    unassignedRows.every((r) => selectedIds.has(r.student.id));

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAllUnassigned = () => {
    if (allUnassignedSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(unassignedRows.map((r) => r.student.id)));
    }
  };

  const selectedStudents = students.filter((s) => selectedIds.has(s.id));

  // ---- CSV export of the currently-filtered student list ----
  const handleExportCsv = () => {
    if (rows.length === 0) {
      toast.error("Nothing to export", {
        description: "Adjust your filters to include at least one student.",
      });
      return;
    }
    downloadCsv(
      "students-export",
      [
        "Student Name",
        "Student Number",
        "Email",
        "Course",
        "Position",
        "Company",
        "Supervisor",
        "Status",
        "Logged Hours",
        "Required Hours",
        "Completion %",
        "Last Eval Score",
      ],
      rows.map((r) => [
        r.student.name,
        r.student.studentNumber,
        r.student.email,
        r.student.course,
        r.student.position,
        r.companyName,
        r.supervisorName ?? "Unassigned",
        r.student.status,
        r.student.loggedHours,
        r.student.requiredHours,
        r.hoursPct,
        r.lastScore > 0 ? r.lastScore.toFixed(2) : "—",
      ]),
    );
    toast.success("CSV exported", {
      description: `${rows.length} student${rows.length === 1 ? "" : "s"} exported to students-export.csv.`,
    });
  };

  const columns: Column<Row>[] = [
    {
      key: "select",
      header: () => (
        <Checkbox
          checked={allUnassignedSelected}
          onCheckedChange={toggleSelectAllUnassigned}
          aria-label="Select all unassigned"
          disabled={unassignedRows.length === 0}
        />
      ),
      align: "left",
      cell: (r) =>
        r.student.supervisorId ? (
          <span className="inline-block w-4" />
        ) : (
          <Checkbox
            checked={selectedIds.has(r.student.id)}
            onCheckedChange={() => toggleSelect(r.student.id)}
            onClick={(e) => e.stopPropagation()}
            aria-label={`Select ${r.student.name}`}
          />
        ),
    },
    {
      key: "name",
      header: "Student",
      sortValue: (r) => r.student.name,
      cell: (r) => (
        <div className="flex items-center gap-2.5">
          <Avatar name={r.student.name} size="sm" />
          <div className="min-w-0">
            <div className="truncate text-sm font-medium text-foreground">
              {r.student.name}
            </div>
            <div className="truncate text-xs text-muted-foreground">
              {r.student.position}
            </div>
          </div>
        </div>
      ),
    },
    {
      key: "course",
      header: "Course",
      sortValue: (r) => r.student.course,
      hideOnMobile: true,
      cell: (r) => <span className="text-sm text-muted-foreground">{r.student.course}</span>,
    },
    {
      key: "company",
      header: "Company",
      sortValue: (r) => r.companyName,
      hideOnMobile: true,
      cell: (r) => <span className="text-sm text-muted-foreground">{r.companyName}</span>,
    },
    {
      key: "supervisor",
      header: "Supervisor",
      sortValue: (r) => r.supervisorName ?? "zzz",
      hideOnMobile: true,
      cell: (r) =>
        r.supervisorName ? (
          <span className="text-sm text-muted-foreground">{r.supervisorName}</span>
        ) : (
          <UnassignedBadge />
        ),
    },
    {
      key: "hours",
      header: "Hours",
      sortValue: (r) => r.hoursPct,
      cell: (r) => <ProgressBar value={r.hoursPct} showLabel className="w-24" />,
    },
    {
      key: "eval",
      header: "Last Eval",
      sortValue: (r) => r.lastScore,
      hideOnMobile: true,
      cell: (r) =>
        r.lastScore > 0 ? <ScoreBadge score={r.lastScore} /> : <span className="text-sm text-muted-foreground">—</span>,
    },
    {
      key: "status",
      header: "Status",
      sortValue: (r) => r.student.status,
      cell: (r) => (
        <Badge tone={r.student.status === "active" ? "emerald" : "slate"}>
          {r.student.status === "active" ? "Active" : "Inactive"}
        </Badge>
      ),
    },
    {
      key: "actions",
      header: "",
      align: "right",
      cell: (r) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              aria-label="Student actions"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
            <DropdownMenuItem
              onClick={() =>
                navigate("coordinator.student-view", { studentId: r.student.id })
              }
            >
              <Eye className="h-4 w-4" />
              View
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() =>
                navigate("coordinator.student-new", { studentId: r.student.id })
              }
            >
              <Pencil className="h-4 w-4" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setReassignTarget(r.student)}>
              <UserCog className="h-4 w-4" />
              Reassign supervisor
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              onClick={() => setDeactivateTarget(r.student)}
              disabled={r.student.status === "inactive"}
            >
              <UserX className="h-4 w-4" />
              Deactivate
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  const confirmDeactivate = () => {
    if (!deactivateTarget) return;
    updateStudent(deactivateTarget.id, { status: "inactive" });
    toast.success(`${deactivateTarget.name} deactivated`, {
      description: "The student can no longer sign in.",
    });
    setDeactivateTarget(null);
  };

  return (
    <div>
      <PageHeader
        title="Students"
        description={`${students.length} students in the cohort.`}
        breadcrumb="Students"
        actions={
          <div className="flex w-full flex-wrap gap-2 sm:w-auto">
            <Button
              variant="outline"
              onClick={handleExportCsv}
              className="w-full sm:w-auto"
            >
              <FileSpreadsheet className="h-4 w-4" />
              Export CSV
            </Button>
            <Button onClick={() => navigate("coordinator.student-new")} className="w-full sm:w-auto">
              <Plus className="h-4 w-4" />
              Add Student
            </Button>
          </div>
        }
      />

      <SectionCard noPadding contentClassName="p-0">
        {/* Search + Filters — §1.3 grid layout. Mobile: 2-up filter row. */}
        <div className="flex flex-col gap-3 border-b border-border p-4 lg:flex-row lg:items-center">
          <div className="relative w-full lg:max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search name, ID, email…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:flex lg:flex-1">
            <Select value={course} onValueChange={setCourse}>
              <SelectTrigger className="h-11 w-full lg:w-[120px]" size="sm">
                <SelectValue placeholder="Course" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All courses</SelectItem>
                {COURSES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={companyId} onValueChange={setCompanyId}>
              <SelectTrigger className="h-11 w-full lg:w-[160px]" size="sm">
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
            <Select value={supervisorFilter} onValueChange={setSupervisorFilter}>
              <SelectTrigger className="h-11 w-full lg:w-[160px]" size="sm">
                <SelectValue placeholder="Supervisor" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All supervisors</SelectItem>
                <SelectItem value="unassigned">Unassigned</SelectItem>
                {supervisors
                  .filter((s) => s.status === "active")
                  .map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="h-11 w-full lg:w-[120px]" size="sm">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DataTable
          columns={columns}
          rows={rows}
          getRowId={(r) => r.student.id}
          onRowClick={(r) =>
            navigate("coordinator.student-view", { studentId: r.student.id })
          }
          defaultSortKey="name"
          defaultSortDir="asc"
          rowAccent={(r) => (!r.student.supervisorId ? "amber" : undefined)}
          mobileCard={(r) => (
            <MobileListCard
              title={r.student.name}
              subtitle={`${r.student.position} · ${r.student.department}`}
              status={
                <Badge tone={r.student.status === "active" ? "emerald" : "slate"}>
                  {r.student.status === "active" ? "Active" : "Inactive"}
                </Badge>
              }
              meta={
                <span className="flex items-center gap-1.5">
                  <span className="min-w-0 truncate">
                    {r.student.supervisorId ? r.supervisorName : "Unassigned"}
                  </span>
                  <span className="shrink-0 text-border">·</span>
                  <span className="shrink-0 tabular-nums">
                    {r.student.loggedHours}/{r.student.requiredHours}h
                  </span>
                </span>
              }
              leading={<Avatar name={r.student.name} size="sm" />}
              onClick={() =>
                navigate("coordinator.student-view", { studentId: r.student.id })
              }
            />
          )}
          emptyState={
            <EmptyState
              icon={Users}
              title="No students match your filters"
              description="Try adjusting your search or filters, or add a new student."
              actionLabel="Add Student"
              onAction={() => navigate("coordinator.student-new")}
              tone="amber"
            />
          }
        />
      </SectionCard>

      {/* Bulk-assign sticky action bar — appears when 2+ unassigned students are selected */}
      {selectedStudents.length >= 2 && (
        <div className="sticky bottom-[calc(56px+env(safe-area-inset-bottom,0px))] z-20 mt-4 -mx-4 border-t border-border bg-background/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/80 sm:-mx-6 sm:px-6 lg:bottom-0">
          <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-3">
            <p className="min-w-0 truncate text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">{selectedStudents.length}</span>{" "}
              students selected
            </p>
            <div className="flex shrink-0 items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedIds(new Set())}
              >
                Clear
              </Button>
              <Button size="sm" onClick={() => setBulkOpen(true)}>
                <UserCog className="h-4 w-4" />
                Assign to supervisor
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Reassign single student */}
      <ReassignSupervisorSheet
        open={!!reassignTarget}
        onOpenChange={(o) => !o && setReassignTarget(null)}
        student={reassignTarget}
      />

      {/* Bulk assign */}
      <ReassignSupervisorSheet
        open={bulkOpen}
        onOpenChange={(o) => {
          setBulkOpen(o);
          if (!o) setSelectedIds(new Set());
        }}
        students={selectedStudents}
        onDone={() => setSelectedIds(new Set())}
      />

      <ConfirmDialog
        open={!!deactivateTarget}
        onOpenChange={(o) => !o && setDeactivateTarget(null)}
        title="Deactivate student?"
        description={
          deactivateTarget
            ? `${deactivateTarget.name} (${deactivateTarget.studentNumber}) will no longer be able to sign in. Their records and journals are preserved.`
            : ""
        }
        confirmLabel="Deactivate"
        destructive
        onConfirm={confirmDeactivate}
      />
    </div>
  );
}
