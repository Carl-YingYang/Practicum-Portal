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
  Search,
  RotateCcw,
} from "lucide-react";
import { useTheme } from "next-themes";
import { ROLE_LABELS } from "@/lib/types";
import { NotificationsDropdown } from "./notifications-dropdown";
interface PageActionsProps {
  onOpenTestingScenarios?: () => void;
  onOpenMobileNav: () => void;
  onOpenPalette?: () => void;
  onResetDemo?: () => void;
}
/** Ruled workspace header: search, notifications, theme, account and demo reset. */
export function PageActions({
  onOpenMobileNav,
  onOpenPalette,
  onResetDemo,
  onOpenTestingScenarios,
}: PageActionsProps) {
  const currentUser = useAppStore((s) => s.currentUser);
  const navigate = useAppStore((s) => s.navigate);
  const logout = useAppStore((s) => s.logout);
  const demoUsers = useAppStore((s) => s.demoAccounts);
  const loginAs = useAppStore((s) => s.loginAs);
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);
  const role = currentUser?.role;
  return (
    <div className="sticky top-0 z-30 flex min-h-16 items-center justify-between gap-2 border-b border-border bg-background px-4 sm:px-6 lg:px-8">
      <p className="text-[10px] font-semibold uppercase tracking-[.2em] text-muted-foreground">
        Practo <span className="hidden sm:inline">/ Workspace</span>
      </p>
      <div className="flex items-center gap-0.5 py-2">
        {/* Mobile: hamburger — opens the drawer */}
        <Button
          variant="ghost"
          size="icon"
          className="size-11 shrink-0 text-foreground hover:bg-muted lg:hidden"
          onClick={onOpenMobileNav}
          aria-label="Open navigation"
        >
          <Menu className="h-[17px] w-[17px]" strokeWidth={2.2} />
        </Button>

        {/* Command palette / search trigger (desktop only) */}
        {onOpenPalette && (
          <button
            type="button"
            onClick={onOpenPalette}
            className="hidden h-8 items-center gap-2 rounded-full px-3 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground md:flex"
            aria-label="Open command palette"
            title="Search pages and actions (Ctrl+K)"
          >
            <Search className="h-3.5 w-3.5" strokeWidth={2.2} />
            <span>Search…</span>
            <kbd className="ml-1 rounded border border-border/80 bg-muted/60 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-muted-foreground">
              ⌘K
            </kbd>
          </button>
        )}

        {/* Notifications */}
        <div className="relative flex items-center">
          <NotificationsDropdown />
        </div>

        {/* Divider */}
        <span className="mx-0.5 h-4 w-px bg-border/60" />

        {/* Theme toggle */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          aria-label="Toggle theme"
          className="size-11 text-foreground hover:bg-muted"
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
                className="flex h-11 min-w-11 items-center gap-1.5 rounded-full py-0.5 pl-0.5 pr-2 transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
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
                <p className="text-sm font-semibold text-foreground">
                  {currentUser.name}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {currentUser.email}
                </p>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => {
                  if (role === "student") navigate("student.profile");
                  else if (role === "supervisor")
                    navigate("supervisor.profile");
                  else if (role === "coordinator")
                    navigate("coordinator.profile");
                }}
                className="gap-2 rounded-md"
              >
                <UserCircle className="h-4 w-4 text-muted-foreground" />
                My profile
              </DropdownMenuItem>

              {/* Prototype: switch demo role */}
              {onOpenTestingScenarios && (
                <DropdownMenuItem onClick={onOpenTestingScenarios}>
                  Testing scenarios
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuLabel className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Prototype: switch demo role
              </DropdownMenuLabel>
              {demoUsers
                .filter(
                  (u, index) =>
                    u.role !== role &&
                    demoUsers.findIndex((other) => other.role === u.role) ===
                      index,
                )
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
              {onResetDemo && (
                <DropdownMenuItem onClick={onResetDemo} className="gap-2">
                  <RotateCcw className="h-4 w-4" />
                  Reset test data
                </DropdownMenuItem>
              )}
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
    </div>
  );
}
