"use client";

import * as React from "react";
import { useAppStore } from "@/store/use-app-store";
import { Avatar } from "@/components/portal/shared/avatar";
import { RoleBadge } from "@/components/portal/shared/badges";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Menu,
  Moon,
  Sun,
  LogOut,
  UserCircle,
  ChevronDown,
} from "lucide-react";
import { useTheme } from "next-themes";
import { ROLE_LABELS } from "@/lib/types";
import { mockUsers } from "@/lib/mock-data";
import { viewTitles, roleBreadcrumbs } from "@/lib/nav";
import { NotificationsDropdown } from "./notifications-dropdown";
import { cn } from "@/lib/utils";

interface TopbarProps {
  onOpenMobileNav: () => void;
}

/**
 * Topbar — sticky application header.
 *
 * Professional, Untitled-UI-inspired layout:
 *   - Mobile: hamburger + page title + breadcrumb
 *   - Desktop: page title + breadcrumb on left, actions on right
 *     (notifications, theme, profile menu)
 *
 * Strict 56px row with items-center alignment. Clean dividers between
 * action groups.
 */
export function Topbar({ onOpenMobileNav }: TopbarProps) {
  const currentUser = useAppStore((s) => s.currentUser);
  const view = useAppStore((s) => s.view);
  const navigate = useAppStore((s) => s.navigate);
  const logout = useAppStore((s) => s.logout);
  const loginAs = useAppStore((s) => s.loginAs);
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  const role = currentUser?.role;
  const title = viewTitles[view] ?? "Practo";
  const breadcrumb = role ? roleBreadcrumbs[role] : "";

  return (
    <header
      className="topbar-safe-top sticky top-0 z-30 flex h-14 items-center gap-2 border-b bg-topbar px-3 text-topbar-foreground sm:px-5 lg:px-6"
      style={{ borderBottomColor: "var(--topbar-border)" }}
    >
      {/* Mobile: hamburger */}
      <Button
        variant="ghost"
        size="icon"
        className="-ml-1.5 h-9 w-9 shrink-0 text-topbar-foreground hover:bg-white/10 lg:hidden"
        onClick={onOpenMobileNav}
        aria-label="Open navigation"
      >
        <Menu className="h-[18px] w-[18px]" strokeWidth={2.2} />
      </Button>

      {/* Page title + breadcrumb — visible on ALL breakpoints.
          On mobile it sits next to the hamburger; on desktop it's the leftmost.
          Sharper: tighter leading, uppercase breadcrumb label for a crisper hierarchy. */}
      <div className="flex min-w-0 flex-1 items-center lg:flex-none">
        <div className="min-w-0">
          <p className="truncate text-[14px] font-semibold leading-[1.15] tracking-[-0.01em] text-topbar-foreground">
            {title}
          </p>
          {breadcrumb && (
            <p className="hidden truncate text-[10px] font-medium uppercase leading-tight tracking-[0.1em] text-topbar-foreground/45 sm:block">
              {breadcrumb}
            </p>
          )}
        </div>
      </div>

      {/* Desktop spacer — pushes actions to the right */}
      <div className="hidden flex-1 lg:block" />

      {/* Action group — right side. Tighter gap, crisper dividers. */}
      <div className="flex shrink-0 items-center gap-0.5">
        {/* Notifications */}
        <div className="relative flex items-center">
          <NotificationsDropdown />
        </div>

        {/* Divider — sharper, shorter */}
        <span className="mx-1 hidden h-5 w-px bg-topbar-foreground/20 lg:block" />

        {/* Theme toggle */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          aria-label="Toggle theme"
          className="h-9 w-9 text-topbar-foreground hover:bg-white/10"
        >
          {mounted && theme === "dark" ? (
            <Sun className="h-[17px] w-[17px]" strokeWidth={2.1} />
          ) : (
            <Moon className="h-[17px] w-[17px]" strokeWidth={2.1} />
          )}
        </Button>

        {/* Divider — sharper, shorter */}
        <span className="mx-1 hidden h-5 w-px bg-topbar-foreground/20 lg:block" />

        {/* Profile menu — crisper padding, cleaner focus ring */}
        {currentUser && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="flex h-9 min-w-0 items-center gap-2 rounded-md py-0.5 pl-1 pr-1.5 transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/25"
                aria-label="Open profile menu"
              >
                <Avatar
                  name={currentUser.name}
                  size="sm"
                  color={currentUser.avatarColor}
                />
                <span className="hidden min-w-0 text-left sm:block">
                  <span className="block truncate text-[13px] font-semibold leading-tight text-topbar-foreground">
                    {currentUser.name}
                  </span>
                  <span className="block truncate text-[10px] font-medium uppercase tracking-[0.06em] text-topbar-foreground/50">
                    {role ? ROLE_LABELS[role] : ""}
                  </span>
                </span>
                <ChevronDown className="hidden h-3.5 w-3.5 shrink-0 text-topbar-foreground/50 sm:block" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64 p-1.5">
              <div className="flex items-center justify-between gap-2 px-2 py-1.5">
                <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Signed in as
                </span>
                {role && <RoleBadge role={role} solid />}
              </div>
              <div className="px-2 pb-2">
                <p className="text-sm font-semibold text-foreground">{currentUser.name}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {currentUser.email}
                </p>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => {
                  if (role === "student") navigate("student.profile");
                  else if (role === "supervisor") navigate("supervisor.profile");
                  else if (role === "coordinator") navigate("coordinator.profile");
                }}
                className="gap-2 rounded-md"
              >
                <UserCircle className="h-4 w-4 text-muted-foreground" />
                My profile
              </DropdownMenuItem>

              {/* Demo: switch role */}
              <DropdownMenuSeparator />
              <DropdownMenuLabel className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Demo: switch role
              </DropdownMenuLabel>
              {mockUsers
                .filter((u) => u.role !== role)
                .map((u) => (
                  <DropdownMenuItem
                    key={u.id}
                    onClick={() => loginAs(u.id)}
                    className="gap-2.5 rounded-md"
                  >
                    <Avatar name={u.name} size="sm" color={u.avatarColor} />
                    <span className="flex min-w-0 flex-col">
                      <span className="truncate text-sm">{u.name}</span>
                      <span className="truncate text-xs text-muted-foreground">
                        {ROLE_LABELS[u.role]}
                      </span>
                    </span>
                  </DropdownMenuItem>
                ))}

              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={logout}
                className="gap-2 rounded-md text-destructive focus:text-destructive"
              >
                <LogOut className="h-4 w-4" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </header>
  );
}
