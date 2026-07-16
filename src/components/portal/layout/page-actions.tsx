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
  Palette,
} from "lucide-react";
import { useTheme } from "next-themes";
import { ROLE_LABELS } from "@/lib/types";
import { mockUsers } from "@/lib/mock-data";
import { NotificationsDropdown } from "./notifications-dropdown";
import { CustomizeSheet } from "@/components/portal/shared/CustomizeSheet";

interface PageActionsProps {
  onOpenMobileNav: () => void;
}

/**
 * PageActions — floating action cluster merged into the page.
 *
 * Replaces the old full-width Topbar. Instead of a header bar, the action
 * buttons (mobile nav, notifications, theme, account) live in a compact
 * floating pill pinned to the top-right of the content area. This makes the
 * actions feel "part of the page" rather than separate chrome.
 *
 *   - Sticky top + right so the controls stay reachable while scrolling.
 *   - Subtle backdrop-blur container keeps buttons legible over any content.
 *   - No page title/breadcrumb here — each page renders its own PageHeader.
 */
export function PageActions({ onOpenMobileNav }: PageActionsProps) {
  const currentUser = useAppStore((s) => s.currentUser);
  const navigate = useAppStore((s) => s.navigate);
  const logout = useAppStore((s) => s.logout);
  const loginAs = useAppStore((s) => s.loginAs);
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);
  const [customizeOpen, setCustomizeOpen] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  const role = currentUser?.role;

  return (
    <div className="pointer-events-none sticky top-0 z-30 flex justify-end px-4 pt-3 sm:px-6 lg:px-8">
      <div className="pointer-events-auto flex items-center gap-0.5 rounded-full border border-border/60 bg-background/75 p-1 shadow-sm backdrop-blur-md supports-[backdrop-filter]:bg-background/65">
        {/* Mobile: hamburger — opens the drawer */}
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0 text-foreground hover:bg-muted lg:hidden"
          onClick={onOpenMobileNav}
          aria-label="Open navigation"
        >
          <Menu className="h-[17px] w-[17px]" strokeWidth={2.2} />
        </Button>

        {/* Notifications */}
        <div className="relative flex items-center">
          <NotificationsDropdown />
        </div>

        {/* Supervisor only: customize workspace theme */}
        {role === "supervisor" && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCustomizeOpen(true)}
            aria-label="Customize workspace"
            className="h-8 w-8 text-foreground hover:bg-muted"
          >
            <Palette className="h-[16px] w-[16px]" strokeWidth={2.1} />
          </Button>
        )}

        {/* Divider */}
        <span className="mx-0.5 h-4 w-px bg-border/60" />

        {/* Theme toggle */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          aria-label="Toggle theme"
          className="h-8 w-8 text-foreground hover:bg-muted"
        >
          {mounted && theme === "dark" ? (
            <Sun className="h-[16px] w-[16px]" strokeWidth={2.1} />
          ) : (
            <Moon className="h-[16px] w-[16px]" strokeWidth={2.1} />
          )}
        </Button>

        {/* Divider */}
        <span className="mx-0.5 h-4 w-px bg-border/60" />

        {/* Profile menu */}
        {currentUser && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="flex h-8 min-w-0 items-center gap-1.5 rounded-full py-0.5 pl-0.5 pr-2 transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
                aria-label="Open profile menu"
              >
                <Avatar
                  name={currentUser.name}
                  size="sm"
                  color={currentUser.avatarColor}
                />
                <span className="hidden min-w-0 text-left md:block">
                  <span className="block truncate text-[12.5px] font-semibold leading-tight text-foreground">
                    {currentUser.name}
                  </span>
                </span>
                <ChevronDown className="hidden h-3.5 w-3.5 shrink-0 text-muted-foreground md:block" />
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

      {/* Supervisor-only theme editor (right-side Sheet). */}
      {role === "supervisor" && (
        <CustomizeSheet open={customizeOpen} onOpenChange={setCustomizeOpen} />
      )}
    </div>
  );
}
