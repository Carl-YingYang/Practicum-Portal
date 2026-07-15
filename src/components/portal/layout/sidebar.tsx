"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/use-app-store";
import { navConfig, getNavIcon, secondaryNavItems } from "@/lib/nav";
import { ROLE_LABELS, type Role, type NavItem, type ViewKey } from "@/lib/types";
import { Avatar } from "@/components/portal/shared/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  GraduationCap,
  PanelLeftClose,
  ChevronRight,
} from "lucide-react";

interface SidebarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
}

/**
 * Group nav items by their `section` field, preserving order. Items without a
 * section are collected under undefined (rendered first, no label).
 */
function groupBySection(items: NavItem[]): { section: string | undefined; items: NavItem[] }[] {
  const groups: { section: string | undefined; items: NavItem[] }[] = [];
  for (const item of items) {
    const last = groups[groups.length - 1];
    if (last && last.section === item.section) {
      last.items.push(item);
    } else {
      groups.push({ section: item.section, items: [item] });
    }
  }
  return groups;
}

/**
 * Sidebar — desktop left navigation.
 *
 * Professional, Untitled-UI-inspired layout:
 *   - Brand block (clickable = collapse toggle)
 *   - Grouped nav with uppercase section labels
 *   - Subtle active state (white tint + left accent bar)
 *   - Compact user row at the bottom
 */
export function Sidebar({ collapsed, onToggleCollapse }: SidebarProps) {
  const role = useAppStore((s) => s.currentUser?.role) as Role | undefined;
  const view = useAppStore((s) => s.view);
  const navigate = useAppStore((s) => s.navigate);
  const currentUser = useAppStore((s) => s.currentUser);
  const students = useAppStore((s) => s.students);
  const evaluations = useAppStore((s) => s.evaluations);
  const journals = useAppStore((s) => s.journals);
  const schoolIdentity = useAppStore((s) => s.schoolIdentity);
  const hasLogo = !!schoolIdentity.logoDataUrl;

  if (!role || !currentUser) return null;

  const items = navConfig[role];
  const grouped = groupBySection(items);

  const badgeFor = (badgeKey?: string): number | undefined => {
    if (!badgeKey) return undefined;
    if (badgeKey === "pendingEvaluations") {
      return students
        .filter((s) => s.supervisorId === currentUser.supervisorId)
        .filter(
          (s) =>
            !evaluations.some(
              (e) =>
                e.studentId === s.id &&
                e.status === "submitted" &&
                e.supervisorId === currentUser.supervisorId
            )
        ).length;
    }
    if (badgeKey === "pendingJournals") {
      const internIds = new Set(
        students
          .filter((s) => s.supervisorId === currentUser.supervisorId)
          .map((s) => s.id)
      );
      return journals.filter(
        (j) => j.status === "pending" && internIds.has(j.studentId)
      ).length;
    }
    if (badgeKey === "unassignedStudents") {
      return students.filter((s) => !s.supervisorId).length;
    }
    return undefined;
  };

  const goProfile = () => {
    if (role === "student") navigate("student.profile");
    else if (role === "supervisor") navigate("supervisor.profile");
    else if (role === "coordinator") navigate("coordinator.profile");
  };

  return (
    <aside
      className={cn(
        "flex h-full flex-col border-r border-sidebar-border bg-sidebar transition-[width] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]",
        collapsed ? "w-[68px]" : "w-[248px]"
      )}
    >
      {/* Brand block — clickable to toggle collapse. Sharper: thinner icon
          ring, tighter label hierarchy, cleaner collapse affordance. */}
      <button
        onClick={onToggleCollapse}
        className="group relative flex h-14 w-full shrink-0 items-center gap-2.5 border-b border-sidebar-border px-3.5 transition-colors hover:bg-white/[0.06]"
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-[5px] bg-white/15 ring-1 ring-white/20 transition-transform duration-200 group-hover:scale-[1.04]">
          {hasLogo ? (
             
            <img
              src={schoolIdentity.logoDataUrl}
              alt={`${schoolIdentity.name} logo`}
              className="h-full w-full rounded-[5px] object-contain p-0.5"
            />
          ) : (
            <GraduationCap className="h-[16px] w-[16px] text-sidebar-primary" strokeWidth={2.4} />
          )}
        </div>
        {!collapsed && (
          <div className="min-w-0 flex-1 text-left">
            <p className="truncate text-[14px] font-bold leading-tight tracking-[-0.01em] text-sidebar-foreground">
              {schoolIdentity.name}
            </p>
            <p className="truncate text-[9.5px] font-semibold uppercase tracking-[0.12em] text-sidebar-foreground/40">
              {schoolIdentity.tagline}
            </p>
          </div>
        )}
        <PanelLeftClose
          className={cn(
            "h-[15px] w-[15px] shrink-0 text-sidebar-foreground/35 transition-opacity",
            collapsed ? "opacity-0" : "opacity-100 group-hover:text-sidebar-foreground/55"
          )}
          strokeWidth={2.2}
        />
      </button>

      {/* Grouped nav — section labels + crisper active states. */}
      <ScrollArea className="flex-1">
        <div className={cn("py-2", collapsed ? "px-2" : "px-2")}>
          {grouped.map((group, gi) => (
            <div key={gi} className={cn(gi > 0 && "mt-4")}>
              {/* Section label — hidden when collapsed */}
              {!collapsed && group.section && (
                <p className="px-2.5 pb-1 pt-1 text-[9.5px] font-semibold uppercase tracking-[0.12em] text-sidebar-foreground/35">
                  {group.section}
                </p>
              )}
              {collapsed && gi > 0 && (
                <div className="mx-2 my-2 border-t border-sidebar-border/50" />
              )}
              <nav className="space-y-px">
                {group.items.map((item) => {
                  const Icon = getNavIcon(item.icon);
                  const active = view === item.view;
                  const badge = badgeFor(item.badgeKey);
                  return (
                    <button
                      key={item.key}
                      onClick={() => navigate(item.view)}
                      title={collapsed ? item.label : undefined}
                      className={cn(
                        "group relative flex h-8 w-full items-center gap-2.5 rounded-[5px] text-[13px] font-medium transition-all duration-150",
                        collapsed ? "justify-center px-0" : "px-2.5",
                        active
                          ? "bg-white/[0.14] text-sidebar-foreground"
                          : "text-sidebar-foreground/60 hover:bg-white/[0.06] hover:text-sidebar-foreground/90"
                      )}
                    >
                      {/* Left accent bar for active state — crisp, full-row height */}
                      {active && (
                        <span className="absolute left-0 top-1/2 h-[18px] w-[2.5px] -translate-y-1/2 rounded-r-[2px] bg-sidebar-primary" />
                      )}
                      <Icon
                        className={cn(
                          "h-[16px] w-[16px] shrink-0 transition-colors",
                          active
                            ? "text-sidebar-primary"
                            : "text-sidebar-foreground/50 group-hover:text-sidebar-foreground/75"
                        )}
                        strokeWidth={active ? 2.3 : 2}
                      />
                      {!collapsed && <span className="truncate">{item.label}</span>}
                      {!collapsed && badge !== undefined && badge > 0 && (
                        <span
                          className={cn(
                            "ml-auto flex h-[17px] min-w-[17px] items-center justify-center rounded-full px-1.5 text-[10.5px] font-semibold tabular-nums leading-none",
                            active
                              ? "bg-sidebar-primary text-sidebar-primary-foreground"
                              : "bg-white/12 text-sidebar-foreground/75"
                          )}
                        >
                          {badge}
                        </span>
                      )}
                      {collapsed && badge !== undefined && badge > 0 && (
                        <span className="absolute right-0.5 top-0.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] font-bold leading-none text-white ring-2 ring-sidebar">
                          {badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </nav>
            </div>
          ))}
        </div>
      </ScrollArea>

      {/* Footer — current user. Sharper: thinner top border, tighter row. */}
      <div className="shrink-0 border-t border-sidebar-border p-1.5">
        <button
          onClick={goProfile}
          title={collapsed ? currentUser.name : undefined}
          className={cn(
            "group flex h-9 w-full items-center gap-2.5 rounded-[5px] px-2 text-left transition-colors hover:bg-white/[0.06]",
            collapsed && "justify-center px-0"
          )}
        >
          <Avatar name={currentUser.name} size="sm" color={currentUser.avatarColor} />
          {!collapsed && (
            <>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[12.5px] font-semibold leading-tight text-sidebar-foreground">
                  {currentUser.name}
                </p>
                <p className="truncate text-[10.5px] font-medium uppercase tracking-[0.06em] text-sidebar-foreground/40">
                  {ROLE_LABELS[role]}
                </p>
              </div>
              <ChevronRight className="h-3.5 w-3.5 shrink-0 text-sidebar-foreground/35 transition-transform group-hover:translate-x-0.5 group-hover:text-sidebar-foreground/60" />
            </>
          )}
        </button>
      </div>
    </aside>
  );
}

/**
 * MobileSidebar — the mobile drawer.
 */
export function MobileSidebar({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const role = useAppStore((s) => s.currentUser?.role) as Role | undefined;
  const view = useAppStore((s) => s.view);
  const navigate = useAppStore((s) => s.navigate);
  const currentUser = useAppStore((s) => s.currentUser);
  const students = useAppStore((s) => s.students);
  const evaluations = useAppStore((s) => s.evaluations);
  const journals = useAppStore((s) => s.journals);
  const schoolIdentity = useAppStore((s) => s.schoolIdentity);
  if (!role || !currentUser) return null;

  const allItems = navConfig[role];
  const secondaryItems = secondaryNavItems[role] ?? [];
  const primaryItems = allItems.filter(
    (item) => !secondaryItems.some((s) => s.key === item.key)
  );
  const groupedPrimary = groupBySection(primaryItems);
  const badgeFor = (badgeKey?: string): number | undefined => {
    if (!badgeKey) return undefined;
    if (badgeKey === "pendingEvaluations") {
      return students
        .filter((s) => s.supervisorId === currentUser.supervisorId)
        .filter(
          (s) =>
            !evaluations.some(
              (e) =>
                e.studentId === s.id &&
                e.status === "submitted" &&
                e.supervisorId === currentUser.supervisorId
            )
        ).length;
    }
    if (badgeKey === "pendingJournals") {
      const internIds = new Set(
        students
          .filter((s) => s.supervisorId === currentUser.supervisorId)
          .map((s) => s.id)
      );
      return journals.filter(
        (j) => j.status === "pending" && internIds.has(j.studentId)
      ).length;
    }
    if (badgeKey === "unassignedStudents") {
      return students.filter((s) => !s.supervisorId).length;
    }
    return undefined;
  };

  const handleNavigate = (target: ViewKey) => {
    navigate(target);
    onOpenChange(false);
  };

  const goProfile = () => {
    if (role === "student") handleNavigate("student.profile");
    else if (role === "supervisor") handleNavigate("supervisor.profile");
    else if (role === "coordinator") handleNavigate("coordinator.profile");
  };

  const renderItem = (item: NavItem) => {
    const Icon = getNavIcon(item.icon);
    const active = view === item.view;
    const badge = badgeFor(item.badgeKey);
    return (
      <button
        key={item.key}
        onClick={() => handleNavigate(item.view)}
        aria-current={active ? "page" : undefined}
        className={cn(
          "group relative flex h-10 w-full items-center gap-3 rounded-md px-3 text-sm font-medium transition-colors",
          active
            ? "bg-white/12 text-sidebar-foreground"
            : "text-sidebar-foreground/65 active:bg-white/8"
        )}
      >
        {active && (
          <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-sidebar-primary" />
        )}
        <Icon
          className={cn(
            "h-[18px] w-[18px] shrink-0",
            active ? "text-sidebar-primary" : "text-sidebar-foreground/55"
          )}
          strokeWidth={active ? 2.3 : 2}
        />
        <span className="min-w-0 flex-1 truncate text-left">{item.label}</span>
        {badge !== undefined && badge > 0 && (
          <span
            className={cn(
              "flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-xs font-semibold tabular-nums",
              active
                ? "bg-sidebar-primary text-sidebar-primary-foreground"
                : "bg-white/12 text-sidebar-foreground/80"
            )}
          >
            {badge}
          </span>
        )}
      </button>
    );
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="left"
        className="flex w-[280px] flex-col border-r-0 bg-sidebar p-0"
        style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
      >
        <SheetHeader className="space-y-0 border-b border-sidebar-border px-4 py-4">
          <SheetTitle className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-md bg-white/15 ring-1 ring-white/20">
              {schoolIdentity.logoDataUrl ? (
                <img
                  src={schoolIdentity.logoDataUrl}
                  alt={`${schoolIdentity.name} logo`}
                  className="h-full w-full rounded-md object-contain p-0.5"
                />
              ) : (
                <GraduationCap className="h-[18px] w-[18px] text-sidebar-primary" strokeWidth={2.2} />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <span className="block truncate font-heading text-base font-bold leading-tight text-sidebar-foreground">
                {schoolIdentity.name}
              </span>
              <span className="block truncate text-xs font-normal text-sidebar-foreground/55">
                {ROLE_LABELS[role]} workspace
              </span>
            </div>
          </SheetTitle>
        </SheetHeader>

        <ScrollArea className="flex-1">
          <div className="px-2.5 py-3">
            {groupedPrimary.map((group, gi) => (
              <div key={gi} className={gi > 0 ? "mt-4" : ""}>
                {group.section && (
                  <p className="px-2.5 pb-1 pt-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-sidebar-foreground/40">
                    {group.section}
                  </p>
                )}
                <nav className="space-y-0.5" aria-label={group.section ?? "Primary"}>
                  {group.items.map(renderItem)}
                </nav>
              </div>
            ))}

            {secondaryItems.length > 0 && (
              <div className="mt-4">
                <p className="px-2.5 pb-1 pt-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-sidebar-foreground/40">
                  More
                </p>
                <nav className="space-y-0.5" aria-label="More sections">
                  {secondaryItems.map(renderItem)}
                </nav>
              </div>
            )}
          </div>
        </ScrollArea>

        <div
          className="shrink-0 border-t border-sidebar-border p-2.5"
          style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 12px)" }}
        >
          <button
            onClick={goProfile}
            className="flex h-11 w-full items-center gap-3 rounded-md px-2 text-left transition-colors hover:bg-white/8"
          >
            <Avatar name={currentUser.name} size="md" color={currentUser.avatarColor} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold leading-tight text-sidebar-foreground">
                {currentUser.name}
              </p>
              <p className="truncate text-xs text-sidebar-foreground/55">
                {ROLE_LABELS[role]}
              </p>
            </div>
            <ChevronRight className="h-4 w-4 shrink-0 text-sidebar-foreground/40" />
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
