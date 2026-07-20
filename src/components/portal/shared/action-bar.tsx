"use client";

import { cn } from "@/lib/utils";

/**
 * Sticky bottom action bar for forms and detail pages.
 *
 * Sits above the mobile bottom tab bar (h-14 = 56px) so the primary CTA is
 * always thumb-reachable and never hidden. On desktop (lg+) it sticks to the
 * bottom of the scroll container with no offset (no tab bar there).
 */
interface ActionBarProps {
  children: React.ReactNode;
  className?: string;
}

export function ActionBar({ children, className }: ActionBarProps) {
  return (
    <div
      className={cn(
        "sticky z-20 mt-8 -mx-5 border-t border-border/60 bg-background/95 px-5 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/80 sm:-mx-6 sm:px-6",
        // Sit above the mobile bottom tab bar (56px tall + safe area)
        "bottom-[calc(56px+env(safe-area-inset-bottom,0px))] lg:bottom-0",
        className
      )}
    >
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end">
        {children}
      </div>
    </div>
  );
}

