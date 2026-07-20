"use client";

import * as React from "react";
import { Sidebar, MobileSidebar } from "./sidebar";
import { PageActions } from "./page-actions";
import { BottomTabBar } from "./bottom-tab-bar";
import { ActiveSessionBanner } from "@/components/portal/shared/active-session-banner";
import { CommandPalette } from "@/components/portal/shared/command-palette";
import { useAppStore } from "@/store/use-app-store";

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
  const view = useAppStore((s) => s.view);

  // Scroll to top on view change — native-app feel for mobile navigation.
  React.useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
  }, [view]);

  // Persist collapse preference.
  React.useEffect(() => {
    const saved = localStorage.getItem("portal-sidebar-collapsed");
    if (saved === "1") setCollapsed(true);
  }, []);
  React.useEffect(() => {
    localStorage.setItem("portal-sidebar-collapsed", collapsed ? "1" : "0");
  }, [collapsed]);

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
    <div className="flex min-h-screen bg-background">
      {/*
        Desktop sidebar — pinned to the viewport via sticky so it NEVER scrolls
        with the page. self-start prevents the flex row from stretching it to
        content height; h-screen pins it to exactly one viewport; the internal
        ScrollArea handles its own nav overflow.
      */}
      <div className="sticky top-0 hidden h-screen shrink-0 self-start lg:flex lg:flex-col">
        <Sidebar collapsed={collapsed} onToggleCollapse={() => setCollapsed((c) => !c)} />
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
        />
        <ActiveSessionBanner />
        {/*
          Content rhythm. On mobile we add bottom padding equal to the tab bar
          height (56px) + safe area so cards and action bars never get hidden.
          Page gutter px-4 sm:px-6 lg:px-8 (§1.1).
        */}
        <main className="flex-1 px-5 pb-[calc(56px+env(safe-area-inset-bottom,0px)+1rem)] pt-4 sm:px-6 lg:px-8 lg:pb-12 lg:pt-6">
          <div className="mx-auto w-full max-w-7xl">
            <div key={view}>
              {children}
            </div>
          </div>
        </main>
        {/* Footer — desktop only. Sticky to bottom via mt-auto. Bottom tab bar
            replaces it on mobile (<lg). Clean: brand + user agreement link. */}
        <footer className="mt-auto hidden border-t border-border/60 bg-background/50 px-4 py-2.5 sm:px-6 lg:block lg:px-8">
          <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-2 text-xs text-muted-foreground">
            <p className="truncate">Practo</p>
            <a
              href="#"
              onClick={(e) => e.preventDefault()}
              className="shrink-0 font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              User Agreement
            </a>
          </div>
        </footer>
      </div>

      {/* Mobile primary navigation — sticky bottom tab bar (<lg only). */}
      <BottomTabBar />

      {/* Global Cmd/Ctrl+K command palette */}
      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
    </div>
  );
}
