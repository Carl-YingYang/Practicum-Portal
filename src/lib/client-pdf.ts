import { escapeCell } from "./csv-export";
export interface PdfTableSpec {
  head: string[];
  body: (string | number)[][];
  /** Optional totals / summary row rendered at the bottom of the table. */
  foot?: (string | number)[];
  /** Column alignment: "left" | "center" | "right" (per column). Defaults to left. */
  align?: readonly ("left" | "center" | "right")[];
}

export interface PdfSectionSpec {
  /** Section heading rendered above the table/blocks. */
  heading?: string;
  /** A table block. */
  table?: PdfTableSpec;
  /** Key/value pairs rendered as a definition list. */
  keyValue?: { label: string; value: string }[];
  /** Free-text paragraphs (preserve line breaks). */
  paragraphs?: { label?: string; text: string }[];
}

export interface PdfReportSpec {
  /** Download filename (with or without .pdf). */
  filename: string;
  title: string;
  subtitle?: string;
  /** Summary stats strip below the header (label / value pairs). */
  meta?: { label: string; value: string }[];
  /** Ordered list of content sections. */
  sections: PdfSectionSpec[];
  /** Optional footer note (defaults to confidentiality notice). */
  footer?: string;
}

/** Normalise a filename to always end in .pdf */
/** Load PDF libraries only when a report is requested. */
export async function downloadPdfReport(spec: PdfReportSpec): Promise<string> {
  const renderer = await import("./pdf-renderer");
  return renderer.downloadPdfReport(spec);
}

export function downloadCsv(
  filename: string,
  head: string[],
  body: (string | number)[][],
): string {
  const escape = escapeCell;
  const lines = [
    head.map(escape).join(","),
    ...body.map((r) => r.map(escape).join(",")),
  ];
  const csv = "\uFEFF" + lines.join("\r\n"); // BOM for Excel UTF-8
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename.toLowerCase().endsWith(".csv")
    ? filename
    : `${filename}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return link.download;
}
