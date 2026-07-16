"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/use-app-store";
import { resolveSchoolTheme } from "@/lib/school-themes";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  GraduationCap,
  MapPin,
  Tag,
  Palette,
  Building2,
  Info,
} from "lucide-react";

interface SchoolIdentityModalProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

/**
 * SchoolIdentityModal — centered modal that shows the full school identity
 * (logo, full name, short name, tagline, address, theme swatches).
 *
 * Opened by tapping the sidebar brand block. Lets students, supervisors, and
 * coordinators see "which school am I affiliated with" without leaving the
 * current view. Responsive: centered dialog on desktop, full-width sheet-like
 * dialog on mobile.
 */
export function SchoolIdentityModal({ open, onOpenChange }: SchoolIdentityModalProps) {
  const schoolIdentity = useAppStore((s) => s.schoolIdentity);
  const colors = resolveSchoolTheme(schoolIdentity);
  const hasLogo = !!schoolIdentity.logoDataUrl;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="overflow-hidden p-0 sm:max-w-md">
        {/* Branded header — gradient using the school's theme colors. */}
        <div
          className="relative px-5 pb-5 pt-6 text-white sm:px-6"
          style={{
            background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.deep} 100%)`,
          }}
        >
          {/* Decorative tint */}
          <div
            className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full opacity-25 blur-2xl"
            style={{ backgroundColor: colors.light }}
            aria-hidden
          />
          <DialogHeader className="relative space-y-0">
            <DialogTitle className="sr-only">{schoolIdentity.name}</DialogTitle>
            <DialogDescription className="sr-only">
              School identity overview
            </DialogDescription>
            <div className="flex items-center gap-3">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white/15 ring-1 ring-white/25">
                {hasLogo ? (
                  <img
                    src={schoolIdentity.logoDataUrl}
                    alt={`${schoolIdentity.name} logo`}
                    className="h-full w-full rounded-xl object-contain p-1"
                  />
                ) : (
                  <GraduationCap
                    className="h-6 w-6"
                    style={{ color: colors.light }}
                    strokeWidth={2.2}
                  />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-lg font-bold leading-tight tracking-tight">
                  {schoolIdentity.name || "Your institution"}
                </p>
                {schoolIdentity.tagline && (
                  <p className="mt-0.5 text-sm text-white/80">
                    {schoolIdentity.tagline}
                  </p>
                )}
              </div>
            </div>
          </DialogHeader>
        </div>

        {/* Details grid */}
        <div className="space-y-3 px-5 py-4 sm:px-6">
          <DetailRow
            icon={Building2}
            label="Full name"
            value={schoolIdentity.name || "—"}
          />
          <DetailRow
            icon={Tag}
            label="Short name"
            value={schoolIdentity.shortName || "—"}
          />
          {schoolIdentity.tagline && (
            <DetailRow icon={Info} label="Tagline" value={schoolIdentity.tagline} />
          )}
          {schoolIdentity.address?.trim() && (
            <DetailRow
              icon={MapPin}
              label="Address"
              value={schoolIdentity.address}
              multiline
            />
          )}

          {/* Theme color swatches */}
          <div className="flex items-start gap-3 rounded-lg border border-border/60 bg-muted/30 px-3 py-2.5">
            <Palette className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Theme colors
              </p>
              <div className="mt-1.5 flex items-center gap-2">
                <Swatch color={colors.primary} label="Primary" />
                <Swatch color={colors.deep} label="Deep" />
                <Swatch color={colors.light} label="Light" />
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function DetailRow({
  icon: Icon,
  label,
  value,
  multiline,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  multiline?: boolean;
}) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        <p
          className={cn(
            "text-sm font-medium text-foreground",
            multiline ? "whitespace-pre-wrap break-words" : "truncate"
          )}
        >
          {value}
        </p>
      </div>
    </div>
  );
}

function Swatch({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span
        className="h-5 w-5 rounded ring-1 ring-black/10"
        style={{ backgroundColor: color }}
        aria-hidden
      />
      <span className="text-[10px] font-medium text-muted-foreground">{label}</span>
    </div>
  );
}
