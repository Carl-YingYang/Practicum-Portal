"use client";

import * as React from "react";
import { useAppStore } from "@/store/use-app-store";
import { getCompany, studentsForSupervisor } from "@/lib/selectors";
import { PageHeader } from "@/components/portal/layout/page-header";
import { SectionCard } from "@/components/portal/shared/section-card";
import { StatCard } from "@/components/portal/shared/stat-card";
import { DataTable, type Column } from "@/components/portal/shared/data-table";
import { EmptyState } from "@/components/portal/shared/empty-state";
import { Avatar } from "@/components/portal/shared/avatar";
import { Badge } from "@/components/portal/shared/badges";
import { MobileListCard } from "@/components/portal/shared/mobile-list-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  UserSquare2,
  Users,
  Building2,
  MessageSquare,
} from "lucide-react";

interface Row {
  id: string;
  name: string;
  email: string;
  title: string;
  department: string;
  capacity: number;
  companyId: string;
  companyName: string;
  interns: number;
  status: "active" | "inactive";
}

export function SupervisorsList() {
  const navigate = useAppStore((s) => s.navigate);
  const supervisors = useAppStore((s) => s.supervisors);
  const companies = useAppStore((s) => s.companies);
  const students = useAppStore((s) => s.students);

  const [search, setSearch] = React.useState("");

  const rows: Row[] = React.useMemo(() => {
    return supervisors
      .map((sup) => {
        const company = getCompany(companies, sup.companyId);
        const interns = studentsForSupervisor(students, sup.id).length;
        return {
          id: sup.id,
          name: sup.name,
          email: sup.email,
          title: sup.title,
          department: sup.department,
          capacity: sup.capacity,
          companyId: sup.companyId,
          companyName: company?.name ?? "—",
          interns,
          status: sup.status,
        };
      })
      .filter((r) => {
        if (!search) return true;
        const q = search.toLowerCase();
        return (
          r.name.toLowerCase().includes(q) ||
          r.email.toLowerCase().includes(q) ||
          r.companyName.toLowerCase().includes(q) ||
          r.title.toLowerCase().includes(q) ||
          r.department.toLowerCase().includes(q)
        );
      });
  }, [supervisors, companies, students, search]);

  const columns: Column<Row>[] = [
    {
      key: "name",
      header: "Supervisor",
      sortValue: (r) => r.name,
      cell: (r) => (
        <div className="flex items-center gap-2.5">
          <Avatar name={r.name} size="sm" />
          <div className="min-w-0">
            <div className="truncate text-sm font-medium text-foreground">{r.name}</div>
            <div className="truncate text-xs text-muted-foreground">{r.title}</div>
          </div>
        </div>
      ),
    },
    {
      key: "company",
      header: "Company",
      sortValue: (r) => r.companyName,
      hideOnMobile: true,
      cell: (r) => <span className="text-sm text-muted-foreground">{r.companyName}</span>,
    },
    {
      key: "interns",
      header: "Load",
      sortValue: (r) => r.interns,
      align: "center",
      cell: (r) => (
        <span className="inline-flex h-7 min-w-7 items-center justify-center rounded-full bg-muted px-2 text-xs font-semibold tabular-nums">
          {r.interns}/{r.capacity}
        </span>
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
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              aria-label="Supervisor actions"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
            <DropdownMenuItem
              onClick={() =>
                navigate("coordinator.supervisor-view", { supervisorId: r.id })
              }
            >
              <Eye className="h-4 w-4" />
              View
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() =>
                navigate("coordinator.messages", { supervisorId: r.id })
              }
            >
              <MessageSquare className="h-4 w-4" />
              Message
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() =>
                navigate("coordinator.supervisor-new", { supervisorId: r.id })
              }
            >
              <Pencil className="h-4 w-4" />
              Edit
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Supervisors"
        description={`${supervisors.length} supervisors across ${companies.length} companies.`}
        breadcrumb="Supervisors"
        actions={
          <Button onClick={() => navigate("coordinator.supervisor-new")} className="w-full sm:w-auto">
            <Plus className="h-4 w-4" />
            Add Supervisor
          </Button>
        }
      />

      <SectionCard noPadding contentClassName="p-0">
        <div className="border-b border-border p-4">
          <div className="relative w-full max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by name or company…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        <DataTable
          columns={columns}
          rows={rows}
          getRowId={(r) => r.id}
          onRowClick={(r) =>
            navigate("coordinator.supervisor-view", { supervisorId: r.id })
          }
          defaultSortKey="name"
          defaultSortDir="asc"
          mobileCard={(r) => (
            <MobileListCard
              title={r.name}
              subtitle={`${r.title} · ${r.department}`}
              status={
                <Badge tone={r.status === "active" ? "emerald" : "slate"}>
                  {r.status === "active" ? "Active" : "Inactive"}
                </Badge>
              }
              meta={`${r.companyName} · ${r.interns}/${r.capacity} interns`}
              leading={<Avatar name={r.name} size="sm" />}
              onClick={() =>
                navigate("coordinator.supervisor-view", { supervisorId: r.id })
              }
            />
          )}
          emptyState={
            <EmptyState
              icon={UserSquare2}
              title="No supervisors found"
              description="Add a company supervisor to start managing interns."
              actionLabel="Add Supervisor"
              onAction={() => navigate("coordinator.supervisor-new")}
              tone="amber"
            />
          }
        />
      </SectionCard>

      {/* Quick stats footer — §2.6 grid: 2-up on phone, 4-up sm+. */}
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        <StatCard
          label="Total"
          value={supervisors.length}
          icon={UserSquare2}
          tone="teal"
          compact
        />
        <StatCard
          label="Active"
          value={supervisors.filter((s) => s.status === "active").length}
          icon={Building2}
          tone="emerald"
          compact
        />
        <StatCard
          label="Interns Assigned"
          value={students.filter((s) => s.supervisorId).length}
          icon={Users}
          tone="amber"
          compact
        />
        <StatCard
          label="Companies"
          value={companies.length}
          icon={Building2}
          tone="slate"
          compact
        />
      </div>
    </div>
  );
}
