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
} from "@/components/ui/command";
import { useAppStore } from "@/store/use-app-store";
import { navConfig, getNavIcon, secondaryNavItems } from "@/lib/nav";
import type { NavItem, Role, ViewKey } from "@/lib/types";
import {
  LogOut,
  Moon,
  Sun,
  UserCircle,
  Search,
  CornerDownLeft,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { useTheme } from "next-themes";
import { toast } from "sonner";

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Global Cmd/Ctrl+K command palette for quick navigation within the portal.
 *
 * Surfaces every nav destination for the current role, plus a few global
 * actions (toggle theme, sign out, view profile). Fuzzy-filtered by cmdk.
 */
export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const currentUser = useAppStore((s) => s.currentUser);
  const navigate = useAppStore((s) => s.navigate);
  const logout = useAppStore((s) => s.logout);
  const { theme, setTheme } = useTheme();

  const role = currentUser?.role as Role | undefined;

  const items = React.useMemo(() => {
    if (!role) return [];
    const primary = navConfig[role] ?? [];
    const secondary = secondaryNavItems[role] ?? [];
    // Combine, dedupe by view key, preserve section.
    const seen = new Set<string>();
    const merged: (NavItem & { group: string })[] = [];
    for (const it of primary) {
      if (seen.has(it.view)) continue;
      seen.add(it.view);
      merged.push({ ...it, group: it.section ?? "Navigation" });
    }
    for (const it of secondary) {
      if (seen.has(it.view)) continue;
      seen.add(it.view);
      merged.push({ ...it, group: it.section ?? "Navigation" });
    }
    // Add quick actions
    merged.push({
      key: "profile",
      label: "My Profile",
      shortLabel: "Profile",
      view: `${role}.profile` as ViewKey,
      icon: "profile",
      section: "Account",
      group: "Account",
    });
    return merged;
  }, [role]);

  const grouped = React.useMemo(() => {
    const map = new Map<string, (NavItem & { group: string })[]>();
    for (const it of items) {
      const arr = map.get(it.group) ?? [];
      arr.push(it);
      map.set(it.group, arr);
    }
    return Array.from(map.entries());
  }, [items]);

  const handleSelect = React.useCallback(
    (view: ViewKey) => {
      navigate(view);
      onOpenChange(false);
    },
    [navigate, onOpenChange],
  );

  const handleTheme = React.useCallback(() => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    toast.success(`Switched to ${next} mode`);
    onOpenChange(false);
  }, [theme, setTheme, onOpenChange]);

  const handleSignOut = React.useCallback(() => {
    onOpenChange(false);
    logout();
    toast.success("Signed out");
  }, [logout, onOpenChange]);

  if (!role) return null;

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Search pages, actions…" />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        {grouped.map(([group, groupItems]) => (
          <CommandGroup
            key={group}
            heading={group}
            className="[&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-muted-foreground"
          >
            {groupItems.map((item) => {
              const Icon = getNavIcon(item.icon);
              return (
                <CommandItem
                  key={item.view}
                  value={`${item.label} ${item.shortLabel ?? ""} ${item.section ?? ""}`}
                  onSelect={() => handleSelect(item.view)}
                  className="gap-2.5"
                >
                  <span className="flex h-7 w-7 items-center justify-center rounded-md bg-muted/60 text-muted-foreground">
                    <Icon className="h-3.5 w-3.5" />
                  </span>
                  <span className="flex-1 text-sm font-medium">
                    {item.label}
                  </span>
                  {item.shortLabel && (
                    <span className="text-[11px] text-muted-foreground">
                      {item.shortLabel}
                    </span>
                  )}
                </CommandItem>
              );
            })}
          </CommandGroup>
        ))}
        <CommandSeparator />
        <CommandGroup heading="Quick actions">
          <CommandItem onSelect={handleTheme} className="gap-2.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300">
              {theme === "dark" ? (
                <Sun className="h-3.5 w-3.5" />
              ) : (
                <Moon className="h-3.5 w-3.5" />
              )}
            </span>
            <span className="flex-1 text-sm font-medium">
              Toggle {theme === "dark" ? "light" : "dark"} mode
            </span>
          </CommandItem>
          <CommandItem onSelect={handleSignOut} className="gap-2.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300">
              <LogOut className="h-3.5 w-3.5" />
            </span>
            <span className="flex-1 text-sm font-medium">Sign out</span>
          </CommandItem>
        </CommandGroup>
        <CommandSeparator />
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5 px-3 py-2.5 text-[11px] text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <Search className="h-3 w-3" />
            Type to search
          </span>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
            <span className="inline-flex items-center gap-1">
              <kbd className="inline-flex h-4 min-w-4 items-center justify-center rounded border border-border bg-muted px-1 font-mono text-[10px] text-foreground/80">
                <ArrowUp className="h-2.5 w-2.5" />
              </kbd>
              <kbd className="inline-flex h-4 min-w-4 items-center justify-center rounded border border-border bg-muted px-1 font-mono text-[10px] text-foreground/80">
                <ArrowDown className="h-2.5 w-2.5" />
              </kbd>
              navigate
            </span>
            <span className="inline-flex items-center gap-1">
              <kbd className="inline-flex h-4 min-w-4 items-center justify-center rounded border border-border bg-muted px-1 font-mono text-[10px] text-foreground/80">
                <CornerDownLeft className="h-2.5 w-2.5" />
              </kbd>
              open
            </span>
            <span className="inline-flex items-center gap-1">
              <kbd className="inline-flex h-4 items-center justify-center rounded border border-border bg-muted px-1.5 font-mono text-[10px] uppercase text-foreground/80">
                esc
              </kbd>
              close
            </span>
          </div>
        </div>
      </CommandList>
    </CommandDialog>
  );
}

export default CommandPalette;
