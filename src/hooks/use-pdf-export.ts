"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";

/** One download at a time, with feedback only after generation completes. */
export function usePdfExport() {
  const running = useRef(false);
  const [exporting, setExporting] = useState(false);
  async function exportPdf(generate: () => Promise<unknown>) {
    if (running.current) return;
    running.current = true;
    setExporting(true);
    try {
      await generate();
      toast.success("PDF downloaded", { description: "Check your downloads folder." });
    } catch {
      toast.error("Couldn't generate the PDF", { description: "Please retry." });
    } finally {
      running.current = false;
      setExporting(false);
    }
  }
  return { exporting, exportPdf };
}
