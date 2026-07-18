"use client";

import * as React from "react";
import { useAppStore } from "@/store/use-app-store";
import { formatDate, getCompany } from "@/lib/selectors";
import type { Company, Coordinator, Student, Supervisor } from "@/lib/types";
import { PageHeader } from "@/components/portal/layout/page-header";
import { DataTable, type Column } from "@/components/portal/shared/data-table";
import { SectionCard } from "@/components/portal/shared/section-card";
import { EmptyState } from "@/components/portal/shared/empty-state";
import { ConfirmDialog } from "@/components/portal/shared/confirm-dialog";
import { Avatar } from "@/components/portal/shared/avatar";
import { Badge } from "@/components/portal/shared/badges";
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
  UserX,
  GraduationCap,
  ClipboardCheck,
  ShieldCheck,
  Layers,
  ChevronDown,
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
  createdAt: string;
}

function buildUserList(
  students: Student[],
  supervisors: Supervisor[],
  coordinators: Coordinator[],
  companies: Company[]
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
      idNumber: "",
      companyId: sup.companyId,
      companyName: company?.name ?? "—",
      status: sup.status,
      createdAt: sup.createdAt,
    };
  });
  const coordinatorRows: UnifiedUser[] = coordinators.map((c) => ({
    id: `coordinator:${c.id}`,
    recordId: c.id,
    role: "coordinator" as const,
    name: c.name,
    email: c.email,
    idNumber: "",
    companyId: "",
    companyName: c.department,
    status: c.status,
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
  const updateStudent = useAppStore((s) => s.updateStudent);
  const updateSupervisor = useAppStore((s) => s.updateSupervisor);
  const updateCoordinator = useAppStore((s) => s.updateCoordinator);

  const [search, setSearch] = React.useState("");
  const [roleFilter, setRoleFilter] = React.useState<string>("all");
  const [statusFilter, setStatusFilter] = React.useState<string>("all");
  const [deactivateTarget, setDeactivateTarget] =
    React.useState<UnifiedUser | null>(null);
  const [importOpen, setImportOpen] = React.useState(false);

  const allRows = React.useMemo(
    () => buildUserList(students, supervisors, coordinators, companies),
    [students, supervisors, coordinators, companies]
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
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      return true;
    });
  }, [allRows, search, roleFilter, statusFilter]);

  const totalUsers = allRows.length;
  const activeCount = allRows.filter((r) => r.status === "active").length;

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

  const handleDeactivate = () => {
    if (!deactivateTarget) return;
    const t = deactivateTarget;
    if (t.role === "student") {
      updateStudent(t.recordId, { status: "inactive" });
    } else if (t.role === "supervisor") {
      updateSupervisor(t.recordId, { status: "inactive" });
    } else {
      updateCoordinator(t.recordId, { status: "inactive" });
    }
    toast.success(`${t.name} deactivated`, {
      description: "The user can no longer sign in.",
    });
    setDeactivateTarget(null);
  };

  const handleExportAll = () => {
    const headers = [
      "Name",
      "Email",
      "Role",
      "ID Number",
      "Company / Department",
      "Status",
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
      r.status === "active" ? "Active" : "Inactive",
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
          tone={r.role === "student" ? "slate" : r.role === "supervisor" ? "teal" : "amber"}
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
        <span className="truncate text-sm text-muted-foreground">{r.email}</span>
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
      header: "Status",
      sortValue: (r) => r.status,
      cell: (r) => (
        <Badge tone={r.status === "active" ? "emerald" : "slate"}>
          {r.status === "active" ? "Active" : "Inactive"}
        </Badge>
      ),
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
          <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
            <DropdownMenuItem onClick={() => handleView(r)}>
              <Eye className="h-4 w-4" />
              View
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              onClick={() => setDeactivateTarget(r)}
              disabled={r.status === "inactive"}
            >
              <UserX className="h-4 w-4" />
              Deactivate
            </DropdownMenuItem>
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
              variant="outline"
              onClick={handleExportAll}
              className="w-full sm:w-auto"
            >
              <Download className="h-4 w-4" />
              Export to Excel
            </Button>
            <Button
              variant="outline"
              onClick={() => setImportOpen(true)}
              className="w-full sm:w-auto"
            >
              <Upload className="h-4 w-4" />
              Import from Excel
            </Button>
            {/* Add User dropdown — students + supervisors only.
                Coordinators self-register via the login screen. */}
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
                    <span className="truncate text-xs text-muted-foreground">Single student account</span>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => navigate("coordinator.supervisor-new")}
                  className="gap-2.5 rounded-md py-2"
                >
                  <ClipboardCheck className="h-4 w-4 text-muted-foreground" />
                  <div className="flex min-w-0 flex-col">
                    <span className="text-sm font-medium">Add Supervisor</span>
                    <span className="truncate text-xs text-muted-foreground">Single supervisor account</span>
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
                    <span className="truncate text-xs text-muted-foreground">Paste rows + CSV export</span>
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
          getRowId={(r) => r.id}
          onRowClick={(r) => handleView(r)}
          defaultSortKey="name"
          defaultSortDir="asc"
          mobileCard={(r) => (
            <MobileListCard
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
                <Badge tone={r.status === "active" ? "emerald" : "slate"}>
                  {r.status === "active" ? "Active" : "Inactive"}
                </Badge>
              }
              meta={`${r.companyName}${
                r.idNumber ? ` · ${r.idNumber}` : ""
              }`}
              leading={<Avatar name={r.name} size="sm" />}
              onClick={() => handleView(r)}
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
        open={!!deactivateTarget}
        onOpenChange={(o) => !o && setDeactivateTarget(null)}
        title="Deactivate user?"
        description={
          deactivateTarget
            ? `${deactivateTarget.name} (${deactivateTarget.email}) will no longer be able to sign in. Their records are preserved.`
            : ""
        }
        confirmLabel="Deactivate"
        destructive
        onConfirm={handleDeactivate}
      />

      <ImportUsersSheet open={importOpen} onOpenChange={setImportOpen} />
    </div>
  );
}
