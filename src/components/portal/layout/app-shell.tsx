"use client";
import * as React from "react";
import dynamic from "next/dynamic";
import { refreshPortal } from "@/client/portal-client";
import { ConfirmDialog } from "@/components/portal/shared/confirm-dialog";
import { Sidebar, MobileSidebar } from "./sidebar";
import { PageActions } from "./page-actions";
import { BottomTabBar } from "./bottom-tab-bar";
import { ActiveSessionBanner } from "@/components/portal/shared/active-session-banner";
import { CommandPalette } from "@/components/portal/shared/command-palette";
import { useAppStore } from "@/store/use-app-store";
const TestingScenarios = dynamic(
  () =>
    import("@/components/portal/shared/testing-scenarios").then(
      (m) => m.TestingScenarios,
    ),
  { ssr: false },
);
interface AppShellProps {
  children: React.ReactNode;
}
/**
 * AppShell — the authenticated application frame.
 *
 * Layout:
 *   - Desktop (lg+): collapsible Sidebar + Topbar + content + footer.
 *   - Mobile (<lg): minimal Topbar (title + hamburger) + content + sticky
 *     BottomTabBar (primary nav). Drawer carries secondary items only.
 *
 * The bottom tab bar replaces reliance on the hamburger drawer for primary
 * navigation on mobile — it's thumb-reachable and always visible.
 *
 * A global Cmd/Ctrl+K command palette is mounted here for quick navigation
 * from any view.
 */
export function AppShell({ children }: AppShellProps) {
  const [collapsed, setCollapsed] = React.useState(false);
  const [mobileNavOpen, setMobileNavOpen] = React.useState(false);
  const [paletteOpen, setPaletteOpen] = React.useState(false);
  const [resetOpen, setResetOpen] = React.useState(false);
  const [scenariosOpen, setScenariosOpen] = React.useState(false);
  const hasTestingAccounts = useAppStore((s) => s.demoAccounts.length > 0);
  const resetPrototype = useAppStore((s) => s.resetPrototype);
  const syncStatus = useAppStore((s) => s.syncStatus);
  const syncError = useAppStore((s) => s.syncError);
  const canReset = useAppStore(
    (s) => s.testMode && s.currentUser?.role === "coordinator",
  );
  const view = useAppStore((s) => s.view);
  const viewParams = useAppStore((s) => s.viewParams);
  // Scroll to top on view change — native-app feel for mobile navigation.
  React.useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
  }, [view]);
  // Persist collapse preference.
  React.useEffect(() => {
    const saved = localStorage.getItem("portal-sidebar-collapsed");
    if (saved === "1") setCollapsed(true);
  }, []);
  // Global Cmd/Ctrl+K shortcut → open command palette.
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  return (
    <div className="editorial-shell flex min-h-svh bg-background">
      {/*
          Desktop sidebar — pinned to the viewport via sticky so it NEVER scrolls
          with the page. self-start prevents the flex row from stretching it to
          content height; h-screen pins it to exactly one viewport; the internal
          ScrollArea handles its own nav overflow.
        */}
      <div className="sticky top-0 hidden h-dvh shrink-0 self-start lg:flex lg:flex-col">
        <Sidebar
          collapsed={collapsed}
          onToggleCollapse={() =>
            setCollapsed((c) => {
              localStorage.setItem("portal-sidebar-collapsed", c ? "0" : "1");
              return !c;
            })
          }
        />
      </div>

      {/* Mobile drawer — secondary nav only (primary is the bottom tab bar). */}
      <MobileSidebar open={mobileNavOpen} onOpenChange={setMobileNavOpen} />

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Floating page actions — merged into the page, no separate header bar.
            Sticky top-right pill with backdrop blur. Contains only the essential
            controls: mobile nav, notifications, theme, account. */}
        <PageActions
          onOpenMobileNav={() => setMobileNavOpen(true)}
          onOpenPalette={() => setPaletteOpen(true)}
          onResetDemo={canReset ? () => setResetOpen(true) : undefined}
          onOpenTestingScenarios={
            hasTestingAccounts ? () => setScenariosOpen(true) : undefined
          }
        />
        <ActiveSessionBanner />
        <div
          aria-live="polite"
          role={syncStatus === "error" ? "alert" : "status"}
          className="px-5 pt-1 text-xs text-muted-foreground sm:px-6 lg:px-8"
        >
          {syncStatus === "saving" ? (
            "Saving changes…"
          ) : syncStatus === "error" ? (
            <span className="text-destructive">
              {syncError}{" "}
              <button
                className="underline"
                onClick={() => void refreshPortal().catch(() => {})}
              >
                Reconnect
              </button>
            </span>
          ) : (
            "Connected · changes saved"
          )}
        </div>
        {/*
          Content rhythm. On mobile we add bottom padding equal to the tab bar
          height (56px) + safe area so cards and action bars never get hidden.
          Page gutter px-4 sm:px-6 lg:px-8 (§1.1).
        */}
        <main className="min-w-0 flex-1 px-4 pb-[calc(56px+env(safe-area-inset-bottom,0px)+1rem)] pt-4 sm:px-6 lg:px-8 lg:pb-6 lg:pt-6">
          <div className="mx-auto min-w-0 w-full max-w-7xl">
            <div className="min-w-0" key={`${view}:${JSON.stringify(viewParams)}`}>{children}</div>
          </div>
        </main>
        {/* Footer — desktop only. Sticky to bottom via mt-auto. Bottom tab bar
            replaces it on mobile (<lg). Clean: brand + user agreement link. */}
        <footer className="mt-auto hidden border-t border-border/60 bg-background/50 px-4 py-2.5 sm:px-6 lg:block lg:px-8">
          <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-2 text-xs text-muted-foreground">
            <p className="truncate">Practo</p>
            <div className="flex items-center gap-4">
              <span>Connected test platform</span>
              {canReset && (
                <button
                  type="button"
                  className="underline underline-offset-4"
                  onClick={() => setResetOpen(true)}
                >
                  Reset test data
                </button>
              )}
            </div>
          </div>
        </footer>
      </div>

      {/* Mobile primary navigation — sticky bottom tab bar (<lg only). */}
      <BottomTabBar />
      {hasTestingAccounts && scenariosOpen && (
        <TestingScenarios onClose={() => setScenariosOpen(false)} />
      )}

      <ConfirmDialog
        open={resetOpen}
        onOpenChange={setResetOpen}
        title="Reset shared test data?"
        description="This resets the shared test database, including accounts, attendance, journals, forms and settings. All test sessions are signed out."
        destructive
        confirmLabel="Reset demo"
        onConfirm={resetPrototype}
      />
      {/* Global Cmd/Ctrl+K command palette */}
      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
    </div>
  );
}
