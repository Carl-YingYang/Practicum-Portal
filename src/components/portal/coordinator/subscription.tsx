"use client";

import * as React from "react";
import { useAppStore } from "@/store/use-app-store";
import { computeSubscriptionMetrics, formatDate } from "@/lib/selectors";
import { SUBSCRIPTION_PLANS } from "@/lib/mock-data";
import type {
  PlanTier,
  Student,
  SubscriptionMetrics,
  SubscriptionPlan,
} from "@/lib/types";
import { PageHeader } from "@/components/portal/layout/page-header";
import { StatCard } from "@/components/portal/shared/stat-card";
import { SectionCard } from "@/components/portal/shared/section-card";
import { DataTable, type Column } from "@/components/portal/shared/data-table";
import { Avatar } from "@/components/portal/shared/avatar";
import {
  BadgeCheck,
  Wallet,
  Hourglass,
  Clock,
  Sparkles,
  CalendarClock,
  Receipt,
  ArrowRight,
  Calculator,
  FilePlus2,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// ============================================================
// Helpers
// ============================================================

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

/** Format a per-hour RATE with up to 4 decimals (e.g. ₱0.0667). */
function formatRate(n: number): string {
  const rounded = Math.round(n * 10000) / 10000;
  return (
    "₱" +
    rounded.toLocaleString("en-US", {
      maximumFractionDigits: 4,
      minimumFractionDigits: 0,
    })
  );
}

function formatHours(n: number): string {
  return n.toLocaleString("en-US") + " hrs";
}

/** Worked example for a rate: 15 hours = ₱X. */
function rateExample(rate: number): string {
  return `15 hrs = ${formatPhp(15 * rate)}`;
}

const PLAN_ACCENT_GRADIENT: Record<
  SubscriptionPlan["accent"],
  string
> = {
  teal: "from-teal-500 to-emerald-500",
  amber: "from-amber-500 to-orange-500",
  emerald: "from-emerald-500 to-green-600",
  slate: "from-slate-600 to-slate-800",
  red: "from-rose-500 to-red-600",
};

const PLAN_ACCENT_BADGE: Record<SubscriptionPlan["accent"], string> = {
  teal: "bg-teal-50 text-teal-700 dark:bg-teal-950/40 dark:text-teal-300",
  amber:
    "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
  emerald:
    "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
  slate: "bg-slate-100 text-slate-700 dark:bg-slate-800/50 dark:text-slate-300",
  red: "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300",
};

// ============================================================
// Page
// ============================================================

export function SubscriptionPage() {
  const subscription = useAppStore((s) => s.subscription);
  const students = useAppStore((s) => s.students);
  const navigate = useAppStore((s) => s.navigate);
  const generateUsageInvoice = useAppStore((s) => s.generateUsageInvoice);

  const currentPlan = React.useMemo(
    () =>
      SUBSCRIPTION_PLANS.find((p) => p.tier === subscription.planTier) ??
      SUBSCRIPTION_PLANS[0],
    [subscription.planTier]
  );

  const metrics: SubscriptionMetrics = React.useMemo(
    () => computeSubscriptionMetrics(subscription, students),
    [subscription, students]
  );

  const [rateSheetOpen, setRateSheetOpen] = React.useState(false);
  const [planDialogOpen, setPlanDialogOpen] = React.useState(false);

  const handleGenerateInvoice = () => {
    if (metrics.totalUsedHours <= 0) {
      toast.info("No logged hours to invoice yet.");
      return;
    }
    generateUsageInvoice();
    toast.success(
      `Usage invoice generated for ${formatHours(
        metrics.totalUsedHours
      )} (${formatPhp(metrics.accruedCostPhp)}).`
    );
  };

  return (
    <>
      <PageHeader
        title="Subscription & Billing"
        description={`Pay-per-hour billing — you're charged ${formatRate(
          subscription.hourlyRatePhp
        )} for every intern-hour, based on each student's required hours. ${rateExample(
          subscription.hourlyRatePhp
        )}.`}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={() => setPlanDialogOpen(true)}
              className="w-full sm:w-auto"
            >
              <Sparkles className="h-4 w-4" />
              Compare plans
            </Button>
            <Button
              variant="outline"
              onClick={handleGenerateInvoice}
              className="w-full sm:w-auto"
            >
              <FilePlus2 className="h-4 w-4" />
              Generate invoice
            </Button>
            <Button
              onClick={() => setRateSheetOpen(true)}
              className="w-full sm:w-auto"
            >
              <Calculator className="h-4 w-4" />
              Set rate
            </Button>
          </div>
        }
      />

      <div className="space-y-5">
        {/* ---- Current plan / rate hero ---- */}
        <SectionCard
          title="Billing rate"
          description="Your active per-hour rate and the committed bill for this term."
          noPadding
          contentClassName="p-0"
        >
          <div className="relative overflow-hidden">
            {/* Gradient hero background */}
            <div
              className={cn(
                "absolute inset-0 bg-gradient-to-br opacity-[0.07]",
                PLAN_ACCENT_GRADIENT[currentPlan.accent]
              )}
              aria-hidden
            />
            <div className="relative flex flex-col gap-5 p-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-start gap-4">
                <div
                  className={cn(
                    "flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br text-white shadow-sm",
                    PLAN_ACCENT_GRADIENT[currentPlan.accent]
                  )}
                >
                  <BadgeCheck className="h-7 w-7" />
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                      {currentPlan.label} plan
                    </h2>
                    <Badge
                      className={cn(
                        "border-0 capitalize",
                        PLAN_ACCENT_BADGE[currentPlan.accent]
                      )}
                    >
                      {subscription.status === "active"
                        ? "Active"
                        : subscription.status === "trialing"
                          ? "Trial"
                          : subscription.status === "past_due"
                            ? "Past due"
                            : "Canceled"}
                    </Badge>
                    <Badge variant="outline" className="border-dashed">
                      Pay-per-hour
                    </Badge>
                  </div>

                  {/* The rate — the headline number */}
                  <div className="mt-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <span className="text-3xl font-bold tabular-nums text-foreground sm:text-4xl">
                      {formatRate(subscription.hourlyRatePhp)}
                    </span>
                    <span className="text-sm font-medium text-muted-foreground">
                      / intern-hour
                    </span>
                    <span className="rounded-full bg-teal-50 px-2.5 py-0.5 text-xs font-semibold text-teal-700 dark:bg-teal-950/40 dark:text-teal-300">
                      {rateExample(subscription.hourlyRatePhp)}
                    </span>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1.5">
                      <CalendarClock className="h-3.5 w-3.5" />
                      Renews {formatDate(subscription.renewsAt)}
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <BadgeCheck className="h-3.5 w-3.5" />
                      Up to {currentPlan.maxStudents} students
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <Receipt className="h-3.5 w-3.5" />
                      {subscription.billingCycle === "per-term"
                        ? "Billed per term"
                        : `Billed ${subscription.billingCycle}`}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex shrink-0 gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPlanDialogOpen(true)}
                >
                  Change plan
                </Button>
                <Button size="sm" onClick={() => setRateSheetOpen(true)}>
                  <Calculator className="h-4 w-4" />
                  Set rate
                </Button>
              </div>
            </div>

            {/* Billing summary strip */}
            <div className="relative border-t border-border/60 bg-card/40 px-5 py-4 sm:px-6">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">
                    Committed this term
                  </p>
                  <p className="mt-0.5 text-sm text-foreground">
                    <span className="font-semibold tabular-nums">
                      {formatHours(metrics.totalAssignedHours)}
                    </span>{" "}
                    × {formatRate(subscription.hourlyRatePhp)} ={" "}
                    <span className="font-bold tabular-nums text-teal-700 dark:text-teal-300">
                      {formatPhp(metrics.committedCostPhp)}
                    </span>
                  </p>
                </div>
                <div className="sm:border-l sm:border-border/60 sm:pl-4">
                  <p className="text-xs font-medium text-muted-foreground">
                    Accrued so far
                  </p>
                  <p className="mt-0.5 text-sm text-foreground">
                    <span className="font-semibold tabular-nums">
                      {formatHours(metrics.totalUsedHours)}
                    </span>{" "}
                    × {formatRate(subscription.hourlyRatePhp)} ={" "}
                    <span className="font-bold tabular-nums">
                      {formatPhp(metrics.accruedCostPhp)}
                    </span>
                  </p>
                </div>
                <div className="sm:border-l sm:border-border/60 sm:pl-4">
                  <p className="text-xs font-medium text-muted-foreground">
                    Outstanding commitment
                  </p>
                  <p className="mt-0.5 text-sm text-foreground">
                    <span className="font-bold tabular-nums">
                      {formatPhp(metrics.outstandingCostPhp)}
                    </span>
                    <span className="ml-1.5 text-xs text-muted-foreground">
                      ({metrics.utilizationPct}% logged)
                    </span>
                  </p>
                  <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                    <div
                      className="h-full rounded-full bg-teal-500 transition-all duration-500"
                      style={{
                        width: `${Math.min(100, metrics.utilizationPct)}%`,
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </SectionCard>

        {/* ---- KPI cards ---- */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
          <StatCard
            label="Hourly rate"
            value={`${formatRate(subscription.hourlyRatePhp)}/hr`}
            icon={Wallet}
            tone="teal"
            hint={rateExample(subscription.hourlyRatePhp)}
            compact
          />
          <StatCard
            label="Committed hours"
            value={formatHours(metrics.totalAssignedHours)}
            icon={Hourglass}
            tone="amber"
            hint={`${metrics.activeStudents} active students`}
            compact
          />
          <StatCard
            label="Committed total"
            value={formatPhp(metrics.committedCostPhp)}
            icon={Receipt}
            tone="emerald"
            hint="assigned × rate"
            compact
          />
          <StatCard
            label="Accrued so far"
            value={formatPhp(metrics.accruedCostPhp)}
            icon={Clock}
            tone="slate"
            hint={`${metrics.utilizationPct}% of committed`}
            compact
          />
        </div>

        {/* ---- Per-student billing table ---- */}
        <SectionCard
          title="Per-student billing"
          description={`Each student's required hours × ${formatRate(
            subscription.hourlyRatePhp
          )}/hr = their billed amount. Edit a student's required hours to update billing.`}
          noPadding
          contentClassName="p-0"
        >
          <StudentBillingTable
            students={students}
            metrics={metrics}
            onRowClick={(s) =>
              navigate("coordinator.student-view", { studentId: s.id })
            }
          />
        </SectionCard>

        {/* ---- Billing history ---- */}
        <SectionCard
          title="Billing history"
          description="Usage invoices generated from logged intern-hours."
          noPadding
          contentClassName="p-0"
        >
          <BillingHistoryTable />
        </SectionCard>
      </div>

      {/* ---- Set rate slide-over ---- */}
      <SetRateSheet
        open={rateSheetOpen}
        onOpenChange={setRateSheetOpen}
        plan={currentPlan}
        metrics={metrics}
      />

      {/* ---- Compare / change plan dialog ---- */}
      <ComparePlansDialog
        open={planDialogOpen}
        onOpenChange={setPlanDialogOpen}
        currentTier={subscription.planTier}
      />
    </>
  );
}

// ============================================================
// Per-student billing table (with built-in pagination)
// ============================================================

interface BillingRow {
  student: Student;
  companyName: string;
  billed: number;
  pct: number;
}

function StudentBillingTable({
  students,
  metrics,
  onRowClick,
}: {
  students: Student[];
  metrics: SubscriptionMetrics;
  onRowClick: (s: Student) => void;
}) {
  const companies = useAppStore((s) => s.companies);
  const supervisors = useAppStore((s) => s.supervisors);
  const rate = metrics.hourlyRatePhp;

  const rows: BillingRow[] = React.useMemo(() => {
    return students
      .filter((s) => s.status === "active")
      .map((s) => {
        const company = companies.find((c) => c.id === s.companyId);
        return {
          student: s,
          companyName: company?.name ?? "—",
          billed: (s.requiredHours || 0) * rate,
          pct:
            s.requiredHours === 0
              ? 0
              : Math.min(
                  100,
                  Math.round((s.loggedHours / s.requiredHours) * 100)
                ),
        };
      })
      .sort((a, b) => b.billed - a.billed);
  }, [students, companies, rate]);

  const columns: Column<BillingRow>[] = [
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
              {r.student.studentNumber} · {r.student.course}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: "company",
      header: "Placement",
      hideOnMobile: true,
      sortValue: (r) => r.companyName,
      cell: (r) => (
        <div className="min-w-0">
          <p className="truncate text-sm text-foreground">{r.companyName}</p>
          <p className="truncate text-xs text-muted-foreground">
            {r.student.position}
          </p>
        </div>
      ),
    },
    {
      key: "supervisor",
      header: "Supervisor",
      hideOnMobile: true,
      sortValue: (r) =>
        supervisors.find((su) => su.id === r.student.supervisorId)?.name ??
        "Unassigned",
      cell: (r) => {
        const sup = supervisors.find((su) => su.id === r.student.supervisorId);
        return sup ? (
          <span className="text-sm text-foreground">{sup.name}</span>
        ) : (
          <Badge variant="outline" className="text-amber-700">
            Unassigned
          </Badge>
        );
      },
    },
    {
      key: "required",
      header: "Required",
      align: "right",
      sortValue: (r) => r.student.requiredHours,
      cell: (r) => (
        <span className="font-semibold tabular-nums text-foreground">
          {r.student.requiredHours.toLocaleString()}
        </span>
      ),
    },
    {
      key: "billed",
      header: "Billed",
      align: "right",
      sortValue: (r) => r.billed,
      cell: (r) => (
        <span className="font-semibold tabular-nums text-teal-700 dark:text-teal-300">
          {formatPhp(r.billed)}
        </span>
      ),
    },
    {
      key: "logged",
      header: "Logged",
      align: "right",
      hideOnMobile: true,
      sortValue: (r) => r.student.loggedHours,
      cell: (r) => (
        <span className="tabular-nums text-muted-foreground">
          {r.student.loggedHours.toLocaleString()}
        </span>
      ),
    },
    {
      key: "pct",
      header: "Progress",
      align: "right",
      sortValue: (r) => r.pct,
      cell: (r) => (
        <div className="flex items-center justify-end gap-2">
          <div className="hidden w-20 sm:block">
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-500",
                  r.pct >= 90
                    ? "bg-emerald-500"
                    : r.pct >= 50
                      ? "bg-teal-500"
                      : "bg-amber-500"
                )}
                style={{ width: `${Math.min(100, r.pct)}%` }}
              />
            </div>
          </div>
          <span className="w-9 text-right text-xs tabular-nums text-muted-foreground">
            {r.pct}%
          </span>
        </div>
      ),
    },
  ];

  return (
    <DataTable
      columns={columns}
      rows={rows}
      getRowId={(r) => r.student.id}
      onRowClick={(r) => onRowClick(r.student)}
      defaultSortKey="billed"
      defaultSortDir="desc"
      pageSize={10}
      pageSizeOptions={[10, 25, 50]}
      emptyState={
        <div className="px-4 py-10 text-center text-sm text-muted-foreground">
          No active students yet. Add students with required hours to see their
          billing here.
        </div>
      }
      mobileCard={(r) => (
        <div className="space-y-2 p-3">
          <div className="flex items-center gap-2.5">
            <Avatar name={r.student.name} size="sm" />
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium text-foreground">
                {r.student.name}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {r.student.course} · {r.companyName}
              </p>
            </div>
            <span className="shrink-0 font-semibold tabular-nums text-teal-700 dark:text-teal-300">
              {formatPhp(r.billed)}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Required</span>
            <span className="font-semibold tabular-nums">
              {r.student.requiredHours.toLocaleString()} hrs
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Logged</span>
            <span className="tabular-nums">
              {r.student.loggedHours.toLocaleString()} hrs ({r.pct}%)
            </span>
          </div>
        </div>
      )}
    />
  );
}

// ============================================================
// Billing history table
// ============================================================

function BillingHistoryTable() {
  const invoices = useAppStore((s) => s.subscription.invoices);

  const columns: Column<(typeof invoices)[number]>[] = [
    {
      key: "id",
      header: "Invoice",
      sortValue: (i) => i.id,
      cell: (i) => (
        <span className="font-mono text-xs font-medium text-foreground">
          {i.id}
        </span>
      ),
    },
    {
      key: "date",
      header: "Date",
      hideOnMobile: true,
      sortValue: (i) => i.issuedAt,
      cell: (i) => (
        <span className="text-sm text-muted-foreground">
          {formatDate(i.issuedAt)}
        </span>
      ),
    },
    {
      key: "description",
      header: "Description",
      sortValue: (i) => i.description,
      cell: (i) => (
        <span className="text-sm text-foreground">{i.description}</span>
      ),
    },
    {
      key: "hours",
      header: "Hours",
      align: "right",
      hideOnMobile: true,
      sortValue: (i) => i.hours,
      cell: (i) =>
        i.hours > 0 ? (
          <span className="tabular-nums text-muted-foreground">
            {i.hours.toLocaleString()}
          </span>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      key: "amount",
      header: "Amount",
      align: "right",
      sortValue: (i) => i.amountPhp,
      cell: (i) => (
        <span className="font-semibold tabular-nums text-foreground">
          {formatPhp(i.amountPhp)}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      align: "right",
      sortValue: (i) => i.status,
      cell: (i) => {
        const tone =
          i.status === "paid"
            ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
            : i.status === "pending"
              ? "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"
              : "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300";
        return (
          <Badge className={cn("border-0 capitalize", tone)}>{i.status}</Badge>
        );
      },
    },
  ];

  if (invoices.length === 0) {
    return (
      <div className="px-4 py-10 text-center text-sm text-muted-foreground">
        No invoices yet. Click “Generate invoice” to bill accrued hours.
      </div>
    );
  }

  return (
    <DataTable
      columns={columns}
      rows={invoices}
      getRowId={(i) => i.id}
      defaultSortKey="date"
      defaultSortDir="desc"
      pageSize={5}
      pageSizeOptions={[5, 10, 25]}
    />
  );
}

// ============================================================
// Set rate slide-over
// ============================================================

const RATE_PRESETS = [
  { label: "₱0.05/hr", value: 0.05 },
  { label: "₱0.0667/hr", value: 0.0667 },
  { label: "₱0.10/hr", value: 0.1 },
  { label: "₱0.15/hr", value: 0.15 },
];

function SetRateSheet({
  open,
  onOpenChange,
  plan,
  metrics,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  plan: SubscriptionPlan;
  metrics: SubscriptionMetrics;
}) {
  const setHourlyRate = useAppStore((s) => s.setHourlyRate);
  const subscription = useAppStore((s) => s.subscription);
  const [rateStr, setRateStr] = React.useState<string>(
    String(subscription.hourlyRatePhp)
  );

  // Reset the input to the live rate whenever the sheet opens.
  React.useEffect(() => {
    if (open) setRateStr(String(subscription.hourlyRatePhp));
  }, [open, subscription.hourlyRatePhp]);

  const parsed = Number(rateStr);
  const valid = Number.isFinite(parsed) && parsed > 0;
  const newCommitted = valid
    ? metrics.totalAssignedHours * parsed
    : metrics.committedCostPhp;
  const newAccrued = valid
    ? metrics.totalUsedHours * parsed
    : metrics.accruedCostPhp;
  const delta = valid ? newCommitted - metrics.committedCostPhp : 0;

  const handleSubmit = () => {
    if (!valid) {
      toast.error("Enter a valid hourly rate greater than 0.");
      return;
    }
    setHourlyRate(parsed);
    toast.success(
      `Billing rate set to ${formatRate(parsed)}/hr. ${rateExample(parsed)}.`
    );
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col gap-0 sm:max-w-md">
        <SheetHeader className="border-b border-border/60 px-6 pt-6">
          <SheetTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5 text-teal-600" />
            Set hourly rate
          </SheetTitle>
          <SheetDescription>
            The rate charged for every intern-hour. Your {plan.label} tier
            defaults to{" "}
            <span className="font-medium text-foreground">
              {formatRate(plan.hourlyRatePhp)}/hr
            </span>{" "}
            ({rateExample(plan.hourlyRatePhp)}). Override it below.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
          {/* Current snapshot */}
          <div className="rounded-lg border border-border/60 bg-muted/30 p-4">
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                  Committed
                </p>
                <p className="mt-0.5 font-bold tabular-nums text-foreground">
                  {formatHours(metrics.totalAssignedHours)}
                </p>
              </div>
              <div className="border-x border-border/60">
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                  Logged
                </p>
                <p className="mt-0.5 font-bold tabular-nums text-foreground">
                  {formatHours(metrics.totalUsedHours)}
                </p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                  Students
                </p>
                <p className="mt-0.5 font-bold tabular-nums text-foreground">
                  {metrics.activeStudents}
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="hourly-rate">Hourly rate (PHP)</Label>
            <Input
              id="hourly-rate"
              type="number"
              min={0.0001}
              step={0.0001}
              value={rateStr}
              onChange={(e) => setRateStr(e.target.value)}
            />
            <div className="flex flex-wrap gap-1.5 pt-1">
              {RATE_PRESETS.map((p) => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => setRateStr(String(p.value))}
                  className={cn(
                    "rounded-md border px-2.5 py-1 text-xs font-medium transition-colors",
                    Number(rateStr) === p.value
                      ? "border-teal-500 bg-teal-50 text-teal-700 dark:bg-teal-950/40 dark:text-teal-300"
                      : "border-border/60 bg-background text-muted-foreground hover:bg-muted"
                  )}
                >
                  {p.label}
                </button>
              ))}
            </div>
            <p className="pt-1 text-xs text-muted-foreground">
              Worked example at this rate:{" "}
              <span className="font-medium text-foreground">
                {valid ? rateExample(parsed) : "—"}
              </span>
            </p>
          </div>

          {/* Summary */}
          <div className="space-y-2 rounded-lg border border-border/60 p-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">New committed total</span>
              <span className="font-semibold tabular-nums text-foreground">
                {formatPhp(newCommitted)}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">New accrued total</span>
              <span className="tabular-nums text-foreground">
                {formatPhp(newAccrued)}
              </span>
            </div>
            <div className="my-2 border-t border-border/60" />
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Change vs current</span>
              <span
                className={cn(
                  "tabular-nums font-medium",
                  delta > 0.001
                    ? "text-amber-600 dark:text-amber-400"
                    : delta < -0.001
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-muted-foreground"
                )}
              >
                {delta > 0 ? "+" : ""}
                {formatPhp(delta)}
              </span>
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            This is a prototype — no real payment is processed. The new rate
            applies immediately to all billing calculations.
          </p>
        </div>

        <SheetFooter className="border-t border-border/60 px-6 py-4">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="w-full sm:w-auto"
          >
            Cancel
          </Button>
          <Button onClick={handleSubmit} className="w-full sm:flex-1">
            <Check className="h-4 w-4" />
            Apply rate
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

// ============================================================
// Compare / change plan dialog (rate tiers)
// ============================================================

function ComparePlansDialog({
  open,
  onOpenChange,
  currentTier,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  currentTier: PlanTier;
}) {
  const changePlan = useAppStore((s) => s.changePlan);
  const [confirmTier, setConfirmTier] = React.useState<PlanTier | null>(null);

  const handleConfirm = () => {
    if (!confirmTier) return;
    changePlan(confirmTier);
    const p = SUBSCRIPTION_PLANS.find((x) => x.tier === confirmTier);
    toast.success(
      `Switched to the ${p?.label} plan. Your rate is now ${formatRate(
        p?.hourlyRatePhp ?? 0
      )}/hr (${rateExample(p?.hourlyRatePhp ?? 0)}).`
    );
    setConfirmTier(null);
    onOpenChange(false);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Choose your rate plan</DialogTitle>
            <DialogDescription>
              Each tier sets a per-hour billing rate and a max-students cap.
              You&rsquo;re billed the tier&rsquo;s rate for every intern-hour.
              Switching adopts the new tier&rsquo;s rate immediately.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 sm:grid-cols-3">
            {SUBSCRIPTION_PLANS.map((p) => {
              const isCurrent = p.tier === currentTier;
              return (
                <div
                  key={p.tier}
                  className={cn(
                    "relative flex flex-col rounded-xl border p-4 transition-colors",
                    isCurrent
                      ? "border-teal-500 bg-teal-50/40 dark:bg-teal-950/20"
                      : "border-border/60 bg-card"
                  )}
                >
                  {isCurrent && (
                    <Badge className="absolute -top-2 right-3 border-0 bg-teal-600 text-white">
                      Current
                    </Badge>
                  )}
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br text-white",
                        PLAN_ACCENT_GRADIENT[p.accent]
                      )}
                    >
                      <Sparkles className="h-4 w-4" />
                    </span>
                    <h3 className="font-bold text-foreground">{p.label}</h3>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {p.blurb}
                  </p>
                  <div className="mt-3">
                    <span className="text-2xl font-bold tabular-nums text-foreground">
                      {formatRate(p.hourlyRatePhp)}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {" "}
                      / intern-hour
                    </span>
                  </div>
                  <div className="mt-1 text-xs font-medium text-teal-700 dark:text-teal-300">
                    {rateExample(p.hourlyRatePhp)}
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    Up to {p.maxStudents} students
                  </div>
                  <ul className="mt-3 flex-1 space-y-1.5">
                    {p.features.map((f) => (
                      <li
                        key={f}
                        className="flex items-start gap-1.5 text-xs text-muted-foreground"
                      >
                        <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                  <Button
                    variant={isCurrent ? "outline" : "default"}
                    disabled={isCurrent}
                    onClick={() => setConfirmTier(p.tier)}
                    className="mt-4 w-full"
                  >
                    {isCurrent ? (
                      <>
                        <Check className="h-4 w-4" />
                        Current plan
                      </>
                    ) : (
                      <>
                        Switch to {p.label}
                        <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </Button>
                </div>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirm switch — rendered as a sibling, not nested */}
      <Dialog
        open={confirmTier !== null}
        onOpenChange={(v) => !v && setConfirmTier(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm plan switch</DialogTitle>
            <DialogDescription>
              Switching to the{" "}
              <span className="font-medium text-foreground">
                {SUBSCRIPTION_PLANS.find((p) => p.tier === confirmTier)?.label}
              </span>{" "}
              plan sets your hourly rate to{" "}
              {formatRate(
                SUBSCRIPTION_PLANS.find((p) => p.tier === confirmTier)
                  ?.hourlyRatePhp ?? 0
              )}
              /hr (
              {rateExample(
                SUBSCRIPTION_PLANS.find((p) => p.tier === confirmTier)
                  ?.hourlyRatePhp ?? 0
              )}
              ). This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              variant="outline"
              onClick={() => setConfirmTier(null)}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button onClick={handleConfirm} className="w-full sm:flex-1">
              <Check className="h-4 w-4" />
              Confirm switch
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export { SubscriptionPage as default };
