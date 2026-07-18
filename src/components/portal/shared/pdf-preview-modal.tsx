"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer, Download, Loader2, Check } from "lucide-react";
import { toast } from "sonner";

interface PdfPreviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  /**
   * Real PDF download handler. When provided, the "Download PDF" button
   * calls this instead of falling back to `window.print()`. The parent
   * typically builds a `PdfReportSpec` from the same data shown in the
   * preview and calls `downloadPdfReport(spec)` — producing a real .pdf
   * file that lands in the user's downloads folder.
   */
  onDownloadPdf?: () => void | Promise<void>;
  /** Optional download filename hint (used in toast messages). */
  downloadFilename?: string;
}

/**
 * Print-styled preview modal. "Download PDF" produces a real downloadable
 * .pdf file when `onDownloadPdf` is provided (preferred). "Print" opens the
 * browser print dialog (for physical printing / save-as-PDF fallback).
 *
 * Wet signatures happen outside the system per blueprint — on-screen review
 * matches what prints/downloads.
 */
export function PdfPreviewModal({
  open,
  onOpenChange,
  title,
  subtitle,
  children,
  onDownloadPdf,
  downloadFilename,
}: PdfPreviewModalProps) {
  const [preparing, setPreparing] = React.useState(false);
  const [done, setDone] = React.useState(false);

  const handleDownload = async () => {
    if (preparing) return;
    setPreparing(true);
    setDone(false);
    try {
      // Brief delay for UX realism (the PDF build itself is synchronous
      // and near-instant for these report sizes).
      await new Promise((r) => setTimeout(r, 350));
      if (onDownloadPdf) {
        await onDownloadPdf();
      } else {
        // Fallback: open the browser print dialog (legacy behaviour).
        window.print();
      }
      setDone(true);
      toast.success("PDF downloaded", {
        description: downloadFilename
          ? `${downloadFilename} saved to your downloads.`
          : "Check your downloads folder.",
      });
      setTimeout(() => setDone(false), 2200);
    } catch (err) {
      console.error("[PdfPreviewModal] download failed", err);
      toast.error("Couldn't generate the PDF", {
        description: "Please try the Print button as a fallback.",
      });
    } finally {
      setPreparing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="no-print max-w-3xl gap-0 overflow-hidden p-0 sm:max-w-3xl">
        <DialogHeader className="border-b border-border px-5 py-4">
          <DialogTitle className="text-base">{title}</DialogTitle>
          {subtitle && (
            <DialogDescription className="text-xs">{subtitle}</DialogDescription>
          )}
        </DialogHeader>
        <div className="max-h-[60vh] overflow-y-auto scroll-area-custom bg-slate-100 p-5 dark:bg-slate-900">
          <div className="print-area mx-auto max-w-2xl rounded-lg bg-white p-8 shadow-sm">
            {children}
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border px-5 py-3">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button variant="outline" onClick={() => window.print()}>
            <Printer className="h-4 w-4" />
            Print
          </Button>
          <Button onClick={handleDownload} disabled={preparing}>
            {preparing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : done ? (
              <Check className="h-4 w-4" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            {preparing ? "Generating…" : done ? "Downloaded" : "Download PDF"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
