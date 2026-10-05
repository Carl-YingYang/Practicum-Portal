import { ACCENT_HEX, type SchoolIdentity, type SchoolThemePreset } from "./types";

// School colors emphasize controls, navigation and charts; main surfaces stay neutral.

export interface SchoolThemeColors {
  /** Brand color for actions, navigation and charts. */
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
    if (c && [c.primary, c.deep, c.light].every(isHexColor)) {
      return { primary: c.primary, deep: c.deep, light: c.light };
    }
    // Malformed custom — fall through to default.
    return DEFAULT_SCHOOL_THEME.colors;
  }
  const preset = SCHOOL_THEME_PRESETS.find((p) => p.key === identity.themePreset);
  return (preset ?? DEFAULT_SCHOOL_THEME).colors;
}

/** Reject partial/malformed custom colors before they reach CSS. */
export function isHexColor(value: unknown): value is string {
  return typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value);
}

function channels(hex: string): number[] {
  return [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
}

function mix(color: string, target: string, weight: number): string {
  return "#" + channels(color).map((v, i) =>
    Math.round(v + (channels(target)[i] - v) * weight).toString(16).padStart(2, "0")
  ).join("");
}

function luminance(hex: string): number {
  const rgb = channels(hex).map((v) => {
    const s = v / 255;
    return s <= .04045 ? s / 12.92 : ((s + .055) / 1.055) ** 2.4;
  });
  return rgb[0] * .2126 + rgb[1] * .7152 + rgb[2] * .0722;
}

export function colorContrast(a: string, b: string): number {
  const values = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (values[0] + .05) / (values[1] + .05);
}

export function contrastingText(background: string): string {
  return colorContrast(background, "#ffffff") >= colorContrast(background, "#171717")
    ? "#ffffff" : "#171717";
}

// Preserve the hue while making small text readable on neutral and tinted surfaces.
function readableColor(color: string, background: string, target: string): string {
  for (let i = 0; i <= 100; i++) {
    const candidate = mix(color, target, i / 100);
    if (colorContrast(candidate, background) >= 4.5) return candidate;
  }
  return target;
}

/** Shared by the application and unsaved settings preview, in both modes. */
export function schoolThemeCssVars(identity: SchoolIdentity): Record<string, string> {
  const { primary, deep, light } = resolveSchoolTheme(identity);
  const accent = ACCENT_HEX[identity.accentColor as keyof typeof ACCENT_HEX]?.base
    ?? (isHexColor(identity.accentColor) ? identity.accentColor : primary);
  const soft = mix(light, "#ffffff", .78);
  const darkSoft = mix(primary, "#1d1d1d", .82);
  const action = readableColor(primary, soft, "#000000");
  const darkAction = readableColor(primary, darkSoft, "#ffffff");
  return {
    "--school-primary": action,
    "--school-on-primary": contrastingText(action),
    "--school-primary-dark": darkAction,
    "--school-on-primary-dark": contrastingText(darkAction),
    "--school-soft": soft,
    "--school-soft-dark": darkSoft,
    "--brand-accent": accent,
    "--brand-accent-light": mix(accent, "#ffffff", .86),
    "--brand-on-accent": contrastingText(accent),
    "--chart-1": primary,
    "--chart-2": light,
    "--chart-3": deep,
  };
}
