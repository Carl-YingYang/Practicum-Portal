"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";

interface BottomSheetProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title?: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;
  /** Max height as a vh percentage. Default 85. */
  maxHeight?: number;
  className?: string;
}

/**
 * BottomSheet — mobile-first modal that slides up from the bottom edge.
 *
 * Built on the existing Sheet primitive (side="bottom"). Used for quick
 * actions on mobile (filter, status change, quick approve, reassign
 * supervisor). On desktop it still renders as a bottom sheet but is sized
 * to feel like a centered dialog.
 *
 * The content area scrolls; the header (title + description) stays pinned.
 */
export function BottomSheet({
  open,
  onOpenChange,
  title,
  description,
  children,
  maxHeight = 85,
  className,
}: BottomSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className={cn(
          "flex flex-col gap-0 p-0 mx-auto max-w-lg w-full rounded-t-2xl",
          className
        )}
        style={{
          maxHeight: `${maxHeight}vh`,
          paddingBottom: "env(safe-area-inset-bottom, 0px)",
        }}
      >
        {(title || description) && (
          <SheetHeader className="space-y-1 border-b border-border/60 px-5 py-4">
            {title && (
              <SheetTitle className="text-left text-base font-semibold">
                {title}
              </SheetTitle>
            )}
            {description && (
              <SheetDescription className="text-left text-xs">
                {description}
              </SheetDescription>
            )}
          </SheetHeader>
        )}
        {/* Drag handle for affordance */}
        <div className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-border" aria-hidden />
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {children}
        </div>
      </SheetContent>
    </Sheet>
  );
}
