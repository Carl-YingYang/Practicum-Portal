import type { ReportRecord } from "@/domain/reports/model";
export async function reportRequest<T = ReportRecord>(
  url: string,
  method = "GET",
  body?: unknown,
): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 65000);
  try {
    const form = body instanceof FormData;
    const response = await fetch(url, {
      method,
      credentials: "same-origin",
      cache: "no-store",
      headers:
        body && !form ? { "Content-Type": "application/json" } : undefined,
      body: body ? (form ? body : JSON.stringify(body)) : undefined,
      signal: controller.signal,
    });
    const text = await response.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      throw new Error(
        "The server returned an incomplete response. Your text is retained; retry or reload saved data.",
      );
    }
    if (!response.ok) throw new Error(data.error ?? "Report request failed.");
    return data as T;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError")
      throw new Error(
        "The report request timed out. Refresh saved data before retrying an export or upload.",
      );
    throw error;
  } finally {
    clearTimeout(timer);
  }
}
export function reportAssetUrl(reportId: string, assetId: string) {
  return `/api/reports/${reportId}/assets/${assetId}`;
}
