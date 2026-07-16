"use client";

import * as React from "react";
import { useAppStore } from "@/store/use-app-store";
import type { Student } from "@/lib/types";
import { PageHeader } from "@/components/portal/layout/page-header";
import { StatCard } from "@/components/portal/shared/stat-card";
import { SectionCard } from "@/components/portal/shared/section-card";
import { DataTable, type Column } from "@/components/portal/shared/data-table";
import { Avatar } from "@/components/portal/shared/avatar";
import { Badge } from "@/components/portal/shared/badges";
import {
  Receipt,
  Users,
  Hourglass,
  Wallet,
  FileText,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

// ============================================================
// Constants & helpers
// ============================================================

/**
 * Institutional post-paid billing rate. Static informational value — the
 * institution is billed ₱0.15 for every intern-hour committed by an active
 * student's required hours. This is an administrative reporting page, NOT a
 * checkout or payment page.
 */
const BILLING_RATE_PHP = 0.15;

/** Format a PHP amount, showing up to 2 decimals only when needed. */
function formatPhp(n: number): string {
  const rounded = Math.round(n * 100) / 100;
  const isWhole = Number.isInteger(rounded);
  return (
    "₱" +
    (isWhole
      ? rounded.toLocaleString("en-US")
      : rounded.toLocaleString("en-US", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }))
  );
}

function formatHours(n: number): string {
  return n.toLocaleString("en-US");
}

// ============================================================
// Page
// ============================================================

export function SubscriptionPage() {
  const students = useAppStore((s) => s.students);

  // ---- Derived billing summary (active students only) ----
  const activeStudents = React.useMemo(
    () => students.filter((s) => s.status === "active"),
    [students]
  );
  const totalBillableHours = React.useMemo(
    () => activeStudents.reduce((sum, s) => sum + (s.requiredHours || 0), 0),
    [activeStudents]
  );
  const estimatedBalance = totalBillableHours * BILLING_RATE_PHP;

  // ---- Generate Official Invoice (prototype: toast only) ----
  const handleGenerateInvoice = () => {
    toast.success("Official invoice queued", {
      description:
        "In the production version, this generates a PDF invoice for the institution's Finance / Accounting Office.",
    });
  };

  return (
    <>
      <PageHeader
        title="Billing & Usage Summary"
        description="Institutional post-paid billing — usage is calculated from the total required intern-hours of all active students at the fixed rate below. For administrative reporting and transparency only."
        actions={
          <Button onClick={handleGenerateInvoice} className="w-full sm:w-auto">
            <FileText className="h-4 w-4" />
            Generate Official Invoice
          </Button>
        }
      />

      <div className="space-y-6">
        {/* ---- Summary cards ---- */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Current Billing Rate"
            value={
              <span className="tabular-nums">
                {formatPhp(BILLING_RATE_PHP)}
              </span>
            }
            icon={Receipt}
            tone="teal"
            hint="per intern-hour (fixed)"
          />
          <StatCard
            label="Active Students"
            value={activeStudents.length.toLocaleString()}
            icon={Users}
            tone="emerald"
            hint={`${students.length - activeStudents.length} inactive total`}
          />
          <StatCard
            label="Total Billable Intern-Hours"
            value={formatHours(totalBillableHours)}
            icon={Hourglass}
            tone="amber"
            hint="Σ required hours (active)"
          />
          <StatCard
            label="Estimated Accrued Balance"
            value={formatPhp(estimatedBalance)}
            icon={Wallet}
            tone="slate"
            hint={`${formatHours(totalBillableHours)} hrs × ${formatPhp(
              BILLING_RATE_PHP
            )}`}
          />
        </div>

        {/* ---- Intern-Hour Breakdown table ---- */}
        <InternHourBreakdown
          students={students}
          onRowClick={(s) =>
            useAppStore.getState().navigate("coordinator.student-view", {
              studentId: s.id,
            })
          }
        />
      </div>
    </>
  );
}

// ============================================================
// Intern-Hour Breakdown table (search + sort + pagination)
// ============================================================

interface BreakdownRow {
  student: Student;
  companyName: string;
  supervisorName: string;
  cost: number;
}

function InternHourBreakdown({
  students,
  onRowClick,
}: {
  students: Student[];
  onRowClick: (s: Student) => void;
}) {
  const companies = useAppStore((s) => s.companies);
  const supervisors = useAppStore((s) => s.supervisors);
  const [query, setQuery] = React.useState("");

  const allRows: BreakdownRow[] = React.useMemo(() => {
    return students.map((s) => {
      const company = companies.find((c) => c.id === s.companyId);
      const supervisor = supervisors.find((su) => su.id === s.supervisorId);
      return {
        student: s,
        companyName: company?.name ?? "—",
        supervisorName: supervisor?.name ?? "—",
        cost: (s.requiredHours || 0) * BILLING_RATE_PHP,
      };
    });
  }, [students, companies, supervisors]);

  const rows = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return allRows;
    return allRows.filter((r) => {
      return (
        r.student.name.toLowerCase().includes(q) ||
        r.student.studentNumber.toLowerCase().includes(q) ||
        r.companyName.toLowerCase().includes(q) ||
        r.supervisorName.toLowerCase().includes(q) ||
        r.student.course.toLowerCase().includes(q)
      );
    });
  }, [allRows, query]);

  const columns: Column<BreakdownRow>[] = [
    {
      key: "name",
      header: "Student",
      sortValue: (r) => r.student.name,
      cell: (r) => (
        <div className="flex min-w-0 items-center gap-2.5">
          <Avatar name={r.student.name} size="sm" />
          <div className="min-w-0">
            <p className="truncate font-medium text-foreground">
              {r.student.name}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {r.student.course}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: "studentId",
      header: "Student ID",
      sortValue: (r) => r.student.studentNumber,
      cell: (r) => (
        <span className="font-mono text-xs text-muted-foreground">
          {r.student.studentNumber}
        </span>
      ),
    },
    {
      key: "company",
      header: "Assigned Company",
      hideOnMobile: true,
      sortValue: (r) => r.companyName,
      cell: (r) => (
        <div className="min-w-0">
          <p className="truncate text-sm text-foreground">{r.companyName}</p>
          <p className="truncate text-xs text-muted-foreground">
            {r.student.position || "—"}
          </p>
        </div>
      ),
    },
    {
      key: "supervisor",
      header: "Assigned Supervisor",
      hideOnMobile: true,
      sortValue: (r) => r.supervisorName,
      cell: (r) => {
        if (r.supervisorName === "—") {
          return <Badge tone="amber">Unassigned</Badge>;
        }
        return (
          <span className="text-sm text-foreground">{r.supervisorName}</span>
        );
      },
    },
    {
      key: "hours",
      header: "Required Hours",
      align: "right",
      sortValue: (r) => r.student.requiredHours,
      cell: (r) => (
        <span className="font-medium tabular-nums text-foreground">
          {r.student.requiredHours.toLocaleString()}
        </span>
      ),
    },
    {
      key: "cost",
      header: "Computed Cost",
      align: "right",
      sortValue: (r) => r.cost,
      cell: (r) => (
        <span className="font-semibold tabular-nums text-foreground">
          {formatPhp(r.cost)}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      align: "right",
      sortValue: (r) => r.student.status,
      cell: (r) =>
        r.student.status === "active" ? (
          <Badge tone="emerald" dot>
            Active
          </Badge>
        ) : (
          <Badge tone="slate" dot>
            Inactive
          </Badge>
        ),
    },
  ];

  return (
    <SectionCard
      title="Intern-Hour Breakdown"
      description={`Each active student's required hours × ${formatPhp(
        BILLING_RATE_PHP
      )} = computed cost. Inactive students are listed for completeness but are not billed.`}
      noPadding
      contentClassName="p-0"
      actions={
        <div className="relative w-full sm:w-64">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name, ID, company…"
            className="h-9 pl-9 text-sm"
            aria-label="Search students"
          />
        </div>
      }
    >
      <DataTable
        columns={columns}
        rows={rows}
        getRowId={(r) => r.student.id}
        onRowClick={(r) => onRowClick(r.student)}
        defaultSortKey="name"
        defaultSortDir="asc"
        pageSize={10}
        pageSizeOptions={[10, 25, 50]}
        rowAccent={(r) =>
          r.student.status === "active" ? undefined : "amber"
        }
        emptyState={
          <div className="px-4 py-12 text-center">
            <Users className="mx-auto mb-3 h-8 w-8 text-muted-foreground/50" />
            <p className="text-sm font-medium text-foreground">
              {query ? "No matching students" : "No students enrolled"}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {query
                ? "Try a different search term."
                : "Once students are added, their billing breakdown appears here."}
            </p>
          </div>
        }
        mobileCard={(r) => (
          <div className="space-y-2.5">
            <div className="flex items-center gap-2.5">
              <Avatar name={r.student.name} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-foreground">
                  {r.student.name}
                </p>
                <p className="truncate font-mono text-xs text-muted-foreground">
                  {r.student.studentNumber}
                </p>
              </div>
              {r.student.status === "active" ? (
                <Badge tone="emerald" dot>
                  Active
                </Badge>
              ) : (
                <Badge tone="slate" dot>
                  Inactive
                </Badge>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Company</p>
                <p className="truncate text-foreground">{r.companyName}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Supervisor</p>
                <p className="truncate text-foreground">{r.supervisorName}</p>
              </div>
            </div>
            <div className="flex items-center justify-between border-t border-border/50 pt-2 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Required hours</p>
                <p className="font-medium tabular-nums text-foreground">
                  {r.student.requiredHours.toLocaleString()} hrs
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Computed cost</p>
                <p className="font-semibold tabular-nums text-foreground">
                  {formatPhp(r.cost)}
                </p>
              </div>
            </div>
          </div>
        )}
      />
    </SectionCard>
  );
}

// Keep the default export consistent with the workspace barrel.
export { SubscriptionPage as default };
