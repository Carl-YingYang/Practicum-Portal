"use client";

import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface SectionCardProps {
  title?: string;
  description?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
  noPadding?: boolean;
  /** When true, adds the refined hover treatment (for cards that are clickable containers). */
  interactive?: boolean;
}

export function SectionCard({
  title,
  description,
  actions,
  children,
  className,
  contentClassName,
  noPadding,
  interactive,
}: SectionCardProps) {
  const hasHeader = title || actions;
  return (
    <Card
      className={cn(
        "card-refined min-w-0 max-w-full gap-0 overflow-hidden border-border/60",
        className
      )}
    >
      {hasHeader && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/50 px-4 py-3.5 sm:px-5">
          <div className="min-w-0">
            {title && (
              <h2 className="heading-accent text-sm font-semibold tracking-tight text-foreground">
                {title}
              </h2>
            )}
            {description && (
              <p className="mt-0.5 text-xs text-muted-foreground">
                {description}
              </p>
            )}
          </div>
          {actions && <div className="flex max-w-full flex-wrap items-center gap-1.5">{actions}</div>}
        </div>
      )}
      <div className={cn("min-w-0", !noPadding && "p-4 sm:p-5", contentClassName)}>{children}</div>
    </Card>
  );
}
