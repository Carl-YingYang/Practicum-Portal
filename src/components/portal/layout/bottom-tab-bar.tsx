"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/use-app-store";
import { bottomTabs, getNavIcon } from "@/lib/nav";
import type { Role } from "@/lib/types";

/**
 * BottomTabBar — primary mobile navigation (<lg).
 *
 * Per Responsive Contract §1.4 + §1.6:
 *  - Bar is `h-14` (56px), each tab `flex flex-col items-center justify-center
 *    gap-0.5 min-w-0 flex-1` so 4 tabs share the row evenly.
 *  - Label is `text-xs truncate` (NEVER below 12px).
 *  - Active tab = filled pill `bg-primary/10 text-primary` (not a dot/underline).
 *  - Touch target = full 56px height (≥44px) + tap area covers the whole tab.
 *  - Badge sits on the icon (small enough to not crowd the row).
 */
export function BottomTabBar() {
  const role = useAppStore((s) => s.currentUser?.role) as Role | undefined;
  const view = useAppStore((s) => s.view);
  const navigate = useAppStore((s) => s.navigate);
  const currentUser = useAppStore((s) => s.currentUser);
  const students = useAppStore((s) => s.students);
  const evaluations = useAppStore((s) => s.evaluations);
  const journals = useAppStore((s) => s.journals);

  if (!role || !currentUser) return null;
  const tabs = bottomTabs[role];

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

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-30 border-t border-border/60 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 lg:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      aria-label="Primary"
    >
      <ul
        className="mx-auto grid h-14 max-w-md"
        style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }}
      >
        {tabs.map((tab) => {
          const Icon = getNavIcon(tab.icon);
          // Active when the current view IS the tab's view, OR is a sub-view
          // of it (e.g. student.journal-new highlights the Journals tab).
          const tabPrefix = tab.view.split(".").slice(0, 2).join(".");
          const isActive = view === tab.view || view.startsWith(tabPrefix + ".");
          const badge = badgeFor(tab.badgeKey);
          return (
            <li key={tab.key} className="flex min-w-0">
              <button
                onClick={() => navigate(tab.view)}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "flex h-14 w-full min-w-0 flex-col items-center justify-center gap-0.5 px-1 transition-colors",
                  isActive
                    ? "rounded-xl bg-primary/10 text-primary"
                    : "text-muted-foreground active:bg-muted/40"
                )}
              >
                <span className="relative">
                  <Icon
                    className="h-6 w-6"
                    strokeWidth={isActive ? 2.4 : 2}
                  />
                  {badge !== undefined && badge > 0 && (
                    <span className="absolute -right-2 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-500 px-1 text-xs font-bold leading-none text-white ring-2 ring-background">
                      {badge}
                    </span>
                  )}
                </span>
                <span
                  className={cn(
                    "max-w-full truncate text-xs leading-none",
                    isActive ? "font-semibold" : "font-medium"
                  )}
                >
                  {tab.shortLabel ?? tab.label}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
