"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/use-app-store";
import { resolveSchoolTheme } from "@/lib/school-themes";
import { GraduationCap, MapPin, School as SchoolIcon } from "lucide-react";
import type { SchoolIdentity } from "@/lib/types";

type Variant = "compact" | "full";

interface SchoolIdentityCardProps {
  /** Visual density. "compact" = dashboard strip; "full" = profile block. */
  variant?: Variant;
  /** Optional className override on the outer wrapper. */
  className?: string;
  /** Hide the address line even when present (useful for very tight spaces). */
  hideAddress?: boolean;
}

/**
 * SchoolIdentityCard — shows the configured school identity (logo, name,
 * tagline, address) using the live theme colors.
 *
 * Used by students and supervisors to see "which school am I / my intern
 * affiliated with". Fully responsive: stacks on mobile, stretches on desktop.
 */
export function SchoolIdentityCard({
  variant = "compact",
  className,
  hideAddress = false,
}: SchoolIdentityCardProps) {
  const schoolIdentity = useAppStore((s) => s.schoolIdentity);
  return (
    <SchoolIdentityCardInner
      identity={schoolIdentity}
      variant={variant}
      className={className}
      hideAddress={hideAddress}
    />
  );
}

/**
 * Inner — accepts an explicit identity so the settings page's live preview
 * (which edits a draft) can reuse the exact same rendering.
 */
export function SchoolIdentityCardInner({
  identity,
  variant = "compact",
  className,
  hideAddress = false,
}: {
  identity: SchoolIdentity;
  variant?: Variant;
  className?: string;
  hideAddress?: boolean;
}) {
  const colors = resolveSchoolTheme(identity);
  const hasLogo = !!identity.logoDataUrl;
  const showAddress = !hideAddress && !!identity.address?.trim();

  if (variant === "full") {
    return (
      <div
        className={cn(
          "relative overflow-hidden rounded-xl border border-border/60",
          className,
        )}
        style={{
          background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.deep} 100%)`,
        }}
      >
        {/* Decorative tint */}
        <div
          className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full opacity-20 blur-2xl"
          style={{ backgroundColor: colors.light }}
          aria-hidden
        />
        <div className="relative flex flex-col gap-4 p-5 text-white sm:flex-row sm:items-center sm:gap-5">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white/15 ring-1 ring-white/25 sm:h-20 sm:w-20">
            {hasLogo ? (
              <img
                src={identity.logoDataUrl}
                alt={`${identity.name} logo`}
                className="h-full w-full rounded-xl object-contain p-1"
              />
            ) : (
              <SchoolIcon className="h-7 w-7 sm:h-8 sm:w-8" style={{ color: colors.light }} strokeWidth={2.2} />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-lg font-bold leading-tight tracking-tight sm:text-xl">
              {identity.name || "Your institution"}
            </p>
            {identity.tagline && (
              <p className="mt-0.5 text-sm text-white/75">{identity.tagline}</p>
            )}
            {showAddress && (
              <p className="mt-2 flex items-start gap-1.5 text-xs text-white/60">
                <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span className="min-w-0 break-words">{identity.address}</span>
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  // compact — slim horizontal strip for dashboards.
  return (
    <div
      className={cn(
        "relative flex items-center gap-3 overflow-hidden rounded-xl border border-border/60 p-3",
        className,
      )}
      style={{
        background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.deep} 100%)`,
      }}
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white/15 ring-1 ring-white/25">
        {hasLogo ? (
          <img
            src={identity.logoDataUrl}
            alt={`${identity.name} logo`}
            className="h-full w-full rounded-lg object-contain p-0.5"
          />
        ) : (
          <GraduationCap className="h-5 w-5" style={{ color: colors.light }} strokeWidth={2.3} />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold leading-tight text-white">
          {identity.name || "Your institution"}
        </p>
        {identity.tagline && (
          <p className="truncate text-[11px] text-white/70">{identity.tagline}</p>
        )}
        {showAddress && (
          <p className="mt-0.5 flex items-center gap-1 truncate text-[10px] text-white/55">
            <MapPin className="h-2.5 w-2.5 shrink-0" />
            <span className="truncate">{identity.address}</span>
          </p>
        )}
      </div>
    </div>
  );
}
