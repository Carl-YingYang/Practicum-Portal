import JSZip from "jszip";
import { xml2js } from "xml-js";
import {
  patchDocument,
  PatchType,
  TextRun,
  Paragraph,
  type IPatch,
} from "docx";
import type { ReportAsset } from "@prisma/client";
import type { ReportContent } from "@/domain/reports/model";
import type { TemplateBinding } from "@/domain/templates/model";
import type { PortalData } from "@/domain/portal/snapshot";
import { reportSources } from "@/domain/reports/sources";
import { buildSectionBlocks } from "@/server/reports/word";
import { attendanceMinutes } from "@/domain/reports/checks";
import { HttpError } from "@/server/security";
const decode = (s: string) =>
  s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&#(x[0-9a-f]+|\d+);/gi, (_, v: string) =>
      String.fromCodePoint(
        v.startsWith("x") ? parseInt(v.slice(1), 16) : Number(v),
      ),
    );
export async function inspectTemplateWord(
  bytes: Uint8Array,
  requireSlots = true,
) {
  if (!bytes.length || bytes.length > 20 * 1024 * 1024)
    throw new HttpError(400, "Choose a DOCX up to 20 MB.");
  try {
    const zip = await JSZip.loadAsync(bytes);
    const entries = Object.values(zip.files);
    if (
      entries.length > 500 ||
      !zip.file("word/document.xml") ||
      !zip.file("[Content_Types].xml")
    )
      throw new Error("Invalid Word package.");
    let size = 0;
    for (const e of entries) {
      size +=
        (e as unknown as { _data?: { uncompressedSize?: number } })._data
          ?.uncompressedSize ?? 0;
      if (size > 80 * 1024 * 1024 || /vbaProject|embeddings\//i.test(e.name))
        throw new Error("Oversized or embedded executable package.");
      if (e.name.endsWith(".rels")) {
        const rels = await e.async("string");
        for (const rel of rels.matchAll(/<Relationship\b[^>]*>/g))
          if (
            /TargetMode=["']External/.test(rel[0]) &&
            !/Type=["'][^"']*\/hyperlink["']/.test(rel[0])
          )
            throw new Error("External document resources are not supported.");
      }
    }
    const slots: string[] = [],
      preview: string[] = [],
      counts = new Map<string, number>();
    for (const e of entries.filter((e) =>
      /^word\/(document|header\d*|footer\d*)\.xml$/.test(e.name),
    )) {
      const xml = await e.async("string");
      if (xml.length > 4 * 1024 * 1024 || /<!DOCTYPE|<w:altChunk/.test(xml))
        throw new Error("Unsupported document content.");
      xml2js(xml, { compact: false });
      for (const match of xml.matchAll(/<w:p\b[^>]*>[\s\S]*?<\/w:p>/g)) {
        const text = [...match[0].matchAll(/<w:t\b[^>]*>([\s\S]*?)<\/w:t>/g)]
          .map((m) => decode(m[1]))
          .join("");
        if (e.name === "word/document.xml" && text.trim())
          preview.push(text.slice(0, 1500));
        for (const tag of text.matchAll(/\{\{([^{}]+)\}\}/g)) {
          const key = tag[1];
          if (!/^[a-z][a-z0-9_]{0,79}$/.test(key))
            throw new Error(`Invalid placeholder ${key}.`);
          if (key.startsWith("section_") || key === "extra_sections") {
            const prefix = xml.slice(0, match.index ?? 0);
            if (
              (prefix.match(/<w:tbl\b[^>]*>/g)?.length ?? 0) >
              (prefix.match(/<\/w:tbl>/g)?.length ?? 0)
            )
              throw new Error(`{{${key}}} belongs outside table cells.`);
            if (e.name !== "word/document.xml" || text.trim() !== tag[0])
              throw new Error(`{{${key}}} needs its own body paragraph.`);
            counts.set(key, (counts.get(key) ?? 0) + 1);
            if (counts.get(key)! > 1)
              throw new Error(`Use {{${key}}} only once.`);
          }
          slots.push(key);
        }
      }
    }
    if (requireSlots && !slots.length)
      throw new Error(
        "Add named placeholders to the blank Word format, or start with the pilot format.",
      );
    return { slots: [...new Set(slots)], preview: preview.slice(0, 300) };
  } catch (e) {
    if (e instanceof HttpError) throw e;
    throw new HttpError(
      400,
      `Cannot use this DOCX: ${e instanceof Error ? e.message : "invalid package"}`,
    );
  }
}
export async function buildMappedWord(
  source: Uint8Array,
  binding: TemplateBinding,
  content: ReportContent,
  data: PortalData,
  assets: ReportAsset[],
  sectionIds?: string[],
) {
  data = reportSources(content, data, binding);
  const student = data.students.find((s) => s.id === content.studentIds[0])!;
  const company = data.companies.find((c) => c.id === student.companyId);
  const supervisor = data.supervisors.find(
    (s) => s.id === student.supervisorId,
  );
  const values: Record<string, string> = {
    report_title: content.title,
    student_name: student.name,
    student_number: student.studentNumber,
    course: student.course,
    company_name: company?.name ?? "",
    company_address: [
      company?.addressLine,
      company?.barangay,
      company?.city,
      company?.province,
    ]
      .filter(Boolean)
      .join(", "),
    supervisor_name: supervisor?.name ?? "",
    school_name: data.schoolIdentity.name,
    placement_start: content.settings.start,
    placement_end: content.settings.end,
    required_hours: String(student.requiredHours),
    completed_hours: (attendanceMinutes(data, student.id) / 60).toFixed(2),
    report_date: new Date().toISOString().slice(0, 10),
  };
  const patches: Record<string, IPatch> = {};
  for (const [key, value] of Object.entries(values))
    patches[key] = {
      type: PatchType.PARAGRAPH,
      children: [new TextRun(value)],
    };
  for (const def of binding.sections) {
    const s = content.sections.find((s) => s.template === def.key);
    const blocks =
      s && s.included && (!sectionIds || sectionIds.includes(s.id))
        ? await buildSectionBlocks(
            { ...content, sections: [s] },
            reportSources(content, data, binding, def.key),
            assets,
            undefined,
            [def],
          )
        : [];
    // The mapped section already provides its own heading; skip the repeated member divider.
    patches[`section_${def.key}`] = {
      type: PatchType.DOCUMENT,
      children: blocks.length ? blocks.slice(2) : [new Paragraph("")],
    };
  }
  const extras = content.sections.filter(
    (s) => !binding.sections.some((d) => d.key === s.template),
  );
  if (binding.allowStudentExtras)
    patches.extra_sections = {
      type: PatchType.DOCUMENT,
      children: extras.length
        ? (
            await buildSectionBlocks(
              { ...content, sections: extras },
              data,
              assets,
              sectionIds,
            )
          ).slice(2)
        : [new Paragraph("")],
    };
  if (sectionIds) {
    const zip = await JSZip.loadAsync(source),
      xml = await zip.file("word/document.xml")!.async("string");
    const tags = content.sections
      .filter(
        (s) =>
          s.included &&
          sectionIds.includes(s.id) &&
          binding.sections.some((d) => d.key === s.template),
      )
      .map((s) => `section_${s.template}`);
    if (
      binding.allowStudentExtras &&
      content.sections.some(
        (s) =>
          s.included &&
          sectionIds.includes(s.id) &&
          !binding.sections.some((d) => d.key === s.template),
      )
    )
      tags.push("extra_sections");
    const geometry =
      [...xml.matchAll(/<w:sectPr\b[\s\S]*?<\/w:sectPr>/g)].at(-1)?.[0] ?? "";
    const body =
      tags
        .map((tag) => `<w:p><w:r><w:t>{{${tag}}}</w:t></w:r></w:p>`)
        .join("") + geometry;
    zip.file(
      "word/document.xml",
      xml.replace(
        /(<w:body\b[^>]*>)[\s\S]*?<\/w:body>/,
        (_, opening) => opening + body + "</w:body>",
      ),
    );
    source = await zip.generateAsync({
      type: "uint8array",
      compression: "DEFLATE",
    });
  }
  return patchDocument({
    outputType: "nodebuffer",
    data: source,
    patches,
    keepOriginalStyles: true,
    recursive: true,
  });
}

/** Only owned slot paragraphs change; surrounding Word content and geometry stay intact. */
export async function syncWordSlots(
  source: Uint8Array,
  keys: string[],
  extras: boolean,
) {
  await inspectTemplateWord(source, false);
  const zip = await JSZip.loadAsync(source),
    file = zip.file("word/document.xml")!;
  let xml = await file.async("string");
  const slots = [
    ...keys.map((k) => `section_${k}`),
    ...(extras ? ["extra_sections"] : []),
  ];
  let next = 0,
    found = false;
  xml = xml.replace(/<w:p\b[^>]*>[\s\S]*?<\/w:p>/g, (paragraph) => {
    const text = [...paragraph.matchAll(/<w:t\b[^>]*>([\s\S]*?)<\/w:t>/g)]
      .map((m) => decode(m[1]))
      .join("")
      .trim();
    if (!/^\{\{(section_[a-z0-9_]+|extra_sections)\}\}$/.test(text))
      return paragraph;
    found = true;
    return next < slots.length
      ? `<w:p><w:r><w:t>{{${slots[next++]}}}</w:t></w:r></w:p>`
      : "";
  });
  const remaining = slots
    .slice(next)
    .map((k) => `<w:p><w:r><w:t>{{${k}}}</w:t></w:r></w:p>`)
    .join("");
  // Insert trailing/new slots before the final section properties. Existing fixed content is retained.
  if (remaining)
    xml = xml.replace(
      /(<w:sectPr\b[\s\S]*?<\/w:sectPr>\s*)?<\/w:body>/,
      (match) => remaining + match,
    );
  if (!found && !remaining)
    throw new HttpError(400, "Add at least one section.");
  zip.file("word/document.xml", xml);
  return zip.generateAsync({ type: "uint8array", compression: "DEFLATE" });
}
