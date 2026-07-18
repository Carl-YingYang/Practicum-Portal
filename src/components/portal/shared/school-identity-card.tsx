"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/use-app-store";
import { resolveSchoolTheme } from "@/lib/school-themes";
import { GraduationCap, MapPin, School as SchoolIcon, Info } from "lucide-react";
import type { SchoolIdentity } from "@/lib/types";
import { SchoolIdentityModal } from "@/components/portal/shared/school-identity-modal";

type Variant = "compact" | "full";

interface SchoolIdentityCardProps {
  /** Visual density. "compact" = dashboard strip; "full" = profile block. */
  variant?: Variant;
  /** Optional className override on the outer wrapper. */
  className?: string;
  /** Hide the address line even when present (useful for very tight spaces). */
  hideAddress?: boolean;
  /**
   * When true, the card becomes a tappable button that opens the
   * SchoolIdentityModal. This is the preferred way to surface school info
   * on dashboards (per UX review: the sidebar brand is too easy to miss).
   */
  interactive?: boolean;
}

/**
 * SchoolIdentityCard — shows the configured school identity (logo, name,
 * tagline, address) using the live theme colors.
 *
 * Used by students and supervisors to see "which school am I / my intern
 * affiliated with". Fully responsive: stacks on mobile, stretches on desktop.
 *
 * When `interactive` is true, the whole card is a button that opens the
 * SchoolIdentityModal — the primary entry point for viewing full school
 * details from any dashboard.
 */
export function SchoolIdentityCard({
  variant = "compact",
  className,
  hideAddress = false,
  interactive = false,
}: SchoolIdentityCardProps) {
  const schoolIdentity = useAppStore((s) => s.schoolIdentity);
  const [open, setOpen] = React.useState(false);
  return (
    <>
      <SchoolIdentityCardInner
        identity={schoolIdentity}
        variant={variant}
        className={className}
        hideAddress={hideAddress}
        interactive={interactive}
        onOpen={() => setOpen(true)}
      />
      {interactive && (
        <SchoolIdentityModal open={open} onOpenChange={setOpen} />
      )}
    </>
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
  interactive = false,
  onOpen,
}: {
  identity: SchoolIdentity;
  variant?: Variant;
  className?: string;
  hideAddress?: boolean;
  interactive?: boolean;
  onOpen?: () => void;
}) {
  const colors = resolveSchoolTheme(identity);
  const hasLogo = !!identity.logoDataUrl;
  const showAddress = !hideAddress && !!identity.address?.trim();

  // Shared content renderer — used by both the button (interactive) and
  // div (non-interactive) wrappers so the layout is identical.
  const inner = (variant === "full" ? renderFull : renderCompact)({
    identity,
    colors,
    hasLogo,
    showAddress,
  });

  if (!interactive) {
    // Non-interactive: render as a plain div (original behavior).
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
          {inner}
        </div>
      );
    }
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
        {inner}
      </div>
    );
  }

  // Interactive: render as a button with hover affordance + info icon.
  const baseInteractiveClass =
    variant === "full"
      ? "relative overflow-hidden rounded-xl border border-white/20 text-left transition-all duration-200 hover:shadow-lg hover:-translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:ring-offset-2"
      : "relative flex items-center gap-3 overflow-hidden rounded-xl border border-white/20 p-3 text-left transition-all duration-200 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:ring-offset-2";

  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(baseInteractiveClass, "group w-full cursor-pointer", className)}
      style={{
        background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.deep} 100%)`,
      }}
      aria-label={`View ${identity.name || "school"} details`}
      title={`View ${identity.name || "school"} details`}
    >
      {inner}
      {/* Info affordance — bottom-right pill that appears on hover. */}
      <span className="pointer-events-none absolute bottom-2 right-2 z-10 flex items-center gap-1 rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white opacity-0 backdrop-blur-sm transition-opacity duration-200 group-hover:opacity-100 group-focus-visible:opacity-100">
        <Info className="h-3 w-3" strokeWidth={2.4} />
        View details
      </span>
    </button>
  );
}

/**
 * Render helpers — return the inner JSX (logo, name, tagline, address) for
 * the compact and full variants. Shared between interactive and
 * non-interactive wrappers.
 */
function renderCompact({
  identity,
  colors,
  hasLogo,
  showAddress,
}: {
  identity: SchoolIdentity;
  colors: ReturnType<typeof resolveSchoolTheme>;
  hasLogo: boolean;
  showAddress: boolean;
}) {
  return (
    <>
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
    </>
  );
}

function renderFull({
  identity,
  colors,
  hasLogo,
  showAddress,
}: {
  identity: SchoolIdentity;
  colors: ReturnType<typeof resolveSchoolTheme>;
  hasLogo: boolean;
  showAddress: boolean;
}) {
  return (
    <>
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
    </>
  );
}
