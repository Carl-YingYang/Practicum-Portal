"use client";

import { cn } from "@/lib/utils";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAppStore } from "@/store/use-app-store";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { roleBreadcrumbs, viewTitles } from "@/lib/nav";

interface PageHeaderProps {
  title?: string;
  description?: React.ReactNode;
  breadcrumb?: string; // module label after role
  actions?: React.ReactNode;
  showBack?: boolean;
  className?: string;
}

/**
 * PageHeader — title + (optional) primary action row.
 *
 * Per Responsive Contract §1.3 + §2.1:
 *  - Title row: `flex flex-wrap items-center justify-between gap-3` so the
 *    action button wraps below the title on narrow viewports (never overflows).
 *  - Breadcrumb: `min-w-0 truncate text-sm`; middle segment hidden <sm to save
 *    horizontal space (§2.9).
 *  - Heading: `text-xl sm:text-2xl font-bold` (§1.2.3).
 */
export function PageHeader({
  title,
  description,
  breadcrumb,
  actions,
  showBack,
  className,
}: PageHeaderProps) {
  const view = useAppStore((s) => s.view);
  const role = useAppStore((s) => s.currentUser?.role);
  const back = useAppStore((s) => s.back);
  const canBack = useAppStore((s) => s.history.length > 0);

  const resolvedTitle = title ?? viewTitles[view];
  const roleLabel = role ? roleBreadcrumbs[role] : "";

  return (
    <div className={cn("mb-5", className)}>
      {showBack && canBack && (
        <Button
          variant="ghost"
          size="sm"
          onClick={back}
          className="mb-2 -ml-2.5 h-9 min-h-9 gap-1 text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" />
          Back
        </Button>
      )}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0 flex-1 basis-full sm:basis-auto">
          {role && breadcrumb && (
            <Breadcrumb className="mb-1.5">
              <BreadcrumbList className="text-xs">
                <BreadcrumbItem className="hidden sm:inline-flex">
                  <BreadcrumbLink className="text-muted-foreground">
                    {roleLabel}
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden text-muted-foreground/50 sm:inline-flex">
                  /
                </BreadcrumbSeparator>
                <BreadcrumbItem className="min-w-0">
                  <BreadcrumbPage className="truncate font-medium text-foreground">
                    {breadcrumb}
                  </BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          )}
          <h1 className="font-heading text-xl font-bold tracking-tight text-foreground sm:text-2xl">
            {resolvedTitle}
          </h1>
          {description && (
            <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          )}
        </div>
        {actions && (
          <div className="flex w-full shrink-0 flex-wrap items-center gap-2 sm:w-auto">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}
