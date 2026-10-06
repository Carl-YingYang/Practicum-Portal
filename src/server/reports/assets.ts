import type { PortalAccount } from "@prisma/client";
import { randomUUID } from "node:crypto";
import sharp from "sharp";
import JSZip from "jszip";
import { db } from "@/server/database";
import { HttpError } from "@/server/security";
import { lockReport, reportResponse } from "./service";
export const MAX_ASSET_BYTES = 32 * 1024 * 1024;
export async function uploadReportAsset(
  id: string,
  account: PortalAccount,
  form: FormData,
) {
  const file = form.get("file"),
    revision = Number(form.get("revision")),
    kind = String(form.get("kind")),
    sectionId = String(form.get("sectionId") ?? "");
  if (!(file instanceof File) || file.size > MAX_ASSET_BYTES || !file.size)
    throw new HttpError(
      400,
      "Choose a nonempty PNG, JPEG, PDF or DOCX up to 32 MB.",
    );
  if (!["evidence", "reviewed"].includes(kind))
    throw new HttpError(400, "Unsupported upload type.");
  let bytes: Buffer = Buffer.from(await file.arrayBuffer()),
    mime = "",
    width: number | null = null,
    height: number | null = null;
  if (bytes.subarray(0, 5).toString() === "%PDF-") mime = "application/pdf";
  else if (bytes[0] === 0x50 && bytes[1] === 0x4b) {
    try {
      const zip = await JSZip.loadAsync(bytes);
      if (!zip.file("word/document.xml") || !zip.file("[Content_Types].xml"))
        throw new Error();
      mime =
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    } catch {
      throw new HttpError(400, "Choose a valid Word DOCX file.");
    }
  } else {
    try {
      const image = sharp(bytes, { limitInputPixels: 40000000 }).rotate();
      const info = await image.metadata();
      if (!["png", "jpeg"].includes(info.format ?? "")) throw new Error();
      const normalized = await image
        .toFormat(info.format as "png" | "jpeg")
        .toBuffer({ resolveWithObject: true });
      bytes = normalized.data;
      mime = info.format === "png" ? "image/png" : "image/jpeg";
      width = normalized.info.width;
      height = normalized.info.height;
    } catch {
      throw new HttpError(
        400,
        "Unsupported or damaged image. Use PNG, JPEG, PDF or DOCX.",
      );
    }
  }
  if (bytes.length > MAX_ASSET_BYTES)
    throw new HttpError(400, "Normalized image exceeds 32 MB.");
  if (kind === "reviewed" && !mime.includes("wordprocessingml"))
    throw new HttpError(400, "Upload the grammarian-reviewed DOCX.");
  const ext =
    mime === "image/png"
      ? "png"
      : mime === "image/jpeg"
        ? "jpg"
        : mime === "application/pdf"
          ? "pdf"
          : "docx";
  const name =
    file.name
      .replace(/[^\p{L}\p{N} ._-]/gu, "_")
      .slice(0, 150)
      .replace(/\.[^.]*$/, "") +
    "." +
    ext;
  await db.$transaction(async (tx) => {
    const r = await lockReport(tx, id, account, revision);
    if (!r.canEdit)
      throw new HttpError(403, "Only the author/coordinator uploads evidence.");
    if (
      kind === "evidence" &&
      !r.state.content.sections.some((s) => s.id === sectionId)
    )
      throw new HttpError(400, "Choose a report section.");
    if (
      kind === "reviewed" &&
      !r.state.versions.some((v) => v.id === sectionId)
    )
      throw new HttpError(
        400,
        "Choose the exported version that was reviewed.",
      );
    const totals = await tx.reportAsset.aggregate({
      where: { reportId: id },
      _sum: { size: true },
      _count: true,
    });
    if (
      totals._count >= 200 ||
      (totals._sum.size ?? 0) + bytes.length > 250 * 1024 * 1024
    )
      throw new HttpError(
        400,
        "Report storage limit reached (200 files / 250 MB).",
      );
    await tx.reportAsset.create({
      data: {
        id: randomUUID(),
        reportId: id,
        name,
        mime,
        kind,
        sectionId,
        bytes: new Uint8Array(bytes),
        width,
        height,
        size: bytes.length,
        order: await tx.reportAsset.count({
          where: { reportId: id, kind: "evidence", sectionId },
        }),
      },
    });
    const section = r.state.content.sections.find((s) => s.id === sectionId);
    if (section) {
      section.status = "draft";
      section.reviewedAt = null;
    }
    await tx.practicumReport.update({
      where: { id },
      data: { stateJson: JSON.stringify(r.state) },
    });
  });
  return reportResponse(id, account);
}
export async function updateAsset(
  id: string,
  account: PortalAccount,
  input: {
    revision: number;
    assetId: string;
    remove?: boolean;
    caption?: string;
    rotation?: number;
    order?: number;
  },
) {
  await db.$transaction(async (tx) => {
    const r = await lockReport(tx, id, account, input.revision);
    if (!r.canEdit)
      throw new HttpError(403, "Only the author/coordinator changes evidence.");
    const asset = await tx.reportAsset.findFirst({
      where: { id: input.assetId, reportId: id },
    });
    if (!asset || asset.kind !== "evidence")
      throw new HttpError(
        400,
        "Exported and reviewed documents are retained unchanged.",
      );
    if (
      input.caption !== undefined &&
      (typeof input.caption !== "string" || input.caption.length > 1000)
    )
      throw new HttpError(400, "Caption is too long.");
    if (
      input.rotation !== undefined &&
      ![0, 90, 180, 270].includes(input.rotation)
    )
      throw new HttpError(400, "Use quarter-turn rotation.");
    if (
      input.order !== undefined &&
      (!Number.isInteger(input.order) || input.order < 0 || input.order > 10000)
    )
      throw new HttpError(400, "Invalid evidence order.");
    if (input.remove) await tx.reportAsset.delete({ where: { id: asset.id } });
    else
      await tx.reportAsset.update({
        where: { id: asset.id },
        data: { caption: input.caption, rotation: input.rotation },
      });
    if (input.order !== undefined && !input.remove) {
      const siblings = await tx.reportAsset.findMany({
        where: { reportId: id, kind: "evidence", sectionId: asset.sectionId },
        orderBy: [{ order: "asc" }, { createdAt: "asc" }],
      });
      const from = siblings.findIndex((a) => a.id === asset.id);
      siblings.splice(from, 1);
      siblings.splice(Math.min(input.order, siblings.length), 0, asset);
      for (const [index, sibling] of siblings.entries())
        await tx.reportAsset.update({
          where: { id: sibling.id },
          data: { order: index },
        });
    }
    const section = r.state.content.sections.find(
      (s) => s.id === asset.sectionId,
    );
    if (section) {
      section.status = "draft";
      section.reviewedAt = null;
    }
    await tx.practicumReport.update({
      where: { id },
      data: { stateJson: JSON.stringify(r.state) },
    });
  });
  return reportResponse(id, account);
}
