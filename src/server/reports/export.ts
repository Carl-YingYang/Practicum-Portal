import type { PortalAccount } from "@prisma/client";
import { randomUUID } from "node:crypto";
import JSZip from "jszip";
import { db } from "@/server/database";
import { HttpError } from "@/server/security";
import {
  lockReport,
  reportResponse,
  reportFingerprint,
  sourceFingerprint,
} from "./service";
import { buildMappedWord } from "@/server/templates/word";
import { buildReportWord } from "./word";
import { reportChecks } from "@/domain/reports/checks";
export async function exportReport(
  id: string,
  account: PortalAccount,
  input: { revision: number; sectionIds?: string[]; allowIncomplete?: boolean },
) {
  await db.$transaction(
    async (tx) => {
      const r = await lockReport(tx, id, account, input.revision);
      if (!r.canEdit || r.actor.role === "supervisor")
        throw new HttpError(
          403,
          "Only the report author/coordinator creates export versions.",
        );
      if (
        input.sectionIds &&
        (!Array.isArray(input.sectionIds) ||
          !input.sectionIds.length ||
          input.sectionIds.some(
            (id) =>
              typeof id !== "string" ||
              !r.state.content.sections.some((s) => s.id === id && s.included),
          ))
      )
        throw new HttpError(400, "Choose included report sections.");
      const assets = await tx.reportAsset.findMany({
        where: { reportId: id, kind: "evidence" },
        orderBy: [{ order: "asc" }, { createdAt: "asc" }],
      });
      const selectedContent = {
        ...r.state.content,
        sections: r.state.content.sections.filter(
          (s) => !input.sectionIds || input.sectionIds.includes(s.id),
        ),
      };
      const checks = reportChecks(
        selectedContent,
        r.data,
        assets.map((a) => ({ ...a, kind: "evidence" as const })),
        r.state.binding,
      );
      const bound = sourceFingerprint(r.state.content, r.data);
      for (const s of selectedContent.sections.filter(
        (s) =>
          s.included &&
          s.status === "reviewed" &&
          ["journals", "forms", "attendance"].includes(s.kind),
      ))
        if (s.reviewedSource !== bound)
          checks.push(
            `${s.title}: linked records changed since review; reopen and review this section.`,
          );
      if (checks.length && !input.allowIncomplete)
        throw new HttpError(
          409,
          "Review the report checklist or explicitly export a draft.",
        );
      const versionId = randomUUID(),
        number = r.state.versions.length + 1;
      const version = r.state.binding
        ? await tx.practicumTemplateVersion.findUnique({
            where: { id: r.state.binding.versionId },
          })
        : null;
      if (r.state.binding && !version)
        throw new HttpError(409, "Assigned Word format is unavailable.");
      const bytes =
        version && r.state.binding
          ? await buildMappedWord(
              version.wordBytes,
              r.state.binding,
              r.state.content,
              r.data,
              assets,
              input.sectionIds,
            )
          : await buildReportWord(
              r.state.content,
              r.data,
              assets,
              input.sectionIds,
            );
      const name = `practicum-report-v${number}.docx`;
      const zip = new JSZip();
      zip.file(name, bytes);
      const selectedAssets = assets.filter((a) =>
        selectedContent.sections.some(
          (s) => s.id === a.sectionId && s.included,
        ),
      );
      for (const a of selectedAssets)
        zip.file(`evidence/${a.id.slice(0, 8)}-${a.name}`, a.bytes);
      zip.file(
        "REPORT-README.txt",
        "Open the DOCX in Microsoft Word. Update the table of contents (References > Update Table). Evidence files are original uploads; PDFs and DOCX attachments remain separate. Wet signatures and grammarian review are performed outside the portal. Draft/review statuses describe saved portal records, not signature validity.\n\n" +
          checks.join("\n"),
      );
      const fingerprint = reportFingerprint(
        r.state.content,
        r.data,
        assets,
        r.state.binding,
      );
      zip.file(
        "report-manifest.json",
        JSON.stringify(
          {
            version: number,
            template: r.state.binding,
            revision: input.revision,
            sourceFingerprint: fingerprint,
            content: selectedContent,
            assets: selectedAssets.map((a) => ({
              name: a.name,
              sectionId: a.sectionId,
              caption: a.caption,
              rotation: a.rotation,
            })),
            checks,
          },
          null,
          2,
        ),
      );
      const bundle = await zip.generateAsync({
        type: "nodebuffer",
        compression: "DEFLATE",
      });
      const totals = await tx.reportAsset.aggregate({
        where: { reportId: id },
        _sum: { size: true },
        _count: true,
      });
      if (
        totals._count + 2 > 200 ||
        (totals._sum.size ?? 0) + bytes.length + bundle.length >
          250 * 1024 * 1024
      )
        throw new HttpError(
          400,
          "Report storage limit reached. Start a separate report to retain more exports.",
        );
      for (const a of [
        {
          name,
          mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          bytes,
        },
        {
          name: `practicum-report-v${number}-with-evidence.zip`,
          mime: "application/zip",
          bytes: bundle,
        },
      ])
        await tx.reportAsset.create({
          data: {
            id: randomUUID(),
            reportId: id,
            sectionId: versionId,
            kind: "export",
            ...a,
            bytes: new Uint8Array(a.bytes),
            size: a.bytes.length,
          },
        });
      r.state.versions.push({
        id: versionId,
        number,
        revision: input.revision,
        sourceFingerprint: fingerprint,
        sectionIds: selectedContent.sections
          .filter((s) => s.included)
          .map((s) => s.id),
        createdAt: new Date().toISOString(),
      });
      await tx.practicumReport.update({
        where: { id },
        data: { stateJson: JSON.stringify(r.state) },
      });
    },
    { maxWait: 10000, timeout: 60000 },
  );
  return reportResponse(id, account);
}
