const assert = require("node:assert/strict");
const { randomUUID } = require("node:crypto");
const fs = require("node:fs");
const { spawnSync } = require("node:child_process");
const JSZip = require("jszip");
const sharp = require("sharp");
const { load } = require("./load-ts.cjs");
(async () => {
  const { createPortalStore } = load("src/domain/portal/engine.ts");
  const store = createPortalStore(randomUUID);
  const { snapshot } = load("src/domain/portal/snapshot.ts");
  const data = snapshot(store.getState());
  const { createReportContent, reportContentErrors } = load(
    "src/domain/reports/model.ts",
  );
  const { attendanceMinutes } = load("src/domain/reports/checks.ts");
  const { buildReportWord } = load("src/server/reports/word.ts");
  const { formStructureErrors, ratingResponseErrors, formBlockVisible } = load(
    "src/domain/form-templates.ts",
  );
  const students = data.students.slice(0, 2);
  const content = createReportContent(
    students.map((s) => s.id),
    randomUUID,
  );
  content.title = "Fictional Practicum Quality Check";
  for (const s of content.sections) {
    s.included = [
      "introduction",
      "assignment",
      "journals",
      "reflection",
      "attendance",
      "pictorial",
    ].includes(s.template);
    s.body =
      s.kind === "narrative"
        ? Array.from(
            { length: s.template === "reflection" ? 70 : 3 },
            (_, i) =>
              `Paragraph ${i + 1}: A detailed fictional narrative that remains editable and complete in Word. This sentence documents work, learning and recommendations.`,
          ).join("\n\n")
        : "";
  }
  content.sections.find((s) => s.template === "assignment").body =
    "# Deliverables\n- Implemented test tooling\n- Reviewed usability\n\n| Task | Result |\n| --- | --- |\n| Drafting | Complete |";
  data.timeLogs = [
    {
      id: "t1",
      userId: students[0].id,
      role: "student",
      clockInAt: "2026-06-03T00:00:00Z",
      clockOutAt: "2026-06-03T08:44:00Z",
      durationMs: 31440000,
      createdAt: "2026-06-03T00:00:00Z",
    },
    {
      id: "overlap",
      userId: students[0].id,
      role: "student",
      clockInAt: "2026-06-03T00:00:00Z",
      clockOutAt: "2026-06-03T08:44:00Z",
      durationMs: 31440000,
      createdAt: "2026-06-03T00:00:00Z",
    },
  ];
  assert.equal(attendanceMinutes(data, students[0].id), 524);
  data.journals = students.flatMap((s, index) =>
    Array.from({ length: index ? 7 : 6 }, (_, n) => ({
      id: randomUUID(),
      studentId: s.id,
      date: `2026-06-${String(1 + n * 4).padStart(2, "0")}`,
      cadence: "twice-weekly",
      hours: 8.5,
      tasks: Array.from(
        { length: 22 },
        (_, i) => `- Completed fictional task ${i + 1}`,
      ).join("\n"),
      learnings: "Reflected on testing and teamwork. ".repeat(25),
      status: "approved",
      createdAt: "2026-06-01T00:00:00Z",
    })),
  );
  const png = await sharp({
    create: { width: 400, height: 200, channels: 3, background: "#597c99" },
  })
    .png()
    .toBuffer();
  const assets = content.sections
    .filter((s) => s.template === "pictorial")
    .map((s, index) => ({
      id: randomUUID(),
      reportId: "fixture",
      name: `evidence-${index}.png`,
      mime: "image/png",
      kind: "evidence",
      sectionId: s.id,
      caption: `Fictional evidence ${index}`,
      rotation: index ? 90 : 0,
      width: 400,
      height: 200,
      bytes: png,
      size: png.length,
      order: index,
      createdAt: new Date(),
    }));
  const buffer = await buildReportWord(content, data, assets);
  const zip = await JSZip.loadAsync(buffer);
  const xml = await zip.file("word/document.xml").async("string");
  for (const text of [
    "Fictional Practicum Quality Check",
    "Paragraph 70",
    "Cumulative Number of Hours",
    "8 h 44 min",
    "Wet signature",
    "Journal 7",
  ])
    assert.ok(xml.includes(text), text);
  assert.ok(xml.includes("TOC"));
  assert.ok(xml.includes('w:left="2160"'));
  assert.ok(zip.file("word/footer1.xml"));
  assert.ok(Object.keys(zip.files).some((n) => n.startsWith("word/media/")));
  assert.equal((xml.match(/Company Overview/g) || []).length, 0);
  const invalid = structuredClone(content);
  invalid.settings.start = "2026-13-01";
  assert.ok(reportContentErrors(invalid).length);
  const duplicate = structuredClone(content);
  duplicate.sections[1].id = duplicate.sections[0].id;
  assert.ok(reportContentErrors(duplicate).length);
  const matrix = {
    id: "m",
    type: "rating-table",
    scoreMode: true,
    required: true,
    criteria: [{ id: "c", label: "Criterion", max: "20%" }],
  };
  assert.deepEqual(ratingResponseErrors(matrix, { c: "0" }), []);
  assert.ok(ratingResponseErrors(matrix, { c: "21" }).length);
  assert.ok(
    formStructureErrors({
      title: "Matrix",
      blocks: [{ ...matrix, scoreMode: false, scaleLabels: ["Good", "Good"] }],
    }).length,
  );
  const conditional = {
    id: "detail",
    type: "fill-in",
    label: "Details",
    required: true,
    showIf: { blockId: "choice", equals: "yes" },
  };
  assert.equal(formBlockVisible(conditional, { choice: " YES " }), true);
  assert.equal(formBlockVisible(conditional, { choice: "no" }), false);
  assert.deepEqual(
    formStructureErrors({
      title: "Conditional",
      blocks: [
        { id: "choice", type: "fill-in", label: "Need support?" },
        conditional,
      ],
    }),
    [],
  );
  assert.ok(
    formStructureErrors({ title: "Invalid condition", blocks: [conditional] })
      .length,
  );
  fs.mkdirSync("/tmp/practo-report-tests", { recursive: true });
  fs.writeFileSync("/tmp/practo-report-tests/long-report.docx", buffer);
  const lo = spawnSync(
    "soffice",
    [
      "-env:UserInstallation=file:///tmp/practo-report-lo",
      "--headless",
      "--convert-to",
      "pdf",
      "--outdir",
      "/tmp/practo-report-tests",
      "/tmp/practo-report-tests/long-report.docx",
    ],
    { encoding: "utf8", timeout: 60000 },
  );
  assert.equal(lo.status, 0, lo.stdout + lo.stderr);
  const check = spawnSync(
    "python",
    [
      "-c",
      `import fitz\np=fitz.open('/tmp/practo-report-tests/long-report.pdf')\ntext=' '.join(x.get_text() for x in p)\nassert 'Paragraph 70' in text\nassert 'Journal 7' in text\nassert len(p)>10\nprint('Long Word/PDF reference:',len(p),'pages; final narrative and seventh journal retained')`,
    ],
    { encoding: "utf8" },
  );
  assert.equal(check.status, 0, check.stdout + check.stderr);
  console.log(check.stdout.trim());
  console.log(
    "Report DOCX structure, exact minutes, long content, images, headings, tables and form bounds passed.",
  );
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
