"use client";

import * as React from "react";
import { useAppStore } from "@/store/use-app-store";
import { schoolThemeCssVars } from "@/lib/school-themes";

/** Applies school accents and chart colors without changing neutral surfaces. */
export function SchoolThemeProvider({ children }: { children: React.ReactNode }) {
  const schoolIdentity = useAppStore((s) => s.schoolIdentity);
  const hydrateSchoolIdentity = useAppStore((s) => s.hydrateSchoolIdentity);

  // 1. Hydrate from localStorage once on mount (matches the toolsConfig
  //    pattern — manual localStorage, no persist middleware).
  React.useEffect(() => {
    hydrateSchoolIdentity();
  }, [hydrateSchoolIdentity]);

  // 2. Write CSS vars whenever the identity changes. useLayoutEffect so
  //    the new colors are applied before the browser paints — no flash.
  const useIso = typeof window !== "undefined";
  React.useEffect(() => {
    if (!useIso) return;
    const vars = schoolThemeCssVars(schoolIdentity);
    const root = document.documentElement;
    for (const [k, v] of Object.entries(vars)) {
      root.style.setProperty(k, v);
    }
  }, [schoolIdentity, useIso]);

  return <>{children}</>;
}
