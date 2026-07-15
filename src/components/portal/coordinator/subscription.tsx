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
  BatteryLow,
  AlertTriangle,
  Plus,
  Check,
  Sparkles,
  CalendarClock,
  Receipt,
  ArrowRight,
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

function formatPhp(n: number): string {
  return "₱" + Math.round(n).toLocaleString("en-US");
}

function formatHours(n: number): string {
  return n.toLocaleString("en-US") + " hrs";
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

  const [purchaseOpen, setPurchaseOpen] = React.useState(false);
  const [planDialogOpen, setPlanDialogOpen] = React.useState(false);

  return (
    <>
      <PageHeader
        title="Subscription & Billing"
        description="Hours-based billing — your plan pool is drawn down by each student's required hours and consumed by their logged time."
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
              onClick={() => setPurchaseOpen(true)}
              className="w-full sm:w-auto"
            >
              <Plus className="h-4 w-4" />
              Purchase hours
            </Button>
          </div>
        }
      />

      <div className="space-y-5">
        {/* ---- Warning banner (over-allocated or low credits) ---- */}
        {(metrics.overAllocated || metrics.lowCredits) && (
          <div
            role="alert"
            className={cn(
              "flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5",
              metrics.overAllocated
                ? "border-rose-200 bg-rose-50 dark:border-rose-900/50 dark:bg-rose-950/30"
                : "border-amber-200 bg-amber-50 dark:border-amber-900/50 dark:bg-amber-950/30"
            )}
          >
            <div className="flex items-start gap-3">
              <span
                className={cn(
                  "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
                  metrics.overAllocated
                    ? "bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-300"
                    : "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300"
                )}
              >
                {metrics.overAllocated ? (
                  <AlertTriangle className="h-5 w-5" />
                ) : (
                  <BatteryLow className="h-5 w-5" />
                )}
              </span>
              <div className="min-w-0">
                <p className="font-semibold text-foreground">
                  {metrics.overAllocated
                    ? "Over-allocated — top-up required"
                    : "Running low on intern-hours"}
                </p>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  {metrics.overAllocated
                    ? `Your students are committed to ${formatHours(
                        metrics.totalAssignedHours
                      )} but you've only purchased ${formatHours(
                        subscription.purchasedHours
                      )}. Top up ${formatHours(
                        metrics.totalAssignedHours -
                          subscription.purchasedHours
                      )} to cover the gap (est. ${formatPhp(
                        metrics.projectedSpendPhp
                      )} at the ${currentPlan.label} rate).`
                    : `Only ${formatHours(
                        metrics.remainingCredits
                      )} of ${formatHours(
                        subscription.purchasedHours
                      )} purchased hours remain. Consider topping up before the term ends.`}
                </p>
              </div>
            </div>
            <Button
              variant={metrics.overAllocated ? "default" : "outline"}
              onClick={() => setPurchaseOpen(true)}
              className="w-full shrink-0 sm:w-auto"
            >
              <Plus className="h-4 w-4" />
              Top up now
            </Button>
          </div>
        )}

        {/* ---- Current plan hero ---- */}
        <SectionCard
          title="Current plan"
          description="Your active subscription tier and renewal schedule."
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
                      {currentPlan.label}
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
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {currentPlan.blurb}
                  </p>
                  <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1.5">
                      <CalendarClock className="h-3.5 w-3.5" />
                      Renews {formatDate(subscription.renewsAt)}
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <Wallet className="h-3.5 w-3.5" />
                      {formatPhp(currentPlan.basePricePhp)} /{" "}
                      {subscription.billingCycle === "per-term"
                        ? "term"
                        : subscription.billingCycle}
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <Receipt className="h-3.5 w-3.5" />
                      {formatPhp(currentPlan.ratePerHourPhp)} / top-up hour
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
              </div>
            </div>

            {/* Utilization bar */}
            <div className="relative border-t border-border/60 bg-card/40 px-5 py-4 sm:px-6">
              <div className="flex flex-wrap items-end justify-between gap-2">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">
                    Pool utilization
                  </p>
                  <p className="mt-0.5 text-sm text-foreground">
                    <span className="font-semibold tabular-nums">
                      {formatHours(metrics.totalUsedHours)}
                    </span>{" "}
                    used of{" "}
                    <span className="tabular-nums">
                      {formatHours(subscription.purchasedHours)}
                    </span>{" "}
                    purchased
                  </p>
                </div>
                <p className="text-2xl font-bold tabular-nums text-foreground">
                  {metrics.utilizationPct}%
                </p>
              </div>
              <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-500",
                    metrics.utilizationPct >= 90
                      ? "bg-rose-500"
                      : metrics.utilizationPct >= 70
                        ? "bg-amber-500"
                        : "bg-emerald-500"
                  )}
                  style={{ width: `${Math.min(100, metrics.utilizationPct)}%` }}
                />
              </div>
              <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                <span>
                  Commitment:{" "}
                  <span
                    className={cn(
                      "font-medium tabular-nums",
                      metrics.overAllocated && "text-rose-600 dark:text-rose-400"
                    )}
                  >
                    {formatHours(metrics.totalAssignedHours)}
                  </span>{" "}
                  ({metrics.coveragePct}% coverage)
                </span>
                <span>
                  Remaining:{" "}
                  <span className="font-medium tabular-nums">
                    {formatHours(metrics.remainingCredits)}
                  </span>
                </span>
              </div>
            </div>
          </div>
        </SectionCard>

        {/* ---- KPI cards ---- */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
          <StatCard
            label="Purchased hours"
            value={formatHours(subscription.purchasedHours)}
            icon={Wallet}
            tone="teal"
            hint={`Base ${formatHours(currentPlan.baseHours)} + top-ups`}
            compact
          />
          <StatCard
            label="Assigned hours"
            value={formatHours(metrics.totalAssignedHours)}
            icon={Hourglass}
            tone="amber"
            hint={`${metrics.activeStudents} active students`}
            compact
          />
          <StatCard
            label="Used hours"
            value={formatHours(metrics.totalUsedHours)}
            icon={Clock}
            tone="emerald"
            hint={`${metrics.utilizationPct}% of pool`}
            compact
          />
          <StatCard
            label="Remaining credits"
            value={formatHours(metrics.remainingCredits)}
            icon={BatteryLow}
            tone={metrics.lowCredits ? "red" : "slate"}
            hint={
              metrics.lowCredits ? "Low — top up soon" : "Healthy buffer"
            }
            compact
          />
        </div>

        {/* ---- Per-student contribution table ---- */}
        <SectionCard
          title="Per-student hour contribution"
          description="Each student's required hours draw against your purchased pool. Edit a student's required hours to update billing."
          noPadding
          contentClassName="p-0"
        >
          <StudentContributionTable
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
          description="Invoices for your base plan and top-up purchases."
          noPadding
          contentClassName="p-0"
        >
          <BillingHistoryTable />
        </SectionCard>
      </div>

      {/* ---- Purchase hours slide-over ---- */}
      <PurchaseHoursSheet
        open={purchaseOpen}
        onOpenChange={setPurchaseOpen}
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
// Per-student contribution table (with built-in pagination)
// ============================================================

interface ContributionRow {
  student: Student;
  companyName: string;
  pct: number;
}

function StudentContributionTable({
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

  const rows: ContributionRow[] = React.useMemo(() => {
    return students
      .filter((s) => s.status === "active")
      .map((s) => {
        const company = companies.find((c) => c.id === s.companyId);
        return {
          student: s,
          companyName: company?.name ?? "—",
          pct:
            s.requiredHours === 0
              ? 0
              : Math.min(
                  100,
                  Math.round((s.loggedHours / s.requiredHours) * 100)
                ),
        };
      })
      .sort((a, b) => b.student.requiredHours - a.student.requiredHours);
  }, [students, companies]);

  const columns: Column<ContributionRow>[] = [
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
      defaultSortKey="required"
      defaultSortDir="desc"
      pageSize={10}
      pageSizeOptions={[10, 25, 50]}
      emptyState={
        <div className="px-4 py-10 text-center text-sm text-muted-foreground">
          No active students yet. Add students with required hours to see their
          billing contribution here.
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
            +{i.hours.toLocaleString()}
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
        No invoices yet.
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
// Purchase hours slide-over
// ============================================================

const QUICK_TOPUPS = [500, 1000, 2500, 5000];

function PurchaseHoursSheet({
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
  const purchaseHours = useAppStore((s) => s.purchaseHours);
  const [hours, setHours] = React.useState<string>("1000");

  const parsed = Number(hours);
  const valid = Number.isFinite(parsed) && parsed > 0;
  const amount = valid ? parsed * plan.ratePerHourPhp : 0;
  const newTotal = valid ? metrics.remainingCredits + parsed : metrics.remainingCredits;

  const handleSubmit = () => {
    if (!valid) {
      toast.error("Enter a valid number of hours to purchase.");
      return;
    }
    purchaseHours(parsed);
    toast.success(
      `Purchased ${parsed.toLocaleString()} intern-hours for ${formatPhp(amount)}.`
    );
    onOpenChange(false);
    setHours("1000");
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col gap-0 sm:max-w-md">
        <SheetHeader className="border-b border-border/60 px-6 pt-6">
          <SheetTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5 text-teal-600" />
            Purchase intern-hours
          </SheetTitle>
          <SheetDescription>
            Top up your {plan.label} pool at{" "}
            <span className="font-medium text-foreground">
              {formatPhp(plan.ratePerHourPhp)}/hour
            </span>
            . Hours never expire during the active term.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
          {/* Current pool snapshot */}
          <div className="rounded-lg border border-border/60 bg-muted/30 p-4">
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                  Remaining
                </p>
                <p className="mt-0.5 font-bold tabular-nums text-foreground">
                  {formatHours(metrics.remainingCredits)}
                </p>
              </div>
              <div className="border-x border-border/60">
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                  Assigned
                </p>
                <p className="mt-0.5 font-bold tabular-nums text-foreground">
                  {formatHours(metrics.totalAssignedHours)}
                </p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                  Used
                </p>
                <p className="mt-0.5 font-bold tabular-nums text-foreground">
                  {formatHours(metrics.totalUsedHours)}
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="topup-hours">Hours to purchase</Label>
            <Input
              id="topup-hours"
              type="number"
              min={1}
              step={100}
              value={hours}
              onChange={(e) => setHours(e.target.value)}
            />
            <div className="flex flex-wrap gap-1.5 pt-1">
              {QUICK_TOPUPS.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => setHours(String(q))}
                  className={cn(
                    "rounded-md border px-2.5 py-1 text-xs font-medium transition-colors",
                    Number(hours) === q
                      ? "border-teal-500 bg-teal-50 text-teal-700 dark:bg-teal-950/40 dark:text-teal-300"
                      : "border-border/60 bg-background text-muted-foreground hover:bg-muted"
                  )}
                >
                  +{q.toLocaleString()}
                </button>
              ))}
            </div>
          </div>

          {/* Summary */}
          <div className="space-y-2 rounded-lg border border-border/60 p-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Rate</span>
              <span className="tabular-nums">
                {formatPhp(plan.ratePerHourPhp)} / hr
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Hours</span>
              <span className="tabular-nums">
                {valid ? parsed.toLocaleString() : "—"}
              </span>
            </div>
            <div className="my-2 border-t border-border/60" />
            <div className="flex items-center justify-between">
              <span className="font-medium text-foreground">Total due</span>
              <span className="text-lg font-bold tabular-nums text-foreground">
                {formatPhp(amount)}
              </span>
            </div>
            <p className="pt-1 text-xs text-muted-foreground">
              After purchase, your remaining credits will be{" "}
              <span className="font-medium text-foreground">
                {formatHours(newTotal)}
              </span>
              .
            </p>
          </div>

          <p className="text-xs text-muted-foreground">
            This is a prototype — no real payment is processed. The invoice is
            recorded in your billing history as “paid” for demo purposes.
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
            Confirm purchase
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

// ============================================================
// Compare / change plan dialog
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
      `Switched to the ${p?.label} plan. Your pool is now ${formatHours(
        p?.baseHours ?? 0
      )}.`
    );
    setConfirmTier(null);
    onOpenChange(false);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Choose your plan</DialogTitle>
            <DialogDescription>
              Each tier includes a base pool of intern-hours per term. Top-ups
              are billed at the tier&rsquo;s per-hour rate. Switching resets your
              pool to the new tier&rsquo;s base.
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
                      {formatPhp(p.basePricePhp)}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {" "}
                      / term
                    </span>
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {formatHours(p.baseHours)} included ·{" "}
                    {formatPhp(p.ratePerHourPhp)}/hr top-up · up to{" "}
                    {p.maxStudents} students
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
              plan will reset your purchased pool to{" "}
              {formatHours(
                SUBSCRIPTION_PLANS.find((p) => p.tier === confirmTier)
                  ?.baseHours ?? 0
              )}{" "}
              and issue a new base invoice. This cannot be undone.
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
