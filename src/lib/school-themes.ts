import { ACCENT_HEX, type SchoolIdentity, type SchoolThemePreset } from "./types";

// School palettes color secondary highlights and charts. Main surfaces,
// controls, sidebar and header remain neutral in light and dark modes.

export interface SchoolThemeColors {
  /** Primary brand color for charts and secondary accents. */
  primary: string;
  /** Deep secondary chart color. */
  deep: string;
  /** Pale highlight — active item strip, dots, soft fills. */
  light: string;
}

export interface SchoolThemePresetMeta {
  key: SchoolThemePreset;
  label: string;
  /** Short description shown on the preset card. */
  description: string;
  colors: SchoolThemeColors;
}

export const SCHOOL_THEME_PRESETS: SchoolThemePresetMeta[] = [
  {
    key: "azure-blue",
    label: "Azure Blue",
    description: "Blue secondary accents.",
    colors: { primary: "#266ca9", deep: "#0f2573", light: "#ade1fb" },
  },
  {
    key: "onyx-gold",
    label: "Onyx Gold",
    description: "Black + gold — bold and luxurious.",
    colors: { primary: "#1a1a1a", deep: "#000000", light: "#f2c14e" },
  },
  {
    key: "forest-green",
    label: "Forest Green",
    description: "Deep forest green — calm and grounded.",
    colors: { primary: "#016f3c", deep: "#013220", light: "#a7d8b6" },
  },
  {
    key: "crimson-maroon",
    label: "Crimson Maroon",
    description: "Maroon + rose — rich and warm.",
    colors: { primary: "#7b1113", deep: "#3d0608", light: "#f3c6c7" },
  },
  {
    key: "royal-navy",
    label: "Royal Navy",
    description: "Deep navy blue — authoritative and crisp.",
    colors: { primary: "#003a70", deep: "#001f3d", light: "#a9c6e8" },
  },
  {
    key: "burnt-orange",
    label: "Burnt Orange",
    description: "Bold orange — energetic and earthy.",
    colors: { primary: "#e87722", deep: "#8a3d0a", light: "#fcd9b6" },
  },
];

/** Default preset (Azure Blue) — used as the fallback. */
export const DEFAULT_SCHOOL_THEME: SchoolThemePresetMeta = SCHOOL_THEME_PRESETS[0];

/**
 * Resolve the active theme colors for a given SchoolIdentity. If the preset
 * is "custom", uses customColors (falling back to the default if missing).
 */
export function resolveSchoolTheme(identity: SchoolIdentity): SchoolThemeColors {
  if (identity.themePreset === "custom") {
    const c = identity.customColors;
    if (c?.primary && c?.deep && c?.light) {
      return { primary: c.primary, deep: c.deep, light: c.light };
    }
    // Malformed custom — fall through to default.
    return DEFAULT_SCHOOL_THEME.colors;
  }
  const preset = SCHOOL_THEME_PRESETS.find((p) => p.key === identity.themePreset);
  return (preset ?? DEFAULT_SCHOOL_THEME).colors;
}

/**
 * Compute the set of CSS custom properties that should be written to
 * <html> for a given school identity. These override the :root values
 * defined in globals.css so the entire shadcn/ui component library
 * re-themes automatically.
 *
 * Returns a flat record of { varName: value }.
 */
export function schoolThemeCssVars(identity: SchoolIdentity): Record<string, string> {
  const { primary, deep, light } = resolveSchoolTheme(identity);

  const key = identity.accentColor as keyof typeof ACCENT_HEX;
  const accent = ACCENT_HEX[key]?.base ?? (identity.accentColor && /^#[0-9a-f]{6}$/i.test(identity.accentColor) ? identity.accentColor : primary);
  return {
    "--brand-accent": accent,
    "--brand-accent-light": light,
    "--chart-1": primary,
    "--chart-2": light,
    "--chart-3": deep,
  };
}
