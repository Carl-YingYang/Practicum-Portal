"use client";
import { FormBlockRenderer } from "../shared/form-block-renderer";
import { accountUsers } from "@/lib/prototype";
import ReactMarkdown from "react-markdown";
import type { ReportSection, ReportAssetInfo } from "@/domain/reports/model";
import { useAppStore } from "@/store/use-app-store";
import { reportAssetUrl } from "@/client/reports";
import { journalPeriod } from "@/domain/journal-period";
import { attendanceMinutes, durationLabel } from "@/domain/reports/checks";
import { snapshot } from "@/domain/portal/snapshot";
export function ReportSectionPreview({
  section,
  assets,
  reportId,
  formIds,
  sourceData,
}: {
  section: ReportSection;
  assets: ReportAssetInfo[];
  reportId: string;
  formIds?: string[];
  sourceData?: import("@/domain/portal/snapshot").PortalData;
}) {
  const state = useAppStore(),
    data = sourceData ?? snapshot(state);
  return (
    <div className="min-w-0 space-y-4 break-words text-sm leading-relaxed">
      {!!section.body && (
        <div className="space-y-3 [&_h1]:text-lg [&_h1]:font-semibold [&_h2]:font-semibold [&_li]:ml-5 [&_ol]:list-decimal [&_ul]:list-disc">
          <ReactMarkdown>{section.body}</ReactMarkdown>
        </div>
      )}
      {section.kind === "journals" &&
        data.journals
          .filter((j) => j.studentId === section.studentId)
          .sort((a, b) => a.date.localeCompare(b.date))
          .map((j, index) => {
            const period = journalPeriod(j.date, j.cadence ?? "weekly");
            return (
              <article key={j.id} className="space-y-3 rounded-lg border p-3">
                <h3 className="font-medium">
                  Journal {index + 1} · {period.start} – {period.end}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {j.status} · Cumulative:{" "}
                  {durationLabel(
                    attendanceMinutes(data, section.studentId!, period.endMs),
                  )}
                </p>
                <div>
                  <strong>Tasks assigned</strong>
                  <p className="whitespace-pre-wrap">{j.tasks}</p>
                </div>
                <div>
                  <strong>Learnings</strong>
                  <p className="whitespace-pre-wrap">{j.learnings}</p>
                </div>
              </article>
            );
          })}
      {section.kind === "attendance" && (
        <>
          <p>
            Completed attendance:{" "}
            <strong>
              {durationLabel(attendanceMinutes(data, section.studentId!))}
            </strong>
          </p>
          <div className="max-w-full overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr>
                  <th className="p-2">Clock in</th>
                  <th className="p-2">Clock out</th>
                </tr>
              </thead>
              <tbody>
                {data.timeLogs
                  .filter(
                    (t) =>
                      t.userId === section.studentId &&
                      t.role === "student" &&
                      t.clockOutAt,
                  )
                  .map((t) => (
                    <tr key={t.id} className="border-t">
                      <td className="p-2">
                        {new Date(t.clockInAt).toLocaleString("en-PH", {
                          timeZone: "Asia/Manila",
                        })}
                      </td>
                      <td className="p-2">
                        {new Date(t.clockOutAt!).toLocaleString("en-PH", {
                          timeZone: "Asia/Manila",
                        })}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </>
      )}
      {section.kind === "forms" && (
        <div className="space-y-3">
          <p className="rounded-lg bg-muted/40 p-3">
            Approved form responses and submitted evaluations are assembled
            here. Official wet-signed sheets stay as attachments.
          </p>
          {data.formSubmissions
            .filter(
              (sub) =>
                sub.status === "approved" &&
                (!formIds?.length || formIds.includes(sub.formId)) &&
                (sub.targetStudentId === section.studentId ||
                  sub.userId ===
                    accountUsers(data).find(
                      (u) => u.studentId === section.studentId,
                    )?.id),
            )
            .map((sub) => {
              const form =
                sub.formSnapshot ??
                data.formDocuments.find((f) => f.id === sub.formId);
              return form ? (
                <details key={sub.id} className="rounded-lg border p-3">
                  <summary className="cursor-pointer break-words font-medium">
                    {form.title} · v{form.version}
                  </summary>
                  <div className="mt-3 min-w-0 space-y-3">
                    {form.blocks.map((block) => (
                      <FormBlockRenderer
                        key={block.id}
                        block={block}
                        values={sub.values}
                      />
                    ))}
                  </div>
                </details>
              ) : null;
            })}
          {data.evaluations
            .filter(
              (e) =>
                !formIds?.length &&
                e.studentId === section.studentId &&
                e.status === "submitted",
            )
            .map((e) => (
              <article key={e.id} className="rounded-lg border p-3">
                <h3 className="font-medium">
                  Supervisor evaluation · {e.term}
                </h3>
                <p className="mt-2 whitespace-pre-wrap">
                  Strengths: {e.strengths}
                </p>
                <p className="mt-2 whitespace-pre-wrap">
                  Areas for improvement: {e.weaknesses}
                </p>
                <p className="mt-2 whitespace-pre-wrap">
                  Recommendations: {e.recommendations}
                </p>
              </article>
            ))}
        </div>
      )}
      {assets
        .filter((a) => a.kind === "evidence" && a.sectionId === section.id)
        .map((a) => (
          <figure key={a.id} className="space-y-2 rounded-lg border p-3">
            {a.mime.startsWith("image/") ? (
              <div className="flex h-64 items-center justify-center overflow-hidden">
                <img
                  src={reportAssetUrl(reportId, a.id)}
                  alt={a.caption || a.name}
                  loading="lazy"
                  className="max-h-56 max-w-full object-contain"
                  style={{ transform: `rotate(${a.rotation}deg)` }}
                />
              </div>
            ) : (
              <a
                className="break-words text-primary underline"
                href={reportAssetUrl(reportId, a.id)}
                download
              >
                {a.name}
              </a>
            )}
            <figcaption className="text-center text-xs text-muted-foreground">
              {a.caption || a.name}
            </figcaption>
          </figure>
        ))}
    </div>
  );
}
