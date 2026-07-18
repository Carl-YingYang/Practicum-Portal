/**
 * Client-side PDF generation utility.
 *
 * Generates real, downloadable .pdf files entirely in the browser using
 * jsPDF + jspdf-autotable. No backend involved — perfect for the showcase.
 *
 * Every report across the 3 roles (Student / Supervisor / Coordinator)
 * funnels through `downloadPdfReport(spec)`, which lays out:
 *   - A branded header (title + subtitle + generated-on timestamp)
 *   - An optional summary-stats strip (label/value pairs)
 *   - One or more sections, each either a table or a key/value + text block
 *   - A footer with page numbers + confidentiality notice
 *
 * The output is a vector PDF (selectable text, crisp tables, tiny file size)
 * that downloads directly to the user's machine via `doc.save()`.
 */

import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

// Page geometry (A4, points).
const PAGE_W = 595.28;
const PAGE_H = 841.89;
const MARGIN = 40;
const CONTENT_W = PAGE_W - MARGIN * 2;

// Brand palette (kept consistent with the app's teal accent).
const BRAND = {
  primary: "#0f766e" as const, // teal-700
  primaryLight: "#ccfbf1" as const, // teal-100
  ink: "#0f172a" as const, // slate-900
  inkSoft: "#475569" as const, // slate-600
  inkMuted: "#94a3b8" as const, // slate-400
  rule: "#e2e8f0" as const, // slate-200
  zebra: "#f8fafc" as const, // slate-50
};

export interface PdfTableSpec {
  head: string[];
  body: (string | number)[][];
  /** Optional totals / summary row rendered at the bottom of the table. */
  foot?: (string | number)[][];
  /** Column alignment: "left" | "center" | "right" (per column). Defaults to left. */
  align?: ("left" | "center" | "right")[];
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
function withPdfExt(name: string): string {
  return name.toLowerCase().endsWith(".pdf") ? name : `${name}.pdf`;
}

/**
 * Build and immediately download a styled PDF report.
 * Returns the filename that was saved.
 */
export function downloadPdfReport(spec: PdfReportSpec): string {
  const doc = new jsPDF({ unit: "pt", format: "a4", compress: true });
  const filename = withPdfExt(spec.filename);
  const generated = new Date().toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  // ---------- Header (drawn on every page via didDrawPage) ----------
  const drawHeader = (data: { pageNumber: number }) => {
    if (data.pageNumber === 1) return; // full header only on page 1
    // Running header on subsequent pages: title + page no.
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(BRAND.inkSoft);
    doc.text(spec.title, MARGIN, MARGIN - 12);
    doc.setFont("helvetica", "normal");
    doc.text(`Page ${data.pageNumber}`, PAGE_W - MARGIN, MARGIN - 12, {
      align: "right",
    });
  };

  // ---------- Page 1 header ----------
  let y = MARGIN;
  doc.setFillColor(BRAND.primary);
  doc.rect(0, 0, PAGE_W, 4, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(BRAND.ink);
  doc.text(spec.title, MARGIN, y + 14);
  y += 22;

  if (spec.subtitle) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(BRAND.inkSoft);
    const subLines = doc.splitTextToSize(spec.subtitle, CONTENT_W);
    doc.text(subLines, MARGIN, y + 10);
    y += subLines.length * 12;
  }

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(BRAND.inkMuted);
  doc.text(`Practicum Evaluation Portal · Generated ${generated}`, MARGIN, y + 10);
  y += 18;

  doc.setDrawColor(BRAND.rule);
  doc.setLineWidth(0.5);
  doc.line(MARGIN, y, PAGE_W - MARGIN, y);
  y += 12;

  // ---------- Summary stats strip ----------
  if (spec.meta && spec.meta.length > 0) {
    const cardW = CONTENT_W / spec.meta.length;
    const cardH = 38;
    spec.meta.forEach((m, i) => {
      const x = MARGIN + i * cardW;
      doc.setFillColor(BRAND.zebra);
      doc.roundedRect(x + 2, y, cardW - 4, cardH, 4, 4, "F");
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.setTextColor(BRAND.inkMuted);
      doc.text(m.label.toUpperCase(), x + 8, y + 12);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.setTextColor(BRAND.ink);
      doc.text(String(m.value), x + 8, y + 28);
    });
    y += cardH + 14;
  }

  // ---------- Sections ----------
  for (const section of spec.sections) {
    // Ensure room for at least a heading + 2 rows; else new page.
    if (y > PAGE_H - MARGIN - 80) {
      doc.addPage();
      y = MARGIN;
    }

    if (section.heading) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(BRAND.primary);
      doc.text(section.heading, MARGIN, y + 4);
      y += 12;
      doc.setDrawColor(BRAND.primaryLight);
      doc.setLineWidth(1.5);
      doc.line(MARGIN, y, MARGIN + 24, y);
      y += 8;
    }

    if (section.table) {
      const align = section.table.align ?? section.table.head.map(() => "left");
      autoTable(doc, {
        head: [section.table.head],
        body: section.table.body,
        foot: section.table.foot ? [section.table.foot] : undefined,
        startY: y,
        margin: { left: MARGIN, right: MARGIN, top: MARGIN, bottom: MARGIN },
        theme: "striped",
        styles: {
          font: "helvetica",
          fontSize: 8.5,
          cellPadding: { top: 4, bottom: 4, left: 5, right: 5 },
          textColor: BRAND.ink,
          lineColor: BRAND.rule,
          lineWidth: 0.25,
          overflow: "linebreak",
          cellWidth: "auto",
        },
        headStyles: {
          fillColor: BRAND.primary,
          textColor: "#ffffff",
          fontStyle: "bold",
          fontSize: 8.5,
        },
        footStyles: {
          fillColor: BRAND.primaryLight,
          textColor: BRAND.ink,
          fontStyle: "bold",
        },
        alternateRowStyles: { fillColor: BRAND.zebra },
        columnStyles: section.table.head.map((_, i) => ({
          halign:
            align[i] === "right"
              ? "right"
              : align[i] === "center"
                ? "center"
                : "left",
        })),
        didDrawPage: drawHeader,
      });
      // @ts-expect-error lastAutoTableFinalY is added by the plugin at runtime.
      y = (doc.lastAutoTable?.finalY ?? y) + 14;
    }

    if (section.keyValue && section.keyValue.length > 0) {
      const colW = CONTENT_W / 2;
      const rowH = 22;
      section.keyValue.forEach((kv, i) => {
        const col = i % 2;
        const row = Math.floor(i / 2);
        const x = MARGIN + col * colW;
        const ry = y + row * rowH;
        if (ry > PAGE_H - MARGIN - rowH) {
          doc.addPage();
          y = MARGIN;
        }
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7);
        doc.setTextColor(BRAND.inkMuted);
        doc.text(kv.label.toUpperCase(), x, ry);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        doc.setTextColor(BRAND.ink);
        doc.text(String(kv.value), x, ry + 12);
      });
      y += Math.ceil(section.keyValue.length / 2) * rowH + 10;
    }

    if (section.paragraphs && section.paragraphs.length > 0) {
      for (const p of section.paragraphs) {
        if (p.label) {
          doc.setFont("helvetica", "bold");
          doc.setFontSize(8);
          doc.setTextColor(BRAND.inkSoft);
          doc.text(p.label.toUpperCase(), MARGIN, y + 4);
          y += 12;
        }
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9.5);
        doc.setTextColor(BRAND.ink);
        const lines = doc.splitTextToSize(p.text || "—", CONTENT_W);
        // Paginate long paragraphs.
        for (const line of lines) {
          if (y > PAGE_H - MARGIN - 14) {
            doc.addPage();
            y = MARGIN;
          }
          doc.text(line, MARGIN, y + 4);
          y += 12;
        }
        y += 6;
      }
    }
  }

  // ---------- Footer (page numbers + notice) on every page ----------
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setDrawColor(BRAND.rule);
    doc.setLineWidth(0.5);
    doc.line(MARGIN, PAGE_H - MARGIN + 8, PAGE_W - MARGIN, PAGE_H - MARGIN + 8);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(BRAND.inkMuted);
    const notice =
      spec.footer ??
      "Practicum Evaluation Portal · Confidential · For official practicum records only";
    doc.text(notice, MARGIN, PAGE_H - MARGIN + 18);
    doc.text(`Page ${i} of ${pageCount}`, PAGE_W - MARGIN, PAGE_H - MARGIN + 18, {
      align: "right",
    });
  }

  doc.save(filename);
  return filename;
}

// ============================================================
// CSV export helper (for any future "Export CSV" buttons)
// ============================================================

/**
 * Build and download a CSV file. Values are RFC-4180 quoted.
 */
export function downloadCsv(
  filename: string,
  head: string[],
  body: (string | number)[][],
): string {
  const escape = (v: string | number) => {
    const s = String(v ?? "");
    if (/[",\n\r]/.test(s)) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };
  const lines = [head.map(escape).join(","), ...body.map((r) => r.map(escape).join(","))];
  const csv = "\uFEFF" + lines.join("\r\n"); // BOM for Excel UTF-8
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename.toLowerCase().endsWith(".csv") ? filename : `${filename}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return link.download;
}
