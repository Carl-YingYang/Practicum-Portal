"use client";

import * as React from "react";
import { useAppStore } from "@/store/use-app-store";
import { schoolThemeCssVars } from "@/lib/school-themes";

/**
 * SchoolThemeProvider — reads the coordinator-configured SchoolIdentity
 * from the store and writes the derived CSS custom properties onto
 * <html> (:root).
 *
 * Why CSS variables (not React state)?
 *   - Color switches are O(1) style mutations — zero React re-renders.
 *   - Every shadcn/ui component reads `--primary`, `--sidebar`, etc., so
 *     the entire UI re-themes automatically.
 *   - No flash of the wrong color on first paint (vars are set in a
 *     layout effect before paint).
 *
 * This component renders nothing — it's a pure side-effect.
 */
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
