"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Wrench, CheckCircle2, AlertCircle, ExternalLink } from "lucide-react";
import { useAppStore } from "@/store/use-app-store";
import { connectedTools } from "@/lib/selectors";
import type { Role } from "@/lib/types";

interface ToolsStatusBannerProps {
  role: Role;
  onConnect?: () => void; // coordinator: opens the sheet
}

/**
 * ToolsStatusBanner — shows the cohort's tool-connection status.
 *
 * - Coordinator: amber if <4 connected (CTA: Connect Tools), emerald if 4/4
 *   (CTA: Manage Tools).
 * - Student / Supervisor: emerald if any connected ("Tools connected"), muted
 *   if none ("Ask your coordinator to connect practicum tools").
 */
export function ToolsStatusBanner({ role, onConnect }: ToolsStatusBannerProps) {
  const toolsConfig = useAppStore((s) => s.toolsConfig);
  const status = connectedTools(toolsConfig);
  const isCoordinator = role === "coordinator";

  // Student/supervisor view — informational only.
  if (!isCoordinator) {
    if (status.count === 0) {
      return (
        <div className="flex items-center gap-2.5 rounded-xl border border-border/60 bg-muted/30 px-3.5 py-2.5">
          <AlertCircle className="h-4 w-4 shrink-0 text-muted-foreground" />
          <p className="text-xs leading-snug text-muted-foreground">
            Your coordinator hasn't connected practicum tools yet (Google Docs,
            Jibble, Google Forms).
          </p>
        </div>
      );
    }
    return (
      <div className="flex items-center gap-2.5 rounded-xl border border-emerald-200/60 bg-emerald-50/60 px-3.5 py-2.5 dark:border-emerald-900/40 dark:bg-emerald-950/20">
        <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
        <p className="text-xs leading-snug text-foreground">
          Practicum tools connected — open Google Docs, Jibble, and Forms from
          your dashboard.
        </p>
      </div>
    );
  }

  // Coordinator view — actionable.
  const allConnected = status.count === 4;
  const partial = status.count > 0 && status.count < 4;

  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-xl border p-3.5 sm:flex-row sm:items-center sm:justify-between sm:gap-4",
        allConnected
          ? "border-emerald-200/60 bg-emerald-50/60 dark:border-emerald-900/40 dark:bg-emerald-950/20"
          : "border-amber-200/60 bg-amber-50/60 dark:border-amber-900/40 dark:bg-amber-950/20",
      )}
    >
      <div className="flex items-start gap-2.5">
        <span
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
            allConnected
              ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
              : "bg-amber-500/15 text-amber-700 dark:text-amber-300",
          )}
        >
          {allConnected ? (
            <CheckCircle2 className="h-5 w-5" strokeWidth={2.2} />
          ) : (
            <Wrench className="h-5 w-5" strokeWidth={2.2} />
          )}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground">
            {allConnected
              ? "Practicum tools connected"
              : partial
              ? `${status.count} of 4 tools connected`
              : "Connect your practicum tools"}
          </p>
          <p className="mt-0.5 text-xs leading-snug text-muted-foreground">
            {allConnected
              ? "Google Docs, Jibble, Google Forms, and Drive are wired up."
              : "Link Google Docs (journals), Jibble (attendance), Google Forms (evaluations), and Drive (files). All free, unlimited users."}
          </p>
        </div>
      </div>
      <Button
        onClick={onConnect}
        variant={allConnected ? "outline" : "default"}
        size="sm"
        className="h-9 shrink-0"
        type="button"
      >
        <Wrench className="h-3.5 w-3.5" />
        {allConnected ? "Manage tools" : "Connect tools"}
        <ExternalLink className="h-3 w-3 opacity-0" aria-hidden />
      </Button>
    </div>
  );
}
