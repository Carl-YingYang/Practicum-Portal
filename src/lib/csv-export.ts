/**
 * CSV export helper — no external libraries.
 *
 * - Properly escapes values containing commas, quotes, or newlines
 *   (wraps in double quotes; escapes internal quotes by doubling).
 * - Prepends a BOM (`\uFEFF`) so Excel reads the file as UTF-8.
 * - Triggers a download via a temporary `<a>` element + `URL.createObjectURL`.
 *
 * Safe to call only in the browser (relies on Blob, document, URL).
 */

function escapeCell(value: string | number): string {
  const str = typeof value === "number" ? String(value) : value ?? "";
  // Escape per RFC 4180: if the value contains a comma, double-quote, or
  // newline (CR/LF), wrap in double quotes and double any internal quotes.
  if (/[",\r\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function exportToCsv(
  filename: string,
  headers: string[],
  rows: (string | number)[][]
): void {
  if (typeof window === "undefined") return;

  const csvLines: string[] = [];
  if (headers.length > 0) {
    csvLines.push(headers.map(escapeCell).join(","));
  }
  for (const row of rows) {
    csvLines.push(row.map(escapeCell).join(","));
  }

  // BOM + CRLF line endings for maximum Excel compatibility.
  const csv = "\uFEFF" + csvLines.join("\r\n");

  const blob = new Blob([csv], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = filename.endsWith(".csv")
    ? filename
    : `${filename}.csv`;
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();

  // Cleanup
  document.body.removeChild(link);
  // Defer revoke so the download has time to start in all browsers.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
