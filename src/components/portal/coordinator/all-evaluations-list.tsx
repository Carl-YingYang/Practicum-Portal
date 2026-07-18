"use client";

import * as React from "react";
import { useAppStore } from "@/store/use-app-store";
import {
  averageScore,
  formatDate,
  getCompany,
  getStudent,
  getSupervisor,
} from "@/lib/selectors";
import type { Evaluation } from "@/lib/types";
import { PageHeader } from "@/components/portal/layout/page-header";
import { SectionCard } from "@/components/portal/shared/section-card";
import { DataTable, type Column } from "@/components/portal/shared/data-table";
import { EmptyState } from "@/components/portal/shared/empty-state";
import { StarRating } from "@/components/portal/shared/star-rating";
import {
  ScoreBadge,
  EvaluationStatusBadge,
} from "@/components/portal/shared/badges";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ClipboardCheck, FileText, FileSpreadsheet } from "lucide-react";
import { downloadCsv } from "@/lib/client-pdf";
import { toast } from "sonner";

interface Row extends Evaluation {
  studentName: string;
  studentNumber: string;
  supervisorName: string;
  companyName: string;
  dateLabel: string;
  avg: number;
}

export function AllEvaluationsList() {
  const navigate = useAppStore((s) => s.navigate);
  const evaluations = useAppStore((s) => s.evaluations);
  const students = useAppStore((s) => s.students);
  const supervisors = useAppStore((s) => s.supervisors);
  const companies = useAppStore((s) => s.companies);

  const [companyId, setCompanyId] = React.useState<string>("all");
  const [supervisorId, setSupervisorId] = React.useState<string>("all");
  const [status, setStatus] = React.useState<string>("all");

  const rows: Row[] = React.useMemo(() => {
    return evaluations
      .map((e) => {
        const st = getStudent(students, e.studentId);
        const sup = getSupervisor(supervisors, e.supervisorId);
        const company = st ? getCompany(companies, st.companyId) : undefined;
        return {
          ...e,
          studentName: st?.name ?? "Unknown",
          studentNumber: st?.studentNumber ?? "",
          supervisorName: sup?.name ?? "Unknown",
          companyName: company?.name ?? "—",
          dateLabel: formatDate(e.submittedAt ?? e.createdAt),
          avg: averageScore(e),
        };
      })
      .filter((r) => {
        if (status !== "all" && r.status !== status) return false;
        if (supervisorId !== "all" && r.supervisorId !== supervisorId) return false;
        if (companyId !== "all") {
          const st = getStudent(students, r.studentId);
          if (!st || st.companyId !== companyId) return false;
        }
        return true;
      })
      .sort((a, b) => (a.submittedAt ?? a.createdAt) < (b.submittedAt ?? b.createdAt) ? 1 : -1);
  }, [evaluations, students, supervisors, companies, companyId, supervisorId, status]);

  /** Export the filtered evaluations list to CSV. */
  const handleExportCsv = () => {
    const head = [
      "Student",
      "Student Number",
      "Supervisor",
      "Company",
      "Date",
      "Quality of Work",
      "Job Knowledge",
      "Dependability",
      "Average",
      "Status",
    ];
    const body = rows.map((r) => [
      r.studentName,
      r.studentNumber,
      r.supervisorName,
      r.companyName,
      r.dateLabel,
      r.qualityOfWork > 0 ? `${r.qualityOfWork}/5` : "—",
      r.jobKnowledge > 0 ? `${r.jobKnowledge}/5` : "—",
      r.dependability > 0 ? `${r.dependability}/5` : "—",
      r.avg > 0 ? r.avg.toFixed(2) : "—",
      r.status,
    ]);
    const stamp = new Date().toISOString().slice(0, 10);
    const filename = `evaluations-${stamp}.csv`;
    downloadCsv(filename, head, body);
    toast.success("CSV exported", {
      description: `${rows.length} evaluations exported to ${filename}`,
    });
  };

  const columns: Column<Row>[] = [
    {
      key: "student",
      header: "Student",
      sortValue: (r) => r.studentName,
      cell: (r) => (
        <div className="min-w-0">
          <div className="truncate text-sm font-medium text-foreground">{r.studentName}</div>
          <div className="truncate font-mono text-xs text-muted-foreground">{r.studentNumber}</div>
        </div>
      ),
    },
    {
      key: "supervisor",
      header: "Supervisor",
      sortValue: (r) => r.supervisorName,
      hideOnMobile: true,
      cell: (r) => <span className="text-sm text-muted-foreground">{r.supervisorName}</span>,
    },
    {
      key: "company",
      header: "Company",
      sortValue: (r) => r.companyName,
      hideOnMobile: true,
      cell: (r) => <span className="text-sm text-muted-foreground">{r.companyName}</span>,
    },
    {
      key: "date",
      header: "Date",
      sortValue: (r) => r.submittedAt ?? r.createdAt,
      cell: (r) => <span className="text-sm text-muted-foreground">{r.dateLabel}</span>,
    },
    {
      key: "avg",
      header: "Average",
      sortValue: (r) => r.avg,
      align: "right",
      cell: (r) => <ScoreBadge score={r.avg} />,
    },
    {
      key: "status",
      header: "Status",
      sortValue: (r) => r.status,
      cell: (r) => <EvaluationStatusBadge status={r.status} />,
    },
  ];

  return (
    <div>
      <PageHeader
        title="All Evaluations"
        description={`${evaluations.length} evaluations across the cohort.`}
        breadcrumb="Evaluations"
        actions={
          <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
            <Button variant="outline" onClick={handleExportCsv} className="w-full sm:w-auto">
              <FileSpreadsheet className="h-4 w-4" />
              Export CSV
            </Button>
            <Button variant="outline" onClick={() => navigate("coordinator.reports")} className="w-full sm:w-auto">
              <FileText className="h-4 w-4" />
              PDF Reports
            </Button>
          </div>
        }
      />

      <SectionCard noPadding contentClassName="p-0">
        <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center sm:gap-4">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Filters
          </span>
          <div className="grid flex-1 grid-cols-2 gap-2 sm:grid-cols-3">
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
            <Select value={supervisorId} onValueChange={setSupervisorId}>
              <SelectTrigger className="w-full" size="sm">
                <SelectValue placeholder="Supervisor" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All supervisors</SelectItem>
                {supervisors.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-full" size="sm">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All status</SelectItem>
                <SelectItem value="submitted">Submitted</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DataTable
          columns={columns}
          rows={rows}
          getRowId={(r) => r.id}
          onRowClick={(r) =>
            navigate("coordinator.evaluation-view", { evaluationId: r.id })
          }
          defaultSortKey="date"
          defaultSortDir="desc"
          mobileCard={(r) => (
            <div className="space-y-2.5">
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
                  <EvaluationStatusBadge status={r.status} />
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                <span className="inline-flex min-w-0 items-center gap-1">
                  <span className="shrink-0 font-medium text-foreground/70">Sup:</span>
                  <span className="truncate">{r.supervisorName}</span>
                </span>
                <span className="shrink-0 text-border">·</span>
                <span className="inline-flex min-w-0 items-center gap-1">
                  <span className="shrink-0 font-medium text-foreground/70">Co:</span>
                  <span className="truncate">{r.companyName}</span>
                </span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-muted-foreground">{r.dateLabel}</span>
                <div className="inline-flex shrink-0 items-center gap-1.5">
                  <StarRating
                    value={r.avg}
                    size={12}
                    showValue={false}
                    showLabel={false}
                    animate={false}
                  />
                  <span className="text-xs font-medium text-foreground/70">Avg</span>
                  <ScoreBadge score={r.avg} />
                </div>
              </div>
            </div>
          )}
          emptyState={
            <EmptyState
              icon={ClipboardCheck}
              title="No evaluations match your filters"
              description="Adjust the filters above or wait for supervisors to submit evaluations."
            />
          }
        />
      </SectionCard>
    </div>
  );
}
