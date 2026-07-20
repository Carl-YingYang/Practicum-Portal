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
      <DialogContent className="p-0 sm:max-w-lg border-border/60 max-h-[92dvh] overflow-y-auto overflow-x-hidden [scrollbar-width:thin]">
        <DialogTitle className="sr-only">{displayName}</DialogTitle>
        <DialogDescription className="sr-only">
          School identity overview and connected students.
        </DialogDescription>

        {/* Hero cover photo — Clean full-bleed image (No fade) */}
        <div className="relative aspect-[16/7] w-full overflow-hidden bg-muted sm:aspect-[21/9] shrink-0">
          {displayHero ? (
            <img
              src={displayHero}
              alt=""
              className="absolute inset-0 h-full w-full object-cover object-[center_top] sm:object-right"
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900" />
          )}

          {/* Subtle gradient veil at the VERY top ONLY for the close button readability */}
          <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-black/40 to-transparent" />

          {/* Close button — top-right ghost-white circle */}
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="absolute right-3 top-3 z-20 flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur-md transition-colors hover:bg-white/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
            aria-label="Close"
          >
            <X className="h-4 w-4" strokeWidth={2.5} />
          </button>
        </div>

        {/* Profile avatar — large rounded-square overlapping the cover photo */}
        <div className="relative -mt-12 px-5 z-10 shrink-0">
          <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-card ring-4 ring-background shadow-sm">
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
        <div className="px-5 pt-3 pb-2 shrink-0">
          <h2 className="text-xl font-bold leading-tight tracking-tight text-foreground">
            {displayName}
          </h2>
          {displayTagline && (
            <p className="mt-1 text-sm text-muted-foreground leading-relaxed">{displayTagline}</p>
          )}
          <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-muted/80 px-2.5 py-1 text-xs font-medium text-muted-foreground border border-border/40">
            <Users className="h-3.5 w-3.5" />
            {connectedStudents.length} student{connectedStudents.length === 1 ? "" : "s"} connected
          </div>
        </div>

        {/* About section — 2-column grid */}
        <div className="mt-2 space-y-3 border-t border-border/50 px-5 py-4 bg-muted/10 shrink-0">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            About
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <AboutItem icon={Building2} label="Full name" value={displayName} />
            <AboutItem icon={Tag} label="Short name" value={displayShortName || "—"} />
            {displayTagline && <AboutItem icon={Info} label="Tagline" value={displayTagline} />}
            {displayAddress?.trim() && <AboutItem icon={MapPin} label="Address" value={displayAddress} multiline />}
          </div>
        </div>

        {/* Connected Students grid */}
        {connectedStudents.length > 0 && (
          <div className="border-t border-border/50 px-5 pt-4 pb-8 sm:pb-5 shrink-0">
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Connected Students
            </p>
            <div className="grid grid-cols-4 gap-3 sm:grid-cols-5 md:grid-cols-6">
              {visibleStudents.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  className="flex flex-col items-center gap-1.5 rounded-lg p-1.5 transition-colors hover:bg-muted/50"
                >
                  <Avatar name={s.name} size="md" color={s.avatarColor} />
                  <p className="max-w-full truncate text-[10px] font-medium text-muted-foreground">
                    {s.name.split(" ")[0]}
                  </p>
                </button>
              ))}
              {remaining > 0 && (
                <div className="flex flex-col items-center gap-1.5 rounded-lg p-1.5">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-xs font-bold text-muted-foreground ring-1 ring-border/40">
                    +{remaining}
                  </div>
                  <p className="text-[10px] font-medium text-muted-foreground">more</p>
                </div>
              )}
            </div>
          </div>
        )}

        {connectedStudents.length === 0 && (
          <div className="border-t border-border/50 px-5 pt-6 pb-8 text-center shrink-0">
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
    <div className="flex items-start gap-2.5">
      <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground/70" />
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        <p
          className={cn(
            "text-xs font-medium text-foreground mt-0.5",
            multiline ? "whitespace-pre-wrap break-words leading-relaxed" : "truncate"
          )}
        >
          {value}
        </p>
      </div>
    </div>
  );
}