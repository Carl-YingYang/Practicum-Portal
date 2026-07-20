"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/use-app-store";
import { resolveSchoolTheme } from "@/lib/school-themes";
import {
  GraduationCap,
  MapPin,
  School as SchoolIcon,
  Info,
  ChevronRight,
  ShieldCheck
} from "lucide-react";
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

  // Extract the hero image to use as background
  const displayHero = (identity as any).heroImages?.[0] ?? (identity as any).heroImage;

  // Shared content renderer
  const inner = (variant === "full" ? renderFull : renderCompact)({
    identity,
    colors,
    hasLogo,
    showAddress,
  });

  // Reusable background layer with adjusted image focus and smoother gradients
  const BackgroundLayer = () => (
    <>
      {displayHero ? (
        <>
          <img
            src={displayHero}
            alt=""
            // Changed to object-right so it doesn't crop the subjects on the right side
            className="absolute inset-0 h-full w-full object-cover object-[center_top] sm:object-right opacity-90 transition-transform duration-700 ease-out group-hover:scale-105"
          />
          {/* Main gradient: Solid dark on the left for text readability, fading to transparent on the right */}
          <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/80 to-transparent" />
          {/* Bottom vignette to ground the image */}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 to-transparent" />
          {/* Very subtle theme color blend */}
          <div
            className="absolute inset-0 mix-blend-color opacity-40"
            style={{ backgroundColor: colors.deep }}
          />
        </>
      ) : (
        <div
          className="absolute inset-0 transition-transform duration-700 group-hover:scale-105"
          style={{
            background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.deep} 100%)`,
          }}
        />
      )}
    </>
  );

  if (!interactive) {
    if (variant === "full") {
      return (
        <div className={cn("group relative overflow-hidden rounded-xl border border-border/60", className)}>
          <BackgroundLayer />
          <div className="relative z-10">{inner}</div>
        </div>
      );
    }
    return (
      <div className={cn("group relative overflow-hidden rounded-xl border border-border/60", className)}>
        <BackgroundLayer />
        <div className="relative z-10 flex w-full items-center p-3.5 sm:p-4">{inner}</div>
      </div>
    );
  }

  // Interactive Button Variant
  const baseInteractiveClass =
    variant === "full"
      ? "group relative overflow-hidden rounded-xl border border-border/50 text-left transition-all duration-300 hover:shadow-xl hover:border-white/20 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2"
      : "group relative overflow-hidden rounded-xl border border-border/50 text-left transition-all duration-300 hover:shadow-lg hover:border-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2";

  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(baseInteractiveClass, "w-full cursor-pointer bg-slate-950", className)}
      aria-label={`View ${identity.name || "school"} details`}
      title={`View ${identity.name || "school"} details`}
    >
      <BackgroundLayer />

      {/* Content wrapper ensures full width for flexbox spacing */}
      <div className={cn("relative z-10 w-full", variant === "compact" && "flex items-center p-3.5 sm:p-4")}>
        {inner}
      </div>

      {/* Info affordance pill — only visible on full variant hover */}
      {variant === "full" && (
        <span className="pointer-events-none absolute bottom-2 right-2 z-20 flex items-center gap-1 rounded-full bg-black/50 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white opacity-0 backdrop-blur-md transition-opacity duration-200 group-hover:opacity-100 border border-white/10">
          <Info className="h-3 w-3" strokeWidth={2.4} />
          View details
        </span>
      )}
    </button>
  );
}

/**
 * COMPACT VARIANT: Redesigned to look like a premium dashboard widget.
 * Left side: Identity Info. Right side: Interactive action indicators.
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
    <div className="flex w-full items-center justify-between gap-4">
      {/* LEFT: School Details */}
      <div className="flex flex-1 min-w-0 items-center gap-3 sm:gap-4">
        <div className="flex h-12 w-12 sm:h-14 sm:w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white/10 ring-1 ring-white/20 shadow-lg backdrop-blur-md">
          {hasLogo ? (
            <img
              src={identity.logoDataUrl}
              alt={`${identity.name} logo`}
              className="h-full w-full rounded-xl object-contain p-1"
            />
          ) : (
            <GraduationCap className="h-6 w-6 text-white" strokeWidth={2} />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <p className="truncate text-sm sm:text-base font-bold tracking-tight text-white drop-shadow-sm">
              {identity.name || "Your institution"}
            </p>
            <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-400 drop-shadow-sm" />
          </div>
          {identity.tagline && (
            <p className="mt-0.5 truncate text-[11.5px] font-medium text-slate-300 drop-shadow-sm">
              {identity.tagline}
            </p>
          )}
          {showAddress && (
            <p className="mt-1 flex items-center gap-1 truncate text-[10px] text-slate-400 drop-shadow-sm">
              <MapPin className="h-3 w-3 shrink-0" />
              <span className="truncate">{identity.address}</span>
            </p>
          )}
        </div>
      </div>

      {/* RIGHT: Call to Action (Fills the empty space and removes the "babadoy" look) */}
      <div className="hidden sm:flex shrink-0 items-center gap-4 pl-4 border-l border-white/10">
        <div className="flex flex-col items-end text-right transition-transform duration-300 group-hover:-translate-x-1">
          <span className="text-[10px] font-bold uppercase tracking-widest text-white/90">
            Institution Profile
          </span>
          <span className="text-[10px] text-slate-400">
            View details & cohort
          </span>
        </div>
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 border border-white/10 text-white shadow-lg backdrop-blur-md transition-all duration-300 group-hover:bg-white/20 group-hover:border-white/30 group-hover:translate-x-1">
          <ChevronRight className="h-4 w-4" />
        </div>
      </div>
    </div>
  );
}

/**
 * FULL VARIANT: Used for larger profile blocks.
 */
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
      <div
        className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full opacity-20 blur-3xl mix-blend-screen"
        style={{ backgroundColor: colors.light }}
        aria-hidden
      />
      <div className="relative flex flex-col gap-4 p-5 text-white sm:flex-row sm:items-center sm:gap-5">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white/15 ring-1 ring-white/25 shadow-sm sm:h-20 sm:w-20">
          {hasLogo ? (
            <img
              src={identity.logoDataUrl}
              alt={`${identity.name} logo`}
              className="h-full w-full rounded-xl object-contain p-1"
            />
          ) : (
            <SchoolIcon className="h-7 w-7 text-white sm:h-8 sm:w-8" strokeWidth={2.2} />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="text-lg font-bold leading-tight tracking-tight drop-shadow-sm sm:text-xl">
              {identity.name || "Your institution"}
            </p>
            <ShieldCheck className="h-5 w-5 shrink-0 text-emerald-400 drop-shadow-sm" />
          </div>
          {identity.tagline && (
            <p className="mt-0.5 text-sm text-white/80 drop-shadow-sm">{identity.tagline}</p>
          )}
          {showAddress && (
            <p className="mt-2 flex items-start gap-1.5 text-xs text-white/70 drop-shadow-sm">
              <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span className="min-w-0 break-words">{identity.address}</span>
            </p>
          )}
        </div>
      </div>
    </>
  );
}