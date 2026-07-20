"use client";

import * as React from "react";
import { useAppStore } from "@/store/use-app-store";
import {
  formatDuration,
  getCompany,
  getSupervisor,
  schoolYearOptions,
  sectionOptions,
} from "@/lib/selectors";
import type { Student, TimeLog } from "@/lib/types";
import { PageHeader } from "@/components/portal/layout/page-header";
import { DataTable, type Column } from "@/components/portal/shared/data-table";
import { SectionCard } from "@/components/portal/shared/section-card";
import { EmptyState } from "@/components/portal/shared/empty-state";
import { Avatar } from "@/components/portal/shared/avatar";
import { Badge } from "@/components/portal/shared/badges";
import { MobileListCard } from "@/components/portal/shared/mobile-list-card";
import {
  CentralizedTimesheetLauncher,
} from "@/components/portal/shared/centralized-timesheet-launcher";
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
  Clock,
  Download,
  Eye,
  FileSpreadsheet,
  Layers,
  Search,
} from "lucide-react";
import { toast } from "sonner";
import { downloadCsv } from "@/lib/client-pdf";

interface Row {
  student: Student;
  companyName: string;
  supervisorName: string | null;
  sessions: TimeLog[];
  totalMs: number;
  period: string;
  status: "active" | "inactive";
  section: string;
  schoolYear: string;
}

function fmtPeriod(sessions: TimeLog[]): string {
  if (sessions.length === 0) return "—";
  const sorted = [...sessions].sort((a, b) =>
    a.clockInAt < b.clockInAt ? -1 : 1,
  );
  const fmt = (iso: string) =>
    new Date(iso).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  if (sorted.length === 1) return fmt(sorted[0].clockInAt);
  return `${fmt(sorted[0].clockInAt)} – ${fmt(sorted[sorted.length - 1].clockInAt)}`;
}

function slugify(s: string): string {
  return (
    s
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "no-section"
  );
}

export function CoordinatorTimesheets() {
  const navigate = useAppStore((s) => s.navigate);
  const students = useAppStore((s) => s.students);
  const supervisors = useAppStore((s) => s.supervisors);
  const companies = useAppStore((s) => s.companies);
  const timeLogs = useAppStore((s) => s.timeLogs);
  const currentUser = useAppStore((s) => s.currentUser);
  const coordinators = useAppStore((s) => s.coordinators);
  const schoolIdentity = useAppStore((s) => s.schoolIdentity);

  const [search, setSearch] = React.useState("");
  const [sectionFilter, setSectionFilter] = React.useState<string>("all");
  const [schoolYearFilter, setSchoolYearFilter] = React.useState<string>("all");
  const [statusFilter, setStatusFilter] = React.useState<string>("all");
  const [companyFilter, setCompanyFilter] = React.useState<string>("all");

  // Coordinator name (for the "Approved by" line on the timesheet).
  const coordinatorName = React.useMemo(() => {
    if (!currentUser) return "";
    if (currentUser.name) return currentUser.name;
    const c = coordinators.find((co) => co.id === currentUser.coordinatorId);
    return c?.name ?? "";
  }, [currentUser, coordinators]);
  const institutionName = schoolIdentity.name || undefined;

  const sectionOpts = React.useMemo(() => sectionOptions(students), [students]);
  const schoolYearOpts = React.useMemo(
    () => schoolYearOptions([[...students], [...supervisors], [...companies]]),
    [students, supervisors, companies],
  );

  const rows: Row[] = React.useMemo(() => {
    return students
      .map((st) => {
        const company = getCompany(companies, st.companyId);
        const sup = getSupervisor(supervisors, st.supervisorId);
        const sessions = timeLogs.filter(
          (t) =>
            t.userId === st.id &&
            t.role === "student" &&
            t.clockOutAt !== null &&
            t.durationMs,
        );
        const totalMs = sessions.reduce((sum, t) => sum + (t.durationMs ?? 0), 0);
        return {
          student: st,
          companyName: company?.name ?? "—",
          supervisorName: sup?.name ?? null,
          sessions,
          totalMs,
          period: fmtPeriod(sessions),
          status: st.status,
          section: st.section ?? "",
          schoolYear: st.schoolYear ?? "",
        };
      })
      .filter((r) => {
        if (search) {
          const q = search.toLowerCase();
          if (
            !r.student.name.toLowerCase().includes(q) &&
            !r.student.studentNumber.toLowerCase().includes(q) &&
            !r.companyName.toLowerCase().includes(q)
          )
            return false;
        }
        if (sectionFilter !== "all" && r.section !== sectionFilter) return false;
        if (schoolYearFilter !== "all" && r.schoolYear !== schoolYearFilter)
          return false;
        if (statusFilter !== "all" && r.status !== statusFilter) return false;
        if (companyFilter !== "all" && r.student.companyId !== companyFilter)
          return false;
        return true;
      });
  }, [
    students,
    supervisors,
    companies,
    timeLogs,
    search,
    sectionFilter,
    schoolYearFilter,
    statusFilter,
    companyFilter,
  ]);

  // ---- CSV export of the index (filtered rows) ----
  const indexHeaders = [
    "Student Name",
    "Student Number",
    "Section",
    "School Year",
    "Company",
    "Sessions",
    "Total Hours",
    "Period",
    "Status",
  ];
  const rowToIndexCsv = (r: Row): (string | number)[] => [
    r.student.name,
    r.student.studentNumber,
    r.section || "",
    r.schoolYear || "",
    r.companyName,
    r.sessions.length,
    formatDuration(r.totalMs),
    r.period,
    r.status,
  ];

  const handleExportIndex = () => {
    if (rows.length === 0) {
      toast.error("Nothing to export", {
        description: "Adjust your filters to include at least one student.",
      });
      return;
    }
    const file = downloadCsv(
      "timesheets-index",
      indexHeaders,
      rows.map(rowToIndexCsv),
    );
    toast.success("Timesheets index exported", {
      description: `${rows.length} student${rows.length === 1 ? "" : "s"} exported to ${file}.`,
    });
  };

  const handleExportPerSection = () => {
    if (rows.length === 0) {
      toast.error("Nothing to export", {
        description: "Adjust your filters to include at least one student.",
      });
      return;
    }
    const groups = new Map<string, Row[]>();
    for (const r of rows) {
      const sec = r.section.trim() || "(no section)";
      if (!groups.has(sec)) groups.set(sec, []);
      groups.get(sec)!.push(r);
    }
    const sections = Array.from(groups.entries());
    sections.forEach(([section, sectionRows], idx) => {
      const slug = slugify(section);
      setTimeout(() => {
        downloadCsv(
          `timesheets-index-${slug}`,
          indexHeaders,
          sectionRows.map(rowToIndexCsv),
        );
      }, idx * 350);
    });
    toast.success(`Exported ${sections.length} section timesheet index CSVs`, {
      description: `One file per section: ${sections.map(([s]) => s).join(", ")}.`,
    });
  };

  // ---- Per-row CSV (sessions) ----
  const handleExportRowCsv = (r: Row) => {
    if (r.sessions.length === 0) {
      toast.warning("No sessions to export", {
        description: `${r.student.name} has no completed clock-in/out sessions.`,
      });
      return;
    }
    const sorted = [...r.sessions].sort((a, b) =>
      a.clockInAt < b.clockInAt ? -1 : 1,
    );
    const file = downloadCsv(
      `timesheet-${slugify(r.companyName)}-${slugify(r.student.name)}`,
      ["Date", "Day", "Time In", "Time Out", "Hours"],
      sorted.map((t) => {
        const d = new Date(t.clockInAt);
        const fmtDate = d.toLocaleDateString("en-US", {
          month: "short",
          day: "2-digit",
          year: "numeric",
        });
        const fmtDay = d.toLocaleDateString("en-US", { weekday: "long" });
        const fmtClock = (iso: string | null) =>
          iso
            ? new Date(iso).toLocaleTimeString("en-US", {
                hour: "numeric",
                minute: "2-digit",
                hour12: true,
              })
            : "—";
        const ms = t.durationMs ?? 0;
        const min = Math.round(ms / 60000);
        return [
          fmtDate,
          fmtDay,
          fmtClock(t.clockInAt),
          fmtClock(t.clockOutAt),
          `${Math.floor(min / 60)}h ${String(min % 60).padStart(2, "0")}m`,
        ];
      }),
    );
    toast.success("Timesheet CSV downloaded", {
      description: `${r.sessions.length} sessions for ${r.student.name} exported to ${file}.`,
    });
  };

  const columns: Column<Row>[] = [
    {
      key: "student",
      header: "Student",
      sortValue: (r) => r.student.name,
      cell: (r) => (
        <div className="flex items-center gap-2.5">
          <Avatar name={r.student.name} size="sm" />
          <div className="min-w-0">
            <div className="truncate text-sm font-medium text-foreground">
              {r.student.name}
            </div>
            <div className="truncate text-xs text-muted-foreground font-mono">
              {r.student.studentNumber}
            </div>
          </div>
        </div>
      ),
    },
    {
      key: "section",
      header: "Section",
      sortValue: (r) => r.section || "~",
      hideOnMobile: true,
      cell: (r) => (
        <span className="text-sm text-muted-foreground">
          {r.section || "—"}
        </span>
      ),
    },
    {
      key: "company",
      header: "Company",
      sortValue: (r) => r.companyName,
      hideOnMobile: true,
      cell: (r) => (
        <span className="text-sm text-muted-foreground">{r.companyName}</span>
      ),
    },
    {
      key: "schoolYear",
      header: "Batch",
      sortValue: (r) => r.schoolYear || "~",
      hideOnMobile: true,
      cell: (r) => (
        <span className="text-sm text-muted-foreground">
          {r.schoolYear || "—"}
        </span>
      ),
    },
    {
      key: "sessions",
      header: "Sessions",
      sortValue: (r) => r.sessions.length,
      align: "center",
      cell: (r) => (
        <span className="inline-flex h-7 min-w-7 items-center justify-center rounded-full bg-muted px-2 text-xs font-semibold tabular-nums">
          {r.sessions.length}
        </span>
      ),
    },
    {
      key: "totalHours",
      header: "Total Hours",
      sortValue: (r) => r.totalMs,
      align: "right",
      cell: (r) => (
        <span className="text-sm font-semibold tabular-nums text-foreground">
          {formatDuration(r.totalMs)}
        </span>
      ),
    },
    {
      key: "period",
      header: "Period",
      sortValue: (r) => r.period,
      hideOnMobile: true,
      cell: (r) => (
        <span className="text-sm text-muted-foreground">{r.period}</span>
      ),
    },
    {
      key: "status",
      header: "Status",
      sortValue: (r) => r.status,
      cell: (r) => (
        <Badge tone={r.status === "active" ? "emerald" : "slate"}>
          {r.status === "active" ? "Active" : "Inactive"}
        </Badge>
      ),
    },
    {
      key: "actions",
      header: "",
      align: "right",
      cell: (r) => (
        <div className="flex items-center justify-end gap-1.5">
          <CentralizedTimesheetLauncher
            trigger={
              <Button
                variant="ghost"
                size="sm"
                className="h-8 gap-1.5 px-2"
                onClick={(e) => e.stopPropagation()}
              >
                <Eye className="h-3.5 w-3.5" />
                View
              </Button>
            }
            companyName={r.companyName}
            student={r.student}
            supervisorName={r.supervisorName ?? undefined}
            coordinatorName={coordinatorName || undefined}
            sessions={r.sessions}
            institutionName={institutionName}
          />
          <Button
            variant="ghost"
            size="sm"
            className="h-8 gap-1.5 px-2"
            onClick={(e) => {
              e.stopPropagation();
              handleExportRowCsv(r);
            }}
          >
            <Download className="h-3.5 w-3.5" />
            CSV
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Intern Timesheets"
        description="Centralized timesheets auto-generated from each intern's clock-in/out data."
        breadcrumb="Timesheets"
        actions={
          <div className="flex w-full flex-wrap gap-2 sm:w-auto">
            <Button
              variant="outline"
              onClick={handleExportIndex}
              className="w-full sm:w-auto"
            >
              <FileSpreadsheet className="h-4 w-4" />
              Export index (CSV)
            </Button>
            <Button
              variant="outline"
              onClick={handleExportPerSection}
              className="w-full sm:w-auto"
            >
              <Layers className="h-4 w-4" />
              Export per section (CSV)
            </Button>
          </div>
        }
      />

      <SectionCard noPadding contentClassName="p-0">
        {/* Filter bar — same style as students-list */}
        <div className="flex flex-col gap-3 border-b border-border p-4 lg:flex-row lg:items-center">
          <div className="relative w-full lg:max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search name, student no, company…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:flex lg:flex-1">
            <Select value={sectionFilter} onValueChange={setSectionFilter}>
              <SelectTrigger className="h-11 w-full lg:w-[140px]" size="sm">
                <SelectValue placeholder="Section" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All sections</SelectItem>
                {sectionOpts.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={schoolYearFilter} onValueChange={setSchoolYearFilter}>
              <SelectTrigger className="h-11 w-full lg:w-[170px]" size="sm">
                <SelectValue placeholder="School Year" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All batches</SelectItem>
                {schoolYearOpts.map((y) => (
                  <SelectItem key={y} value={y}>
                    {y}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-11 w-full lg:w-[120px]" size="sm">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
            <Select value={companyFilter} onValueChange={setCompanyFilter}>
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
          </div>
        </div>

        <DataTable
          columns={columns}
          rows={rows}
          getRowId={(r) => r.student.id}
          onRowClick={(r) =>
            navigate("coordinator.student-view", { studentId: r.student.id })
          }
          defaultSortKey="student"
          defaultSortDir="asc"
          mobileCard={(r) => (
            <MobileListCard
              title={r.student.name}
              subtitle={`${r.section || "—"} · ${r.companyName}`}
              status={
                <Badge tone={r.status === "active" ? "emerald" : "slate"}>
                  {r.status === "active" ? "Active" : "Inactive"}
                </Badge>
              }
              meta={`${r.sessions.length} session${
                r.sessions.length === 1 ? "" : "s"
              } · ${formatDuration(r.totalMs)}`}
              leading={<Avatar name={r.student.name} size="sm" />}
              onClick={() =>
                navigate("coordinator.student-view", { studentId: r.student.id })
              }
            />
          )}
          emptyState={
            <EmptyState
              icon={Clock}
              title="No timesheets match your filters"
              description="Try a wider filter, or remember previous (inactive) batches are preserved here."
              tone="amber"
            />
          }
        />
      </SectionCard>
    </div>
  );
}
