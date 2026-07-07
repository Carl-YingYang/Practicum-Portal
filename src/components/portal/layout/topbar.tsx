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

interface TopbarProps {
  onOpenMobileNav: () => void;
}

/**
 * Topbar — sticky application header.
 *
 * Strict 56px row (mobile) / 64px (sm+) with items-center alignment for all
 * children. No baseline drift.
 *
 * Mobile: minimal — hamburger + current screen title. No avatar, no actions
 * (those live in the bottom tab bar's Profile tab and the drawer).
 * Desktop: hamburger hidden, spacer, notifications + theme + profile menu.
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
  const title = viewTitles[view] ?? "Practicum Portal";
  const breadcrumb = role ? roleBreadcrumbs[role] : "";

  return (
    <header
      className="topbar-safe-top sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-border/60 bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/80 sm:px-6 lg:px-8"
    >
      {/* Mobile: hamburger + current screen title only. min-w-0 + truncate so
          long titles never overflow (§1.2 zero-truncation rule). */}
      <Button
        variant="ghost"
        size="icon"
        className="-ml-2 h-11 w-11 shrink-0 lg:hidden"
        onClick={onOpenMobileNav}
        aria-label="Open navigation"
      >
        <Menu className="h-5 w-5" />
      </Button>
      <div className="flex min-w-0 flex-1 items-center lg:hidden">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold leading-tight text-foreground">
            {title}
          </p>
          {breadcrumb && (
            <p className="truncate text-xs leading-tight text-muted-foreground">
              {breadcrumb}
            </p>
          )}
        </div>
      </div>

      {/* Desktop: spacer (sidebar brand is visible) + actions. Hidden <lg. */}
      <div className="ml-auto hidden items-center gap-1 lg:flex">
        {/* Notifications — with enough padding for the badge */}
        <div className="relative flex items-center">
          <NotificationsDropdown />
        </div>

        {/* Theme toggle — 44px touch area even on hybrid touch laptops */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          aria-label="Toggle theme"
          className="h-11 w-11 text-muted-foreground hover:text-foreground"
        >
          {mounted && theme === "dark" ? (
            <Sun className="h-[18px] w-[18px]" />
          ) : (
            <Moon className="h-[18px] w-[18px]" />
          )}
        </Button>

        {/* Profile menu */}
        {currentUser && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="flex h-11 min-w-0 items-center gap-1.5 rounded-full py-1 pl-1 pr-2 transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
                aria-label="Open profile menu"
              >
                <Avatar
                  name={currentUser.name}
                  size="sm"
                  color={currentUser.avatarColor}
                />
                <span className="hidden min-w-0 text-left sm:block">
                  <span className="block truncate text-sm font-semibold leading-tight text-foreground">
                    {currentUser.name}
                  </span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {role ? ROLE_LABELS[role] : ""}
                  </span>
                </span>
                <ChevronDown className="hidden h-4 w-4 shrink-0 text-muted-foreground sm:block" />
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
