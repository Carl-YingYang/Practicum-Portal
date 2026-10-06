"use client";
import * as React from "react";
import { flushChanges } from "@/client/portal-client";
import { useAppStore } from "@/store/use-app-store";
import { formatDate, getCompany } from "@/lib/selectors";
import type {
  AccountStatus,
  Company,
  Coordinator,
  Role,
  Student,
  Supervisor,
} from "@/lib/types";
import { PageHeader } from "@/components/portal/layout/page-header";
import { DataTable, type Column } from "@/components/portal/shared/data-table";
import { SectionCard } from "@/components/portal/shared/section-card";
import { EmptyState } from "@/components/portal/shared/empty-state";
import { ConfirmDialog } from "@/components/portal/shared/confirm-dialog";
import { CredentialsDialog } from "@/components/portal/shared/credentials-dialog";
import { Avatar } from "@/components/portal/shared/avatar";
import { AccountStatusBadge, Badge } from "@/components/portal/shared/badges";
import { MobileListCard } from "@/components/portal/shared/mobile-list-card";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Users,
  UserPlus,
  Download,
  Upload,
  Search,
  MoreHorizontal,
  Eye,
  KeyRound,
  UserX,
  UserCheck,
  GraduationCap,
  ClipboardCheck,
  ShieldCheck,
  Layers,
  ChevronDown,
  RotateCcw,
} from "lucide-react";
import { toast } from "sonner";
import { exportToCsv } from "@/lib/csv-export";
import { ImportUsersSheet } from "@/components/portal/coordinator/import-users-sheet";
/**
 * Unified User Management page for the coordinator. Shows every student +
 * supervisor + coordinator in one table with search, role filter, and status
 * filter, plus bulk-create + Excel/CSV export affordances.
 */
type UserRole = "student" | "supervisor" | "coordinator";
type UserStatus = "active" | "inactive";
/**
 * Derive the visible ACCOUNT status for any role record.
 *  - Disabled: coordinator disabled the account, or the record itself is
 *    deactivated (placement/employment) — either blocks sign-in.
 *  - Invited: provisioned with a one-time temporary password that hasn't
 *    been replaced yet (first-login password change pending).
 *  - Active: everything else (legacy seeds are implicitly active).
 */
function accountStatusOf(rec: {
  status: UserStatus;
  accountStatus?: AccountStatus;
  mustChangePassword?: boolean;
}): AccountStatus {
  if (rec.accountStatus === "disabled" || rec.status === "inactive")
    return "disabled";
  if (rec.accountStatus === "invited" || rec.mustChangePassword)
    return "invited";
  return "active";
}
/** The effective login password for the credentials export. */
function effectivePasswordOf(rec: {
  password?: string;
  mustChangePassword?: boolean;
  idNumber?: string;
  studentNumber?: string;
}): string {
  return rec.mustChangePassword ? (rec.password ?? "") : "";
}
interface UnifiedUser {
  id: string;
  /** The role-specific record id used to view/edit (studentId / supervisorId / coordinatorId). */
  recordId: string;
  role: UserRole;
  name: string;
  email: string;
  /** Student number for students; empty for supervisors/coordinators. */
  idNumber: string;
  companyId: string;
  companyName: string;
  status: UserStatus;
  /** Account lifecycle (Invited / Active / Disabled). */
  accountStatus: AccountStatus;
  /** Effective login password (temporary until first-login change). */
  tempPassword: string;
  createdAt: string;
}
function buildUserList(
  students: Student[],
  supervisors: Supervisor[],
  coordinators: Coordinator[],
  companies: Company[],
): UnifiedUser[] {
  const studentRows: UnifiedUser[] = students.map((s) => {
    const company = getCompany(companies, s.companyId);
    return {
      id: `student:${s.id}`,
      recordId: s.id,
      role: "student" as const,
      name: s.name,
      email: s.email,
      idNumber: s.studentNumber,
      companyId: s.companyId,
      companyName: company?.name ?? "—",
      status: s.status,
      accountStatus: accountStatusOf(s),
      tempPassword: effectivePasswordOf(s),
      createdAt: s.createdAt,
    };
  });
  const supervisorRows: UnifiedUser[] = supervisors.map((sup) => {
    const company = getCompany(companies, sup.companyId);
    return {
      id: `supervisor:${sup.id}`,
      recordId: sup.id,
      role: "supervisor" as const,
      name: sup.name,
      email: sup.email,
      idNumber: sup.idNumber ?? "",
      companyId: sup.companyId,
      companyName: company?.name ?? "—",
      status: sup.status,
      accountStatus: accountStatusOf(sup),
      tempPassword: effectivePasswordOf(sup),
      createdAt: sup.createdAt,
    };
  });
  const coordinatorRows: UnifiedUser[] = coordinators.map((c) => ({
    id: `coordinator:${c.id}`,
    recordId: c.id,
    role: "coordinator" as const,
    name: c.name,
    email: c.email,
    idNumber: c.idNumber ?? "",
    companyId: "",
    companyName: c.department,
    status: c.status,
    accountStatus: accountStatusOf(c),
    tempPassword: effectivePasswordOf(c),
    createdAt: c.createdAt,
  }));
  return [...coordinatorRows, ...supervisorRows, ...studentRows];
}
export function UserManagement() {
  const navigate = useAppStore((s) => s.navigate);
  const students = useAppStore((s) => s.students);
  const supervisors = useAppStore((s) => s.supervisors);
  const coordinators = useAppStore((s) => s.coordinators);
  const companies = useAppStore((s) => s.companies);
  const setAccountStatus = useAppStore((s) => s.setAccountStatus);
  const resetAccountCredentials = useAppStore((s) => s.resetAccountCredentials);
  const currentUserId = useAppStore((s) => s.currentUser?.id);
  const [search, setSearch] = React.useState("");
  const [roleFilter, setRoleFilter] = React.useState<string>("all");
  const [statusFilter, setStatusFilter] = React.useState<string>("all");
  const [statusTarget, setStatusTarget] = React.useState<UnifiedUser | null>(
    null,
  );
  const [statusNext, setStatusNext] = React.useState<AccountStatus>("disabled");
  const [resetTarget, setResetTarget] = React.useState<UnifiedUser | null>(
    null,
  );
  const [resetCreds, setResetCreds] = React.useState<{
    name: string;
    email: string;
    role: Role;
    tempPassword: string;
  } | null>(null);
  const [importOpen, setImportOpen] = React.useState(false);
  const filtersActive =
    !!search || roleFilter !== "all" || statusFilter !== "all";
  const clearFilters = () => {
    setSearch("");
    setRoleFilter("all");
    setStatusFilter("all");
  };
  const allRows = React.useMemo(
    () => buildUserList(students, supervisors, coordinators, companies),
    [students, supervisors, coordinators, companies],
  );
  const rows = React.useMemo(() => {
    return allRows.filter((r) => {
      if (search) {
        const q = search.toLowerCase();
        if (
          !r.name.toLowerCase().includes(q) &&
          !r.email.toLowerCase().includes(q) &&
          !r.idNumber.toLowerCase().includes(q) &&
          !r.recordId.toLowerCase().includes(q)
        ) {
          return false;
        }
      }
      if (roleFilter !== "all" && r.role !== roleFilter) return false;
      if (statusFilter !== "all" && r.accountStatus !== statusFilter)
        return false;
      return true;
    });
  }, [allRows, search, roleFilter, statusFilter]);
  const totalUsers = allRows.length;
  const activeCount = allRows.filter(
    (r) => r.accountStatus === "active",
  ).length;
  const invitedCount = allRows.filter(
    (r) => r.accountStatus === "invited",
  ).length;
  const disabledCount = allRows.filter(
    (r) => r.accountStatus === "disabled",
  ).length;
  const handleView = (r: UnifiedUser) => {
    if (r.role === "student") {
      navigate("coordinator.student-view", { studentId: r.recordId });
    } else if (r.role === "supervisor") {
      navigate("coordinator.supervisor-view", { supervisorId: r.recordId });
    } else {
      // Coordinators don't have a detail page yet — route back here for now.
      navigate("coordinator.coordinator-new", { coordinatorId: r.recordId });
    }
  };
  const confirmStatusChange = async () => {
    if (!statusTarget) return;
    const t = statusTarget;
    setAccountStatus(t.role, t.recordId, statusNext);
    try {
      await flushChanges();
    } catch (error) {
      throw error;
    }
    toast.success(
      statusNext === "disabled"
        ? `${t.name}'s account was disabled`
        : `${t.name}'s account is now active`,
      {
        description:
          statusNext === "disabled"
            ? "They can no longer sign in; their records are preserved."
            : "They can sign in again with their existing password.",
      },
    );
    setStatusTarget(null);
  };
  const confirmReset = async () => {
    if (!resetTarget) return;
    const result = resetAccountCredentials(
      resetTarget.role,
      resetTarget.recordId,
    );
    try {
      await flushChanges();
    } catch (error) {
      throw error;
    }
    setResetTarget(null);
    setResetCreds(result);
  };
  const handleExportAll = () => {
    const headers = [
      "Name",
      "Email",
      "Role",
      "ID Number",
      "Company / Department",
      "Account Status",
      "Created",
    ];
    const data = allRows.map((r) => [
      r.name,
      r.email,
      r.role === "student"
        ? "Student"
        : r.role === "supervisor"
          ? "Supervisor"
          : "Coordinator",
      r.idNumber || "—",
      r.companyName,
      r.accountStatus === "active"
        ? "Active"
        : r.accountStatus === "invited"
          ? "Invited"
          : "Disabled",
      formatDate(r.createdAt),
    ]);
    const stamp = new Date().toISOString().slice(0, 10);
    exportToCsv(`users-${stamp}.csv`, headers, data);
    toast.success("Export ready", {
      description: `${allRows.length} users exported to CSV.`,
    });
  };
  const columns: Column<UnifiedUser>[] = [
    {
      key: "name",
      header: "Name",
      sortValue: (r) => r.name,
      cell: (r) => (
        <div className="flex items-center gap-2.5">
          <Avatar name={r.name} size="sm" />
          <div className="min-w-0">
            <div className="truncate text-sm font-medium text-foreground">
              {r.name}
            </div>
            <div className="truncate text-xs text-muted-foreground">
              {r.email}
            </div>
          </div>
        </div>
      ),
    },
    {
      key: "role",
      header: "Role",
      sortValue: (r) => r.role,
      cell: (r) => (
        <Badge
          tone={
            r.role === "student"
              ? "slate"
              : r.role === "supervisor"
                ? "teal"
                : "amber"
          }
        >
          {r.role === "student"
            ? "Student"
            : r.role === "supervisor"
              ? "Supervisor"
              : "Coordinator"}
        </Badge>
      ),
    },
    {
      key: "email",
      header: "Email",
      sortValue: (r) => r.email,
      hideOnMobile: true,
      cell: (r) => (
        <span className="truncate text-sm text-muted-foreground">
          {r.email}
        </span>
      ),
    },
    {
      key: "idNumber",
      header: "ID Number",
      sortValue: (r) => r.idNumber,
      hideOnMobile: true,
      cell: (r) => (
        <span className="font-mono text-sm text-muted-foreground">
          {r.idNumber || "—"}
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
      key: "status",
      header: "Account status",
      sortValue: (r) => r.accountStatus,
      cell: (r) => <AccountStatusBadge status={r.accountStatus} />,
    },
    {
      key: "createdAt",
      header: "Created",
      sortValue: (r) => r.createdAt,
      hideOnMobile: true,
      cell: (r) => (
        <span className="text-sm text-muted-foreground">
          {formatDate(r.createdAt)}
        </span>
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
              aria-label="User actions"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            onClick={(e) => e.stopPropagation()}
            className="w-60"
          >
            <DropdownMenuItem onClick={() => handleView(r)}>
              <Eye className="h-4 w-4" />
              View
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => setResetTarget(r)}
              disabled={
                r.role === "coordinator" && r.recordId === currentUserId
              }
            >
              <KeyRound className="h-4 w-4" />
              Reset access…
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {r.accountStatus === "disabled" ? (
              <DropdownMenuItem
                onClick={() => {
                  setStatusTarget(r);
                  setStatusNext("active");
                }}
              >
                <UserCheck className="h-4 w-4" />
                Enable account
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem
                variant="destructive"
                onClick={() => {
                  setStatusTarget(r);
                  setStatusNext("disabled");
                }}
                disabled={
                  r.role === "coordinator" && r.recordId === currentUserId
                }
              >
                <UserX className="h-4 w-4" />
                Disable account
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];
  return (
    <div>
      <PageHeader
        title="User Management"
        description={`${totalUsers} users — ${activeCount} active.`}
        breadcrumb="User Management"
        actions={
          <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
            <Button
              onClick={() => navigate("coordinator.supervisor-new")}
              className="w-full sm:w-auto"
            >
              <UserPlus className="h-4 w-4" />
              Create supervisor account
            </Button>
            <Button
              variant="outline"
              onClick={handleExportAll}
              className="w-full sm:w-auto"
            >
              <Download className="h-4 w-4" />
              Export users CSV
            </Button>
            <Button
              variant="outline"
              onClick={() => setImportOpen(true)}
              className="w-full sm:w-auto"
            >
              <Upload className="h-4 w-4" />
              Import from Excel
            </Button>
            {/* All accounts are provisioned by authorized coordinators. */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button className="w-full sm:w-auto">
                  <UserPlus className="h-4 w-4" />
                  Add User
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 p-1.5">
                <DropdownMenuLabel className="px-2 py-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Create account
                </DropdownMenuLabel>
                <DropdownMenuItem
                  onClick={() => navigate("coordinator.student-new")}
                  className="gap-2.5 rounded-md py-2"
                >
                  <GraduationCap className="h-4 w-4 text-muted-foreground" />
                  <div className="flex min-w-0 flex-col">
                    <span className="text-sm font-medium">Add Student</span>
                    <span className="truncate text-xs text-muted-foreground">
                      Single student account
                    </span>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => navigate("coordinator.supervisor-new")}
                  className="gap-2.5 rounded-md py-2"
                >
                  <ClipboardCheck className="h-4 w-4 text-muted-foreground" />
                  <div className="flex min-w-0 flex-col">
                    <span className="text-sm font-medium">Add Supervisor</span>
                    <span className="truncate text-xs text-muted-foreground">
                      Single supervisor account
                    </span>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => navigate("coordinator.coordinator-new")}
                  className="gap-2.5 rounded-md py-2"
                >
                  <ShieldCheck className="h-4 w-4 text-muted-foreground" />
                  <div className="flex min-w-0 flex-col">
                    <span className="text-sm font-medium">Add Coordinator</span>
                    <span className="truncate text-xs text-muted-foreground">
                      Authorized university staff
                    </span>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => navigate("coordinator.bulk-create")}
                  className="gap-2.5 rounded-md py-2"
                >
                  <Layers className="h-4 w-4 text-muted-foreground" />
                  <div className="flex min-w-0 flex-col">
                    <span className="text-sm font-medium">Bulk Create</span>
                    <span className="truncate text-xs text-muted-foreground">
                      Paste rows + CSV export
                    </span>
                  </div>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        }
      />

      <SectionCard noPadding contentClassName="p-0">
        {/* Search + Filters */}
        <div className="flex flex-col gap-3 border-b border-border p-4 lg:flex-row lg:items-center">
          <div className="relative w-full lg:max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search name, email, ID…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-2 lg:flex lg:flex-1">
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="h-11 w-full lg:w-[160px]" size="sm">
                <SelectValue placeholder="Role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All roles</SelectItem>
                <SelectItem value="coordinator">Coordinators</SelectItem>
                <SelectItem value="student">Students</SelectItem>
                <SelectItem value="supervisor">Supervisors</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-11 w-full lg:w-[140px]" size="sm">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="invited">Invited</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="disabled">Disabled</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {filtersActive && (
            <div className="lg:flex lg:shrink-0">
              <Button
                variant="ghost"
                size="sm"
                className="h-9 text-muted-foreground"
                onClick={clearFilters}
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Clear filters
              </Button>
            </div>
          )}
        </div>

        {/* Status summary strip */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-border/60 px-4 py-2.5 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <span
              className="h-1.5 w-1.5 rounded-full bg-emerald-500"
              aria-hidden
            />
            {activeCount} active
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span
              className="h-1.5 w-1.5 rounded-full bg-amber-500"
              aria-hidden
            />
            {invitedCount} invited
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-red-500" aria-hidden />
            {disabledCount} disabled
          </span>
          <span className="ml-auto hidden sm:inline">
            No public sign-up — all accounts are provisioned here
          </span>
        </div>

        <DataTable
          columns={columns}
          rows={rows}
          getRowId={(r) => r.id}
          onRowClick={(r) => handleView(r)}
          defaultSortKey="name"
          defaultSortDir="asc"
          mobileCard={(r) => (
            <MobileListCard
              className="border-0 bg-transparent p-0 shadow-none"
              title={r.name}
              subtitle={
                <span className="flex items-center gap-1.5">
                  <Badge
                    tone={
                      r.role === "student"
                        ? "slate"
                        : r.role === "supervisor"
                          ? "teal"
                          : "amber"
                    }
                  >
                    {r.role === "student"
                      ? "Student"
                      : r.role === "supervisor"
                        ? "Supervisor"
                        : "Coordinator"}
                  </Badge>
                  <span className="truncate">{r.email}</span>
                </span>
              }
              status={
                <div className="flex items-center gap-1">
                  <AccountStatusBadge status={r.accountStatus} />
                  {columns.find((column) => column.key === "actions")?.cell(r)}
                </div>
              }
              meta={`${r.companyName}${r.idNumber ? ` · ${r.idNumber}` : ""}`}
              leading={<Avatar name={r.name} size="sm" />}
            />
          )}
          emptyState={
            <EmptyState
              icon={Users}
              title="No users match your filters"
              description="Try adjusting your search or filters, or use bulk-create to add users."
              actionLabel="Bulk Create Users"
              onAction={() => navigate("coordinator.bulk-create")}
              tone="slate"
            />
          }
        />
      </SectionCard>

      <ConfirmDialog
        open={!!statusTarget}
        onOpenChange={(o) => !o && setStatusTarget(null)}
        title={
          statusNext === "disabled"
            ? "Disable this account?"
            : "Enable this account?"
        }
        description={
          statusTarget
            ? statusNext === "disabled"
              ? `${statusTarget.name} (${statusTarget.email}) will no longer be able to sign in. Their records are preserved.`
              : `${statusTarget.name} (${statusTarget.email}) will be able to sign in again with their existing password.`
            : ""
        }
        confirmLabel={
          statusNext === "disabled" ? "Disable account" : "Enable account"
        }
        destructive={statusNext === "disabled"}
        onConfirm={confirmStatusChange}
      />

      <ConfirmDialog
        open={!!resetTarget}
        onOpenChange={(o) => !o && setResetTarget(null)}
        title="Reset account access?"
        description={
          resetTarget
            ? `A new one-time temporary password will be generated for ${resetTarget.name} (${resetTarget.email}). Their current password stops working and they must change it at next sign-in.`
            : ""
        }
        confirmLabel="Reset access"
        onConfirm={confirmReset}
      />

      {resetCreds && (
        <CredentialsDialog
          open={!!resetCreds}
          onOpenChange={(o) => !o && setResetCreds(null)}
          purpose="reset"
          name={resetCreds.name}
          email={resetCreds.email}
          role={resetCreds.role}
          tempPassword={resetCreds.tempPassword}
          onDone={() => setResetCreds(null)}
        />
      )}

      <ImportUsersSheet open={importOpen} onOpenChange={setImportOpen} />
    </div>
  );
}
