"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

/* ========================================================================== */
/*  Shared Theme Customization Store                                          */
/*  ------------------------------------------------------------------------  */
/*  Persists per-school UI theme (accent color + visible bento cards) to      */
/*  localStorage. Supervisors customize; students read the same key.          */
/* ========================================================================== */

export type AccentColor = "sage" | "terracotta" | "slate";

export interface SchoolTheme {
  accentColor: AccentColor;
  visibleCards: string[];
}

export type SchoolThemeMap = Record<string, SchoolTheme>;

/** Canonical, ordered set of toggleable bento cards. */
export const TOGGLEABLE_CARDS = [
  { key: "time_clock", label: "Time Clock", description: "Clock in / out + live progress" },
  { key: "drafting_room", label: "Drafting Room", description: "Weekly journal drafting" },
  { key: "timesheet", label: "Timesheet", description: "This week's logged hours" },
  { key: "evaluations", label: "Evaluations", description: "Latest supervisor evaluation" },
] as const;

export const DEFAULT_VISIBLE_CARDS: string[] = [
  "time_clock",
  "drafting_room",
  "timesheet",
  "evaluations",
];

export const DEFAULT_SCHOOL_THEME: SchoolTheme = {
  accentColor: "sage",
  visibleCards: [...DEFAULT_VISIBLE_CARDS],
};

/**
 * School-id resolution.
 *
 * The current data model is a single-school MVP (`defaultSchoolIdentity` in
 * mock-data) — there is no `School` entity with an ID yet. Every user therefore
 * resolves to the `"default"` key. The store shape stays `Record<string, …>`
 * so it is ready for multi-school the moment a School entity is introduced;
 * only this constant needs to change.
 */
export const SCHOOL_ID = "default" as const;

/** Accent → Tailwind class maps (calm editorial palette, dark-mode aware). */
export const ACCENT_CLASSES: Record<
  AccentColor,
  {
    text: string;
    bg: string;
    bgSolid: string;
    ring: string;
    border: string;
    dot: string;
    swatch: string;
    gradient: string;
  }
> = {
  sage: {
    text: "text-emerald-700 dark:text-emerald-300",
    bg: "bg-emerald-500/10",
    bgSolid: "bg-emerald-600",
    ring: "ring-emerald-500/40",
    border: "border-emerald-500/30",
    dot: "bg-emerald-500",
    swatch: "bg-emerald-500",
    gradient: "from-emerald-500/15 to-teal-500/5",
  },
  terracotta: {
    text: "text-orange-700 dark:text-orange-300",
    bg: "bg-orange-500/10",
    bgSolid: "bg-orange-600",
    ring: "ring-orange-500/40",
    border: "border-orange-500/30",
    dot: "bg-orange-500",
    swatch: "bg-orange-500",
    gradient: "from-orange-500/15 to-amber-500/5",
  },
  slate: {
    text: "text-slate-700 dark:text-slate-300",
    bg: "bg-slate-500/10",
    bgSolid: "bg-slate-600",
    ring: "ring-slate-500/40",
    border: "border-slate-500/30",
    dot: "bg-slate-500",
    swatch: "bg-slate-500",
    gradient: "from-slate-500/15 to-slate-400/5",
  },
};

export const ACCENT_OPTIONS: { value: AccentColor; label: string }[] = [
  { value: "sage", label: "Sage" },
  { value: "terracotta", label: "Terracotta" },
  { value: "slate", label: "Slate" },
];

/* -------------------------------------------------------------------------- */
/*  SSR-safe storage (localStorage is undefined on the server)                */
/* -------------------------------------------------------------------------- */
const noopStorage = {
  getItem: () => null,
  setItem: () => undefined,
  removeItem: () => undefined,
};

interface ThemeState {
  themes: SchoolThemeMap;
  /** Merge-patch a school's theme (partial updates are fine). */
  setSchoolTheme: (schoolId: string, theme: Partial<SchoolTheme>) => void;
  /** Read a school's theme, falling back to the default. */
  getSchoolTheme: (schoolId: string) => SchoolTheme;
  /** Restore a school's theme to the default. */
  resetSchoolTheme: (schoolId: string) => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      themes: {},
      setSchoolTheme: (schoolId, theme) =>
        set((s) => {
          const current = s.themes[schoolId] ?? DEFAULT_SCHOOL_THEME;
          // Never allow visibleCards to become empty — keep at least one.
          let nextCards = theme.visibleCards ?? current.visibleCards;
          if (nextCards.length === 0) {
            nextCards = current.visibleCards.length
              ? current.visibleCards
              : [...DEFAULT_VISIBLE_CARDS];
          }
          // Preserve canonical ordering.
          const ordered = DEFAULT_VISIBLE_CARDS.filter((k) =>
            nextCards.includes(k),
          );
          return {
            themes: {
              ...s.themes,
              [schoolId]: {
                accentColor: theme.accentColor ?? current.accentColor,
                visibleCards: ordered,
              },
            },
          };
        }),
      getSchoolTheme: (schoolId) => get().themes[schoolId] ?? DEFAULT_SCHOOL_THEME,
      resetSchoolTheme: (schoolId) =>
        set((s) => ({
          themes: { ...s.themes, [schoolId]: { ...DEFAULT_SCHOOL_THEME } },
        })),
    }),
    {
      name: "pp:school-theme",
      storage: createJSONStorage(() =>
        typeof window !== "undefined" ? window.localStorage : noopStorage,
      ),
      version: 1,
      partialize: (s) => ({ themes: s.themes }),
    },
  ),
);

/**
 * Subscribe to a single school's theme (reactive). Falls back to the default
 * when the school has no saved theme.
 */
export function useSchoolTheme(schoolId: string = SCHOOL_ID): SchoolTheme {
  return useThemeStore((s) => s.themes[schoolId] ?? DEFAULT_SCHOOL_THEME);
}
