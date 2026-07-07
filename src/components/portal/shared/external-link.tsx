"use client";

import * as React from "react";
import { ExternalLink as ExternalLinkIcon, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface ExternalLinkProps {
  href: string;
  label: string;
  icon?: LucideIcon;
  variant?: "button" | "link";
  disabled?: boolean;
  className?: string;
}

/**
 * ExternalLink — the canonical pattern for opening external tool URLs
 * (Google Docs, Jibble, Google Forms, Drive) in a new tab.
 *
 * Always uses `target="_blank" rel="noopener noreferrer"` for security
 * (prevents tab-nabbing) and performance (separate process).
 *
 * When `href` is empty or `disabled` is true, renders a disabled-styled
 * span so the layout doesn't shift when tools aren't connected yet.
 */
export function ExternalLink({
  href,
  label,
  icon: Icon,
  variant = "button",
  disabled,
  className,
}: ExternalLinkProps) {
  const isDisabled = disabled || !href.trim();

  if (variant === "link") {
    if (isDisabled) {
      return (
        <span className={cn("text-xs text-muted-foreground/60", className)}>
          {label}
        </span>
      );
    }
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(
          "inline-flex items-center gap-1 text-xs font-medium text-primary transition-colors hover:text-primary/80",
          className,
        )}
      >
        {Icon && <Icon className="h-3 w-3" />}
        {label}
        <ExternalLinkIcon className="h-3 w-3" />
      </a>
    );
  }

  // button variant
  if (isDisabled) {
    return (
      <span
        className={cn(
          "inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-border bg-muted/40 px-3 text-xs font-medium text-muted-foreground/60",
          className,
        )}
        aria-disabled="true"
      >
        {Icon && <Icon className="h-3.5 w-3.5" />}
        {label}
      </span>
    );
  }
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-border bg-card px-3 text-xs font-medium text-foreground transition-colors hover:bg-muted/40",
        className,
      )}
    >
      {Icon && <Icon className="h-3.5 w-3.5" />}
      {label}
      <ExternalLinkIcon className="h-3 w-3 text-muted-foreground" />
    </a>
  );
}
