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
        "card-refined gap-0 overflow-hidden border-border/60",
        interactive && "is-interactive hover:shadow-sm hover:border-border transition-shadow duration-200",
        className
      )}
    >
      {hasHeader && (
        <div className="flex items-center justify-between gap-3 border-b border-border/50 px-5 py-3.5">
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
          {actions && <div className="flex shrink-0 items-center gap-1.5">{actions}</div>}
        </div>
      )}
      <div className={cn(!noPadding && "p-5", contentClassName)}>{children}</div>
    </Card>
  );
}
