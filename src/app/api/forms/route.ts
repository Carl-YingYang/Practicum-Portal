import { NextResponse } from "next/server";
import { formDocuments, formAssignments, formSubmissions } from "@/lib/mock-data";
import {
  FORM_CATEGORY_LABELS,
  FORM_STATUS_LABELS,
  type FormCategory,
  type FormStatus,
} from "@/lib/types";

/**
 * GET /api/forms
 *
 * Read-only form-document index. Returns every coordinator-authored
 * form template (the internal block-based forms — NOT Google Forms)
 * with its category, status, version, block count, assignment count,
 * and submission count. Useful for auditing which forms are published
 * and how many responses each has received.
 *
 * Query params (all optional):
 *   ?status=draft|published|archived
 *   ?category=evaluation|journal|ojt|program|other
 *   ?q=<title|description>
 *
 * Response 200: { count, filters, generatedAt, rows }
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const params = url.searchParams;

  const status = params.get("status")?.trim() as FormStatus | "" | null;
  const category = params.get("category")?.trim() as FormCategory | "" | null;
  const q = params.get("q")?.trim().toLowerCase() || "";

  const rows = formDocuments
    .map((f) => {
      const assignments = formAssignments.filter((a) => a.formId === f.id);
      const submissions = formSubmissions.filter((s) => s.formId === f.id);
      return {
        id: f.id,
        title: f.title,
        description: f.description,
        category: f.category,
        categoryLabel: FORM_CATEGORY_LABELS[f.category],
        status: f.status,
        statusLabel: FORM_STATUS_LABELS[f.status],
        version: f.version,
        blockCount: f.blocks.length,
        assignmentCount: assignments.length,
        submissionCount: submissions.length,
        createdBy: f.createdBy,
        createdAt: f.createdAt,
        updatedAt: f.updatedAt,
        publishedAt: f.publishedAt,
      };
    })
    .filter((r) => {
      if (status && r.status !== status) return false;
      if (category && r.category !== category) return false;
      if (q) {
        const hay = `${r.title} ${r.description}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

  return NextResponse.json({
    count: rows.length,
    filters: {
      status: status || null,
      category: category || null,
      q: q || null,
    },
    generatedAt: new Date().toISOString(),
    rows,
  });
}
