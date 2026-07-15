"use client";

import * as React from "react";
import { useAppStore } from "@/store/use-app-store";
import {
  getCategoryMeta,
  useNotifications,
  type NotificationCategory,
} from "@/lib/use-notifications";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Bell, CheckCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export function NotificationsDropdown() {
  const notifications = useNotifications();
  const navigate = useAppStore((s) => s.navigate);
  const open = useAppStore((s) => s.notificationsOpen);
  const setOpen = useAppStore((s) => s.setNotificationsOpen);

  // Track read state locally (resets on reload — purely cosmetic for the MVP).
  const [readIds, setReadIds] = React.useState<Set<string>>(new Set());
  const unreadCount = notifications.filter((n) => !readIds.has(n.id)).length;
  const hasUrgent = notifications.some(
    (n) => n.category === "urgent" && !readIds.has(n.id)
  );

  const markAllRead = React.useCallback(() => {
    setReadIds(new Set(notifications.map((n) => n.id)));
  }, [notifications]);

  const handleAction = (n: (typeof notifications)[number]) => {
    if (n.action) {
      navigate(n.action.view, n.action.params);
    }
    setReadIds((prev) => new Set(prev).add(n.id));
    setOpen(false);
  };

  // Group by category for the dropdown display
  const grouped = React.useMemo(() => {
    const order: NotificationCategory[] = [
      "urgent",
      "approval",
      "info",
      "success",
      "clock",
    ];
    const map = new Map<NotificationCategory, typeof notifications>();
    for (const cat of order) {
      const items = notifications.filter((n) => n.category === cat);
      if (items.length > 0) map.set(cat, items);
    }
    return Array.from(map.entries());
  }, [notifications]);

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button
          className={cn(
            "relative flex h-8 w-8 items-center justify-center rounded-full text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
            hasUrgent && !open && "text-red-500 hover:text-red-600"
          )}
          aria-label={"Notifications" + (unreadCount > 0 ? `, ${unreadCount} unread` : "")}
        >
          <Bell className="h-[16px] w-[16px]" />
          {unreadCount > 0 && (
            <span
              className={cn(
                "absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold leading-none text-white shadow-sm ring-2 ring-background",
                hasUrgent
                  ? "animate-pulse bg-red-500"
                  : "bg-teal-500"
              )}
              aria-hidden="true"
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-[min(92vw,380px)] p-0"
        sideOffset={8}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/70 px-4 py-3">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-foreground">
              Notifications
            </h3>
            {unreadCount > 0 && (
              <span
                className={cn(
                  "rounded-full px-1.5 py-0.5 text-[10px] font-bold",
                  hasUrgent
                    ? "bg-red-50 text-red-600 dark:bg-red-950/50 dark:text-red-400"
                    : "bg-teal-50 text-teal-600 dark:bg-teal-950/50 dark:text-teal-400"
                )}
              >
                {unreadCount} new
              </span>
            )}
          </div>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 gap-1.5 px-2 text-[11px] text-muted-foreground hover:text-foreground"
              onClick={markAllRead}
            >
              <CheckCheck className="h-3.5 w-3.5" />
              Mark all read
            </Button>
          )}
        </div>

        {/* Body */}
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-6 py-10 text-center">
            <span className="mb-2 flex h-11 w-11 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <Bell className="h-5 w-5" />
            </span>
            <p className="text-sm font-medium text-foreground">
              You&apos;re all caught up
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              New activity and pending approvals will show here.
            </p>
          </div>
        ) : (
          <div
            className="max-h-[min(60vh,460px)] overflow-y-auto scroll-area-custom"
            role="list"
            aria-label="Notifications"
          >
            {grouped.map(([category, items]) => {
              const meta = getCategoryMeta(category);
              return (
                <div key={category}>
                  <div className="sticky top-0 z-10 flex items-center gap-1.5 bg-background/95 px-4 py-1.5 backdrop-blur">
                    <span
                      className={cn("h-1.5 w-1.5 rounded-full", meta.dot)}
                      aria-hidden="true"
                    />
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      {meta.label}
                    </span>
                  </div>
                  {items.map((n) => {
                    const Icon = n.icon;
                    const isUnread = !readIds.has(n.id);
                    return (
                      <button
                        key={n.id}
                        type="button"
                        onClick={() => handleAction(n)}
                        className={cn(
                          "group flex w-full items-start gap-3 border-l-2 px-4 py-2.5 text-left transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:bg-muted/60",
                          isUnread
                            ? category === "urgent"
                              ? "border-red-400 bg-red-50/30 dark:bg-red-950/10"
                              : category === "approval"
                              ? "border-amber-400 bg-amber-50/30 dark:bg-amber-950/10"
                              : "border-teal-400 bg-teal-50/20 dark:bg-teal-950/10"
                            : "border-transparent"
                        )}
                        role="listitem"
                      >
                        <span
                          className={cn(
                            "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg",
                            meta.iconBg,
                            meta.iconFg
                          )}
                          aria-hidden="true"
                        >
                          <Icon className="h-3.5 w-3.5" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p
                            className={cn(
                              "text-[13px] leading-snug text-foreground",
                              isUnread && "font-semibold"
                            )}
                          >
                            {n.title}
                          </p>
                          <p className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-muted-foreground">
                            {n.description}
                          </p>
                          {n.action && (
                            <span className="mt-1 inline-flex items-center gap-1 text-[10px] font-medium text-teal-600 opacity-0 transition-opacity group-hover:opacity-100 dark:text-teal-400">
                              {n.action.label} →
                            </span>
                          )}
                        </div>
                        {isUnread && (
                          <span
                            className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-teal-500"
                            aria-label="Unread"
                          />
                        )}
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </div>
        )}

        {/* Footer */}
        {notifications.length > 0 && (
          <div className="border-t border-border/70 px-4 py-2 text-center">
            <p className="text-[10px] text-muted-foreground">
              {notifications.length} total notification
              {notifications.length === 1 ? "" : "s"}
            </p>
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
