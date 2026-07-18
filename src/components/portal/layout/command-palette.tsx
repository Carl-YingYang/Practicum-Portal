"use client";

import * as React from "react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import { useAppStore } from "@/store/use-app-store";
import { navConfig, getNavIcon } from "@/lib/nav";
import { getCompany } from "@/lib/selectors";
import { Avatar } from "@/components/portal/shared/avatar";
import {
  Users,
  UserSquare2,
  ArrowRight,
  Moon,
  Sun,
  LogOut,
  CornerDownLeft,
  Timer,
  FileDown,
  Keyboard,
} from "lucide-react";
import { useTheme } from "next-themes";
import { ROLE_LABELS, type Role } from "@/lib/types";

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Role-aware global command palette (⌘K / Ctrl+K).
 *
 * - Coordinator: searches students + supervisors by name/number/email, plus
 *   quick navigation and theme/logout actions.
 * - Supervisor: quick navigation + their interns.
 * - Student: quick navigation + theme/logout actions.
 *
 * Replaces the previous inert topbar search box.
 */
export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const currentUser = useAppStore((s) => s.currentUser);
  const students = useAppStore((s) => s.students);
  const supervisors = useAppStore((s) => s.supervisors);
  const companies = useAppStore((s) => s.companies);
  const navigate = useAppStore((s) => s.navigate);
  const logout = useAppStore((s) => s.logout);
  const setShortcutsOpen = useAppStore((s) => s.setShortcutsOpen);
  const { theme, setTheme } = useTheme();

  const role = currentUser?.role;
  if (!role || !currentUser) return null;

  const run = (fn: () => void) => {
    fn();
    onOpenChange(false);
  };

  const navItems = navConfig[role];

  // Build searchable people (coordinator sees everyone; supervisor sees own interns)
  const peopleResults: {
    id: string;
    label: string;
    sub: string;
    keywords: string;
    onSelect: () => void;
    type: "student" | "supervisor";
  }[] = [];

  if (role === "coordinator") {
    students.forEach((s) => {
      const company = getCompany(companies, s.companyId);
      peopleResults.push({
        id: s.id,
        label: s.name,
        sub: `${s.studentNumber} · ${s.course} · ${company?.name ?? "—"}`,
        keywords: `${s.name} ${s.studentNumber} ${s.email} ${s.course} ${company?.name ?? ""} student`,
        onSelect: () => navigate("coordinator.student-view", { studentId: s.id }),
        type: "student",
      });
    });
    supervisors.forEach((sup) => {
      const company = getCompany(companies, sup.companyId);
      peopleResults.push({
        id: sup.id,
        label: sup.name,
        sub: `${sup.email} · ${company?.name ?? "—"}`,
        keywords: `${sup.name} ${sup.email} ${company?.name ?? ""} supervisor`,
        onSelect: () => navigate("coordinator.supervisor-view", { supervisorId: sup.id }),
        type: "supervisor",
      });
    });
  } else if (role === "supervisor" && currentUser.supervisorId) {
    students
      .filter((s) => s.supervisorId === currentUser.supervisorId)
      .forEach((s) => {
        const company = getCompany(companies, s.companyId);
        peopleResults.push({
          id: s.id,
          label: s.name,
          sub: `${s.studentNumber} · ${s.course} · ${company?.name ?? "—"}`,
          keywords: `${s.name} ${s.studentNumber} ${s.email} intern`,
          onSelect: () => navigate("supervisor.intern-view", { studentId: s.id }),
          type: "student",
        });
      });
  }

  return (
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Command palette"
      description="Search people or jump to a page. Press Enter to select."
      className="sm:max-w-xl"
    >
      <CommandInput placeholder="Search students, supervisors, or jump to…" />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>

        {/* Quick navigation */}
        <CommandGroup heading="Navigation">
          {navItems.map((item) => {
            const Icon = getNavIcon(item.icon);
            return (
              <CommandItem
                key={item.key}
                value={`go ${item.label} ${item.key} navigation page`}
                onSelect={() => run(() => navigate(item.view))}
              >
                <Icon className="h-4 w-4 text-muted-foreground" />
                <span>{item.label}</span>
                <CommandShortcut>Go</CommandShortcut>
              </CommandItem>
            );
          })}
        </CommandGroup>

        {/* People search (coordinator + supervisor) */}
        {peopleResults.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup
              heading={
                role === "coordinator"
                  ? "People (students & supervisors)"
                  : "My interns"
              }
            >
              {peopleResults.slice(0, 40).map((p) => (
                <CommandItem
                  key={`${p.type}-${p.id}`}
                  value={p.keywords}
                  onSelect={() => run(p.onSelect)}
                >
                  <Avatar name={p.label} size="sm" />
                  <div className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-sm font-medium">{p.label}</span>
                    <span className="truncate font-mono text-[11px] text-muted-foreground">
                      {p.sub}
                    </span>
                  </div>
                  {p.type === "student" ? (
                    <Users className="h-3.5 w-3.5 text-muted-foreground" />
                  ) : (
                    <UserSquare2 className="h-3.5 w-3.5 text-muted-foreground" />
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        {/* Quick actions */}
        <CommandSeparator />
        <CommandGroup heading="Actions">
          {role === "supervisor" && (
            <>
              <CommandItem
                value="new evaluation create rate"
                onSelect={() => run(() => navigate("supervisor.evaluation-new"))}
              >
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
                <span>Create new evaluation</span>
              </CommandItem>
              <CommandItem
                value="export time log report pdf sessions hours"
                onSelect={() => run(() => navigate("supervisor.reports"))}
              >
                <Timer className="h-4 w-4 text-muted-foreground" />
                <span>Export Time Log Report</span>
                <CommandShortcut>PDF</CommandShortcut>
              </CommandItem>
            </>
          )}
          {role === "student" && (
            <>
              <CommandItem
                value="new journal create entry weekly"
                onSelect={() => run(() => navigate("student.journal-new"))}
              >
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
                <span>Create new journal</span>
              </CommandItem>
              <CommandItem
                value="export time log report pdf sessions hours"
                onSelect={() => run(() => navigate("student.reports"))}
              >
                <Timer className="h-4 w-4 text-muted-foreground" />
                <span>Export my Time Log Report</span>
                <CommandShortcut>PDF</CommandShortcut>
              </CommandItem>
            </>
          )}
          {role === "coordinator" && (
            <>
              <CommandItem
                value="add student create new"
                onSelect={() => run(() => navigate("coordinator.student-new"))}
              >
                <Users className="h-4 w-4 text-muted-foreground" />
                <span>Add student</span>
              </CommandItem>
              <CommandItem
                value="add supervisor create new"
                onSelect={() => run(() => navigate("coordinator.supervisor-new"))}
              >
                <UserSquare2 className="h-4 w-4 text-muted-foreground" />
                <span>Add supervisor</span>
              </CommandItem>
              <CommandItem
                value="export cohort time log report pdf sessions hours"
                onSelect={() => run(() => navigate("coordinator.reports"))}
              >
                <Timer className="h-4 w-4 text-muted-foreground" />
                <span>Export Cohort Time Log Report</span>
                <CommandShortcut>PDF</CommandShortcut>
              </CommandItem>
              <CommandItem
                value="export all evaluations bundle pdf"
                onSelect={() => run(() => navigate("coordinator.reports"))}
              >
                <FileDown className="h-4 w-4 text-muted-foreground" />
                <span>Export All Evaluations (bundle)</span>
                <CommandShortcut>PDF</CommandShortcut>
              </CommandItem>
            </>
          )}
          <CommandItem
            value="toggle theme dark light mode"
            onSelect={() => run(() => setTheme(theme === "dark" ? "light" : "dark"))}
          >
            {theme === "dark" ? (
              <Sun className="h-4 w-4 text-muted-foreground" />
            ) : (
              <Moon className="h-4 w-4 text-muted-foreground" />
            )}
            <span>Toggle {theme === "dark" ? "light" : "dark"} mode</span>
          </CommandItem>
          <CommandItem
            value="sign out logout"
            onSelect={() => run(logout)}
          >
            <LogOut className="h-4 w-4 text-muted-foreground" />
            <span>Sign out</span>
          </CommandItem>
          <CommandItem
            value="keyboard shortcuts help ? keys"
            onSelect={() => run(() => setShortcutsOpen(true))}
          >
            <Keyboard className="h-4 w-4 text-muted-foreground" />
            <span>Keyboard shortcuts</span>
            <CommandShortcut>?</CommandShortcut>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />
        <div className="flex items-center justify-between px-3 py-2 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <CornerDownLeft className="h-3 w-3" /> to select
          </span>
          <span>Signed in as {ROLE_LABELS[role as Role]}</span>
        </div>
      </CommandList>
    </CommandDialog>
  );
}
