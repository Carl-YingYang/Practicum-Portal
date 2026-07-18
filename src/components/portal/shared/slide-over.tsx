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
import { XIcon } from "lucide-react";

/**
 * SlideOver — a wider, polished right-side panel built on the shadcn Sheet.
 * Use for focused workspaces: submission review, student/supervisor details,
 * form assignment, etc. The default Sheet is too narrow (sm:max-w-sm) for
 * rich content; this widens to a responsive max and adds a clean header +
 * sticky footer pattern.
 */
export interface SlideOverProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: React.ReactNode;
  description?: React.ReactNode;
  /** Optional icon/badge shown to the left of the title. */
  eyebrow?: React.ReactNode;
  /** Optional right-side actions shown in the header (e.g. a dropdown menu). */
  headerActions?: React.ReactNode;
  /** Width preset. default = ~640px, wide = ~832px. */
  width?: "default" | "wide";
  children: React.ReactNode;
  /** Optional sticky footer (e.g. review action buttons). */
  footer?: React.ReactNode;
}

export function SlideOver({
  open,
  onOpenChange,
  title,
  description,
  eyebrow,
  headerActions,
  width = "default",
  children,
  footer,
}: SlideOverProps) {
  const widthCls =
    width === "wide"
      ? "sm:max-w-[832px] sm:w-[832px]"
      : "sm:max-w-[640px] sm:w-[640px]";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className={cn(
          "flex flex-col gap-0 p-0", // Base structure
          // Mobile overrides: Force 100% full screen, remove borders, hide default X button
          "w-full !max-w-full h-[100dvh] border-0 rounded-none sm:border-l [&>button.absolute]:hidden sm:[&>button.absolute]:flex",
          widthCls // Desktop responsive widths
        )}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-border/60 bg-background px-4 py-3 sm:px-5 sm:py-4 sm:pr-12">
          <div className="min-w-0 flex-1">
            {eyebrow && (
              <div className="mb-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                {eyebrow}
              </div>
            )}
            <SheetHeader className="space-y-1 p-0 text-left">
              <SheetTitle className="truncate text-base font-semibold leading-tight">
                {title}
              </SheetTitle>
              {description && (
                <SheetDescription className="text-xs leading-relaxed">
                  {description}
                </SheetDescription>
              )}
            </SheetHeader>
          </div>
          {headerActions && (
            <div className="flex shrink-0 items-center gap-1.5">{headerActions}</div>
          )}
        </div>

        {/* Body — scrollable */}
        <div className="flex-1 overflow-y-auto bg-background px-4 py-4 sm:px-5">
          {children}
        </div>

        {/* Optional sticky footer */}
        {footer && (
          <div className="border-t border-border/60 bg-muted/30 px-4 py-3 sm:px-5 pb-safe">
            {footer}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

/** A compact icon-button to close a slide-over (placed in headerActions). */
export function SlideOverCloseButton({
  onClose,
  label = "Close",
}: {
  onClose: () => void;
  label?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClose}
      aria-label={label}
      className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
    >
      <XIcon className="h-4 w-4" />
    </button>
  );
}