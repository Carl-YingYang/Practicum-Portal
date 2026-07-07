"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/use-app-store";
import { navConfig, getNavIcon } from "@/lib/nav";
import { type Role, type ViewKey } from "@/lib/types";
import { LayoutGrid } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

const MAX_TABS = 4;

/**
 * Mobile bottom navigation.
 *
 * Design goals:
 *  - Smooth, springy active-state indicator that slides between tabs.
 *  - Generous 56px tap targets (≥44px WCAG minimum).
 *  - Sticky-to-bottom with safe-area inset padding (iOS notch / home bar).
 *  - "More" overflow sheet is a clean 2-col grid with section labels.
 *  - Tapping the active tab again scrolls the page back to top (Android/iOS convention).
 */
export function MobileNav() {
  const role = useAppStore((s) => s.currentUser?.role) as Role | undefined;
  const view = useAppStore((s) => s.view);
  const navigate = useAppStore((s) => s.navigate);
  const [moreOpen, setMoreOpen] = React.useState(false);

  // Close the More sheet whenever the view changes (defensive — also handled on click).
  React.useEffect(() => {
    setMoreOpen(false);
  }, [view]);

  if (!role) return null;
  const items = navConfig[role];
  const primary = items.slice(0, MAX_TABS);
  const overflow = items.slice(MAX_TABS);

  // The "More" button is considered active when the current view lives in the
  // overflow section — this gives users a persistent signal that they're inside
  // a secondary section, even though it's behind the More sheet.
  const overflowActive = overflow.some((item) => item.view === view);

  const handleNavigate = (target: ViewKey) => {
    if (target === view) {
      // Already on this tab — scroll to top for quick re-orientation.
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    navigate(target);
  };

  return (
    <nav
      className="no-print fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 backdrop-blur-md supports-[backdrop-filter]:bg-background/80 lg:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      aria-label="Primary mobile navigation"
    >
      <div className="flex h-[60px] items-stretch">
        {primary.map((item) => {
          const Icon = getNavIcon(item.icon);
          const active = view === item.view;
          return (
            <button
              key={item.key}
              onClick={() => handleNavigate(item.view)}
              aria-current={active ? "page" : undefined}
              className={cn(
                "group relative flex flex-1 flex-col items-center justify-center gap-1 transition-colors duration-200 ease-[cubic-bezier(0.16,1,0.3,1)]",
                active ? "text-primary" : "text-muted-foreground active:text-foreground"
              )}
            >
              {/* Sliding pill indicator behind the icon */}
              <span
                className={cn(
                  "pointer-events-none absolute top-1.5 h-1 rounded-full bg-primary transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]",
                  active ? "opacity-100 w-6" : "opacity-0 w-3"
                )}
                aria-hidden
              />
              <span
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]",
                  active
                    ? "bg-primary/10 scale-105"
                    : "group-active:scale-90 group-active:bg-muted/60"
                )}
              >
                <Icon
                  className="h-[18px] w-[18px]"
                  strokeWidth={active ? 2.4 : 2}
                />
              </span>
              <span
                className={cn(
                  "max-w-[68px] truncate text-[10px] leading-none transition-all duration-200",
                  active ? "font-semibold" : "font-medium"
                )}
              >
                {item.shortLabel ?? item.label.split(" ")[0]}
              </span>
            </button>
          );
        })}

        {overflow.length > 0 && (
          <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
            <SheetTrigger asChild>
              <button
                aria-label="More navigation"
                className={cn(
                  "group relative flex flex-1 flex-col items-center justify-center gap-1 transition-colors duration-200",
                  overflowActive || moreOpen
                    ? "text-primary"
                    : "text-muted-foreground active:text-foreground"
                )}
              >
                <span
                  className={cn(
                    "pointer-events-none absolute top-1.5 h-1 rounded-full bg-primary transition-all duration-300",
                    overflowActive || moreOpen ? "opacity-100 w-6" : "opacity-0 w-3"
                  )}
                  aria-hidden
                />
                <span
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-full transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]",
                    overflowActive || moreOpen
                      ? "bg-primary/10 scale-105"
                      : "group-active:scale-90 group-active:bg-muted/60"
                  )}
                >
                  <LayoutGrid
                    className="h-[18px] w-[18px]"
                    strokeWidth={overflowActive || moreOpen ? 2.4 : 2}
                  />
                </span>
                <span
                  className={cn(
                    "text-[10px] leading-none",
                    overflowActive || moreOpen ? "font-semibold" : "font-medium"
                  )}
                >
                  More
                </span>
              </button>
            </SheetTrigger>
            <SheetContent
              side="bottom"
              className="rounded-t-2xl p-0"
              style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 1rem)" }}
            >
              <SheetHeader className="space-y-0 px-5 pb-2 pt-4">
                <SheetTitle className="text-base">More</SheetTitle>
                <p className="text-xs text-muted-foreground">
                  Browse all {items.length} sections
                </p>
              </SheetHeader>
              <ScrollArea className="max-h-[60vh] px-4 pb-2 pt-1">
                <div className="grid grid-cols-2 gap-2">
                  {overflow.map((item) => {
                    const Icon = getNavIcon(item.icon);
                    const active = view === item.view;
                    return (
                      <Button
                        key={item.key}
                        variant={active ? "default" : "outline"}
                        className="h-auto justify-start gap-3 px-3.5 py-3.5 text-left"
                        onClick={() => handleNavigate(item.view)}
                      >
                        <span
                          className={cn(
                            "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
                            active
                              ? "bg-primary-foreground/15 text-primary-foreground"
                              : "bg-primary/8 text-primary"
                          )}
                        >
                          <Icon className="h-[18px] w-[18px]" />
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate text-[13px] font-semibold">
                            {item.label}
                          </span>
                        </span>
                      </Button>
                    );
                  })}
                </div>
              </ScrollArea>
            </SheetContent>
          </Sheet>
        )}
      </div>
    </nav>
  );
}
