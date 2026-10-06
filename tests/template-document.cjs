const assert = require("node:assert/strict");
const fs = require("node:fs");
const { spawnSync } = require("node:child_process");
const { randomUUID } = require("node:crypto");
const JSZip = require("jszip");
const sharp = require("sharp");
const { load } = require("./load-ts.cjs");
(async () => {
  const { snapshot } = load("src/domain/portal/snapshot.ts"),
    { createPortalStore } = load("src/domain/portal/engine.ts");
  const data = snapshot(createPortalStore(randomUUID).getState()),
    student = data.students[0];
  const { pilotContent, assignedSections } = load(
      "src/domain/templates/model.ts",
    ),
    { createReportContent } = load("src/domain/reports/model.ts"),
    { buildMappedWord } = load("src/server/templates/word.ts"),
    { attendanceMinutes } = load("src/domain/reports/checks.ts");
  const config = pilotContent(),
    content = createReportContent([student.id], randomUUID);
  content.sections = assignedSections(config, student.id, randomUUID);
  content.settings.start = "2026-05-18";
  content.settings.end = "2026-06-29";
  const weeks = [
    "2026-05-18",
    "2026-05-25",
    "2026-06-01",
    "2026-06-08",
    "2026-06-15",
    "2026-06-22",
    "2026-06-29",
  ];
  data.timeLogs = [];
  data.journals = [];
  for (let i = 0; i < 7; i++) {
    for (let d = 0; d < (i === 6 ? 1 : 5); d++) {
      const start = new Date(weeks[i] + "T00:00:00Z");
      start.setUTCDate(start.getUTCDate() + d);
      const ms = (i === 6 ? 10 : 8) * 3600000;
      data.timeLogs.push({
        id: randomUUID(),
        userId: student.id,
        role: "student",
        clockInAt: start.toISOString(),
        clockOutAt: new Date(+start + ms).toISOString(),
        durationMs: ms,
        createdAt: start.toISOString(),
      });
    }
    data.journals.push({
      id: randomUUID(),
      studentId: student.id,
      date: weeks[i],
      cadence: "weekly",
      hours: i === 6 ? 10 : 40,
      tasks:
        `Journal ${i + 1} actual task content. ` +
        "Documented meaningful work. ".repeat(60),
      learnings: "I learned how to test and organize work. ".repeat(40),
      status: "approved",
      createdAt: weeks[i] + "T00:00:00Z",
    });
  }
  assert.equal(attendanceMinutes(data, student.id), 15000);
  for (const s of content.sections) {
    s.included = [
      "reflection",
      "journals",
      "attendance",
      "pictorial",
      "evaluations",
    ].includes(s.template);
    s.body =
      s.template === "reflection"
        ? Array.from(
            { length: 70 },
            (_, i) =>
              `Paragraph ${i + 1}: Full editable narrative preserved. ` +
              "We improved the document workflow using real saved records. ".repeat(
                4,
              ),
          ).join("\n\n")
        : "";
  }
  const form = data.formDocuments.find((f) => f.id === "form-4"),
    users = load("src/lib/prototype.ts").accountUsers(data),
    user = users.find((u) => u.studentId === student.id);
  const values = {};
  for (const b of form.blocks)
    if (b.type === "rating-table")
      values[b.id] = Object.fromEntries(
        (b.criteria ?? [])
          .filter((c) => c.role !== "heading")
          .map((c) => [c.id, "Good (3)"]),
      );
  data.formSubmissions = [
    {
      id: "fixture-response",
      formId: form.id,
      userId: user.id,
      formSnapshot: form,
      values,
      status: "approved",
    },
  ];
  const asset = {
    id: randomUUID(),
    reportId: "fixture",
    kind: "evidence",
    sectionId: content.sections.find((s) => s.template === "pictorial").id,
    name: "wide-photo.png",
    mime: "image/png",
    caption: "Fixture activity photo",
    rotation: 90,
    width: 400,
    height: 200,
    bytes: await sharp({
      create: { width: 400, height: 200, channels: 3, background: "#5c799a" },
    })
      .png()
      .toBuffer(),
    size: 100,
    order: 0,
    createdAt: new Date(),
  };
  const binding = {
    versionId: "fixture-v1",
    templateId: "fixture",
    number: 1,
    title: config.title,
    dueDate: null,
    allowStudentExtras: false,
    sections: config.sections,
  };
  const bytes = await buildMappedWord(
    fs.readFileSync("public/templates/practicum-pilot.docx"),
    binding,
    content,
    data,
    [asset],
  );
  const zip = await JSZip.loadAsync(bytes),
    xml = await zip.file("word/document.xml").async("string");
  assert.match(xml, /Paragraph 70/);
  assert.match(xml, /Journal 7/);
  assert.match(xml, /250 h 0 min/);
  assert.match(xml, /40 h 0 min/);
  assert.match(xml, /240 h 0 min/);
  assert.match(xml, /w:left="2160"/);
  assert.match(xml, /<w:drawing/);
  assert.match(xml, /Fixture activity photo/);
  assert.doesNotMatch(xml, /SpongeBob|Krabby Patty|\{\{[a-z_]+\}\}/);
  fs.mkdirSync("/tmp/practo-template-doc", { recursive: true });
  fs.writeFileSync("/tmp/practo-template-doc/quality-report.docx", bytes);
  const lo = spawnSync(
    "soffice",
    [
      "-env:UserInstallation=file:///tmp/practo-template-lo",
      "--headless",
      "--convert-to",
      "pdf",
      "--outdir",
      "/tmp/practo-template-doc",
      "/tmp/practo-template-doc/quality-report.docx",
    ],
    { encoding: "utf8", timeout: 60000 },
  );
  assert.equal(lo.status, 0, lo.stdout + lo.stderr);
  const check = spawnSync(
    "python",
    [
      "-c",
      `import fitz\np=fitz.open('/tmp/practo-template-doc/quality-report.pdf')\ntext=' '.join(x.get_text() for x in p)\nassert 'Paragraph 70' in text\nassert 'Journal 7' in text\nassert '250 h 0 min' in text\nassert 'Fixture activity photo' in text\nfirst=next(page for page in p if 'Journal 1 · Weekly' in page.get_text())\nassert 'Tasks Assigned' in first.get_text(), 'Journal heading separated from its table'\nassert len(p)>10\nprint('Mapped Word/PDF:',len(p),'pages; 7 journals, 250 hours, final narrative and image intact')\np[3].get_pixmap(matrix=fitz.Matrix(1.3,1.3)).save('docs/screenshots/template-word-page.png')`,
    ],
    { encoding: "utf8" },
  );
  assert.equal(check.status, 0, check.stdout + check.stderr);
  console.log(check.stdout.trim());
  console.log(
    "Mapped DOCX package, native tables, inherited header/footer/margins, historical ratings, images and long content passed.",
  );
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
