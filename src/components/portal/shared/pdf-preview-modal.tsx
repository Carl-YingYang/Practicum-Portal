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
import { Printer, Download, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface PdfPreviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}

/**
 * Print-styled preview modal. "Download" simulates PDF generation then
 * opens the browser print dialog (wet signatures happen outside the system,
 * per blueprint — so on-screen review must match what prints).
 */
export function PdfPreviewModal({
  open,
  onOpenChange,
  title,
  subtitle,
  children,
}: PdfPreviewModalProps) {
  const [preparing, setPreparing] = React.useState(false);

  const handleDownload = () => {
    setPreparing(true);
    setTimeout(() => {
      setPreparing(false);
      onOpenChange(false);
      toast.success("PDF ready", {
        description: "Opening print dialog…",
      });
      setTimeout(() => window.print(), 200);
    }, 900);
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
        <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-3">
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
            ) : (
              <Download className="h-4 w-4" />
            )}
            {preparing ? "Preparing…" : "Download PDF"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
