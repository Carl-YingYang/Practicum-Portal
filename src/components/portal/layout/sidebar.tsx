"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/use-app-store";
import { navConfig, getNavIcon, secondaryNavItems } from "@/lib/nav";
import { ROLE_LABELS, type Role, type ViewKey } from "@/lib/types";
import { Avatar } from "@/components/portal/shared/avatar";
import { Button } from "@/components/ui/button";
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
  PanelLeftOpen,
  ChevronRight,
} from "lucide-react";
import { unreadConversationCount } from "@/lib/selectors";

interface SidebarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
}

/**
 * Sidebar — desktop left navigation.
 *
 * Brand block + primary nav + (compact) current-user row at the bottom.
 * No duplicate avatar in the header — the user identity lives in ONE place:
 * the footer profile row. Flex layout fills the height so there's no dead
 * space between the nav and the profile.
 */
export function Sidebar({ collapsed, onToggleCollapse }: SidebarProps) {
  const role = useAppStore((s) => s.currentUser?.role) as Role | undefined;
  const view = useAppStore((s) => s.view);
  const navigate = useAppStore((s) => s.navigate);
  const currentUser = useAppStore((s) => s.currentUser);
  const students = useAppStore((s) => s.students);
  const evaluations = useAppStore((s) => s.evaluations);
  const journals = useAppStore((s) => s.journals);
  const conversations = useAppStore((s) => s.conversations);
  const readConversationIds = useAppStore((s) => s.readConversationIds);

  if (!role || !currentUser) return null;

  const items = navConfig[role];

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
    if (badgeKey === "unreadMessages") {
      return unreadConversationCount(
        conversations,
        currentUser.id,
        readConversationIds
      );
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
        collapsed ? "w-[68px]" : "w-[240px]"
      )}
    >
      {/* Brand block — NO avatar here. User identity lives in the footer.
          Single source of truth: the footer profile row has the only avatar. */}
      <div className="flex h-14 shrink-0 items-center gap-2.5 border-b border-sidebar-border px-3.5">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground elev-sm">
          <GraduationCap className="h-[18px] w-[18px]" strokeWidth={2.2} />
        </div>
        {!collapsed && (
          <div className="min-w-0 flex-1">
            <p className="truncate font-heading text-sm font-bold leading-tight text-sidebar-foreground">
              Practicum Portal
            </p>
          </div>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleCollapse}
          className="hidden h-9 w-9 text-muted-foreground hover:text-foreground lg:flex"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? (
            <PanelLeftOpen className="h-4 w-4" />
          ) : (
            <PanelLeftClose className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Primary nav — flex-1 so it fills space, pushing the footer down
          naturally (no dead gap). Per §1.6: nav items min-h-11 px-3 rounded-xl,
          active = bg-primary/10 text-primary (filled pill). */}
      <ScrollArea className="flex-1">
        <nav className="space-y-0.5 p-2">
          {items.map((item) => {
            const Icon = getNavIcon(item.icon);
            const active = view === item.view;
            const badge = badgeFor(item.badgeKey);
            return (
              <button
                key={item.key}
                onClick={() => navigate(item.view)}
                title={collapsed ? item.label : undefined}
                className={cn(
                  "group relative flex min-h-11 w-full items-center gap-2.5 rounded-xl px-3 text-sm font-medium transition-colors duration-150",
                  collapsed && "justify-center px-0",
                  active
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                )}
              >
                <Icon
                  className={cn(
                    "h-[18px] w-[18px] shrink-0 transition-colors",
                    active
                      ? "text-primary"
                      : "text-muted-foreground group-hover:text-foreground"
                  )}
                  strokeWidth={active ? 2.2 : 2}
                />
                {!collapsed && <span className="truncate">{item.label}</span>}
                {!collapsed && badge !== undefined && badge > 0 && (
                  <span
                    className={cn(
                      "ml-auto flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-xs font-semibold tabular-nums",
                      active
                        ? "bg-primary text-primary-foreground"
                        : "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
                    )}
                  >
                    {badge}
                  </span>
                )}
                {collapsed && badge !== undefined && badge > 0 && (
                  <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500 px-1 text-xs font-bold leading-none text-white ring-2 ring-sidebar">
                    {badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </ScrollArea>

      {/* Footer — single source of truth for the current user (§2.11).
          ONE avatar only; flex items-center gap-3 min-w-0 so name/email can
          truncate; initials come from selectors.ts (first+last word).
          Tappable row, min-h-11 touch target. */}
      <div className="shrink-0 border-t border-sidebar-border p-2">
        <button
          onClick={goProfile}
          title={collapsed ? currentUser.name : undefined}
          className={cn(
            "group flex min-h-11 w-full items-center gap-3 rounded-xl px-2 text-left transition-colors hover:bg-muted/60",
            collapsed && "justify-center px-0"
          )}
        >
          <Avatar name={currentUser.name} size="sm" color={currentUser.avatarColor} />
          {!collapsed && (
            <>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold leading-tight text-sidebar-foreground">
                  {currentUser.name}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {ROLE_LABELS[role]}
                </p>
              </div>
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/60 group-hover:text-foreground" />
            </>
          )}
        </button>
      </div>
    </aside>
  );
}

/**
 * MobileSidebar — the mobile drawer.
 *
 * On mobile, primary navigation lives in the bottom tab bar. This drawer
 * carries the SECONDARY items (reports, messages, forms, evaluations) plus
 * all primary items too (so it's a full nav fallback). Header is clean:
 * logo + title + role subtitle + close X. NO avatar in the header — the
 * user identity lives in the footer profile card (single source of truth).
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
  const conversations = useAppStore((s) => s.conversations);
  const readConversationIds = useAppStore((s) => s.readConversationIds);
  if (!role || !currentUser) return null;

  const allItems = navConfig[role];
  const secondaryItems = secondaryNavItems[role] ?? [];
  const primaryItems = allItems.filter(
    (item) => !secondaryItems.some((s) => s.key === item.key)
  );

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
    if (badgeKey === "unreadMessages") {
      return unreadConversationCount(
        conversations,
        currentUser.id,
        readConversationIds
      );
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

  const renderItem = (item: typeof allItems[number]) => {
    const Icon = getNavIcon(item.icon);
    const active = view === item.view;
    const badge = badgeFor(item.badgeKey);
    return (
      <button
        key={item.key}
        onClick={() => handleNavigate(item.view)}
        aria-current={active ? "page" : undefined}
        className={cn(
          "group relative flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-sm font-medium transition-colors",
          active
            ? "bg-primary/10 text-primary"
            : "text-muted-foreground active:bg-muted/60"
        )}
      >
        <Icon
          className={cn(
            "h-[18px] w-[18px] shrink-0",
            active ? "text-primary" : "text-muted-foreground"
          )}
          strokeWidth={active ? 2.3 : 2}
        />
        <span className="min-w-0 flex-1 truncate text-left">{item.label}</span>
        {badge !== undefined && badge > 0 && (
          <span
            className={cn(
              "flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-xs font-semibold tabular-nums",
              active
                ? "bg-primary text-primary-foreground"
                : "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
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
        className="flex w-[280px] flex-col p-0"
        style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
      >
        {/* Clean header — logo + title + role. NO avatar (footer is single source). */}
        <SheetHeader className="space-y-0 border-b border-sidebar-border px-4 py-4">
          <SheetTitle className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground elev-sm">
              <GraduationCap className="h-[18px] w-[18px]" strokeWidth={2.2} />
            </div>
            <div className="min-w-0 flex-1">
              <span className="block font-heading text-base font-bold leading-tight">
                Practicum Portal
              </span>
              <span className="block text-xs font-normal text-muted-foreground">
                {ROLE_LABELS[role]} workspace
              </span>
            </div>
          </SheetTitle>
        </SheetHeader>

        {/* Nav — flex-1 fills space, no dead gap before the footer. */}
        <ScrollArea className="flex-1">
          <div className="px-3 py-3">
            <p className="px-2 pb-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Primary
            </p>
            <nav className="space-y-0.5" aria-label="Primary sections">
              {primaryItems.map(renderItem)}
            </nav>

            {secondaryItems.length > 0 && (
              <>
                <p className="px-2 pb-1.5 pt-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  More
                </p>
                <nav className="space-y-0.5" aria-label="More sections">
                  {secondaryItems.map(renderItem)}
                </nav>
              </>
            )}
          </div>
        </ScrollArea>

        {/* Footer profile — single source of truth for the user (§2.11).
            ONE avatar, flex items-center gap-3 min-w-0, name+role truncate. */}
        <div
          className="shrink-0 border-t border-sidebar-border p-3"
          style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 12px)" }}
        >
          <button
            onClick={goProfile}
            className="flex min-h-11 w-full items-center gap-3 rounded-xl px-2 py-2 text-left transition-colors hover:bg-muted/60"
          >
            <Avatar name={currentUser.name} size="md" color={currentUser.avatarColor} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold leading-tight">
                {currentUser.name}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {ROLE_LABELS[role]}
              </p>
            </div>
            <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/60" />
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
