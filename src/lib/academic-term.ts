import type { ToolsConfig } from "./types";

export function currentAcademicTerm(date = new Date()): string {
  const year = date.getFullYear() - (date.getMonth() < 7 ? 1 : 0);
  return `${year}-${year + 1}`;
}
export function defaultTermDates(
  date = new Date(),
): Pick<ToolsConfig, "termStart" | "termEnd"> {
  const year = Number(currentAcademicTerm(date).slice(0, 4));
  return { termStart: `${year}-08-01`, termEnd: `${year + 1}-07-31` };
}
export function configuredTerm(
  config: Pick<ToolsConfig, "termStart" | "termEnd">,
): string {
  return `${config.termStart} — ${config.termEnd}`;
}
