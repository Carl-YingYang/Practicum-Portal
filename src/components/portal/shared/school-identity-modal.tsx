"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/use-app-store";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Avatar } from "@/components/portal/shared/avatar";
import {
  GraduationCap,
  MapPin,
  Tag,
  Building2,
  Info,
  X,
  Users,
} from "lucide-react";

interface SchoolIdentityModalProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  /** Optional school ID — if provided, shows that school's students instead of the base identity. */
  schoolId?: string;
}

/**
 * SchoolIdentityModal — Facebook-style school info modal.
 *
 * Layout (top → bottom):
 * 1. Hero cover photo (full-bleed image with fade-in effect)
 * 2. Close button (top-right ghost-white circle)
 * 3. Profile avatar (large rounded-square logo on the cover, -mt-10, ring-4)
 * 4. School name + tagline + cohort chip ("N students connected")
 * 5. About section (2-column grid: Full name, Short name, Tagline, Address)
 * 6. Connected Students grid (4 cols mobile → 6 cols desktop, +N more tile)
 *
 * No theme color swatches — clean and Facebook-like.
 */
export function SchoolIdentityModal({ open, onOpenChange, schoolId }: SchoolIdentityModalProps) {
  const schoolIdentity = useAppStore((s) => s.schoolIdentity);
  const students = useAppStore((s) => s.students);
  const schools = useAppStore((s) => s.schools);

  // If schoolId is provided, find that school; otherwise use the base identity.
  const school = schoolId ? schools.find((s) => s.id === schoolId) : undefined;
  const displayName = school?.name ?? schoolIdentity.name ?? "Your institution";
  const displayTagline = school?.tagline ?? schoolIdentity.tagline ?? "";
  const displayShortName = school?.shortName ?? schoolIdentity.shortName ?? "";
  const displayAddress = school?.address ?? schoolIdentity.address ?? "";
  const displayLogo = school?.logoDataUrl ?? schoolIdentity.logoDataUrl;
  const displayHero = school?.heroImages?.[0] ?? schoolIdentity.heroImage;

  // Get connected students for this school.
  const connectedStudents = React.useMemo(() => {
    if (schoolId) {
      return students.filter((s) => (s.schoolId ?? "practo") === schoolId);
    }
    // Base identity → all students in the default school.
    return students.filter((s) => !s.schoolId || s.schoolId === "practo");
  }, [students, schoolId]);

  const hasLogo = !!displayLogo;
  const maxVisible = 8;
  const visibleStudents = connectedStudents.slice(0, maxVisible);
  const remaining = connectedStudents.length - maxVisible;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="overflow-hidden p-0 sm:max-w-lg">
        <DialogTitle className="sr-only">{displayName}</DialogTitle>
        <DialogDescription className="sr-only">
          School identity overview and connected students.
        </DialogDescription>

        {/* Hero cover photo — full-bleed with fade-in */}
        <div className="relative aspect-[16/6] w-full overflow-hidden bg-gradient-to-br from-slate-700 to-slate-900 sm:aspect-[16/5]">
          {displayHero ? (
            <img
              src={displayHero}
              alt=""
              className="hero-fade-in absolute inset-0 h-full w-full object-cover"
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-slate-700 via-slate-800 to-slate-900" />
          )}
          {/* Subtle gradient veil at the bottom for the close button */}
          <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-black/30 to-transparent" />

          {/* Close button — top-right ghost-white circle (Facebook-style) */}
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="absolute right-3 top-3 z-20 flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur-sm transition-colors hover:bg-white/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
            aria-label="Close"
          >
            <X className="h-4 w-4" strokeWidth={2.5} />
          </button>
        </div>

        {/* Profile avatar — large rounded-square on the cover photo */}
        <div className="relative -mt-10 px-5">
          <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-card ring-4 ring-background">
            {hasLogo ? (
              <img
                src={displayLogo}
                alt={`${displayName} logo`}
                className="h-full w-full rounded-xl object-contain p-1"
              />
            ) : (
              <GraduationCap className="h-8 w-8 text-muted-foreground" strokeWidth={2} />
            )}
          </div>
        </div>

        {/* School name + tagline + cohort chip */}
        <div className="px-5 pt-3">
          <h2 className="text-xl font-bold leading-tight tracking-tight text-foreground">
            {displayName}
          </h2>
          {displayTagline && (
            <p className="mt-0.5 text-sm text-muted-foreground">{displayTagline}</p>
          )}
          <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
            <Users className="h-3 w-3" />
            {connectedStudents.length} student{connectedStudents.length === 1 ? "" : "s"} connected
          </div>
        </div>

        {/* About section — 2-column grid */}
        <div className="mt-4 space-y-2.5 border-t border-border/60 px-5 py-4">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            About
          </p>
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            <AboutItem icon={Building2} label="Full name" value={displayName} />
            <AboutItem icon={Tag} label="Short name" value={displayShortName || "—"} />
            {displayTagline && <AboutItem icon={Info} label="Tagline" value={displayTagline} />}
            {displayAddress?.trim() && <AboutItem icon={MapPin} label="Address" value={displayAddress} multiline />}
          </div>
        </div>

        {/* Connected Students grid */}
        {connectedStudents.length > 0 && (
          <div className="border-t border-border/60 px-5 py-4">
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Connected Students
            </p>
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-5 md:grid-cols-6">
              {visibleStudents.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  className="flex flex-col items-center gap-1 rounded-lg p-1 transition-colors hover:bg-muted/50"
                >
                  <Avatar name={s.name} size="md" color={s.avatarColor} />
                  <p className="max-w-full truncate text-[10px] font-medium text-muted-foreground">
                    {s.name.split(" ")[0]}
                  </p>
                </button>
              ))}
              {remaining > 0 && (
                <div className="flex flex-col items-center gap-1 rounded-lg p-1">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-xs font-bold text-muted-foreground">
                    +{remaining}
                  </div>
                  <p className="text-[10px] font-medium text-muted-foreground">more</p>
                </div>
              )}
            </div>
          </div>
        )}

        {connectedStudents.length === 0 && (
          <div className="border-t border-border/60 px-5 py-6 text-center">
            <p className="text-sm text-muted-foreground">
              No students connected to this school yet.
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function AboutItem({
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
    <div className="flex items-start gap-2">
      <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        <p
          className={cn(
            "text-xs font-medium text-foreground",
            multiline ? "whitespace-pre-wrap break-words" : "truncate"
          )}
        >
          {value}
        </p>
      </div>
    </div>
  );
}
