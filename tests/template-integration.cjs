const assert = require("node:assert/strict");
const { request } = require("playwright");
const fs = require("node:fs");
const JSZip = require("jszip");
const { startServer } = require("./server-harness.cjs");
(async () => {
  const app = await startServer(3138),
    clients = [];
  async function client(role, index = 1) {
    const c = await request.newContext({
      baseURL: app.baseURL,
      extraHTTPHeaders: { Origin: app.baseURL },
    });
    clients.push(c);
    const credential = app.credentials.find(
      (c) =>
        c.email ===
        (role === "isolated"
          ? "isolated@example.test"
          : `${role}${index}@example.test`),
    );
    assert.equal(
      (
        await c.post("/api/auth/login", {
          data: { email: credential.email, password: credential.password },
        })
      ).status(),
      200,
    );
    return c;
  }
  async function json(res, status = 200) {
    assert.equal(res.status(), status, await res.text());
    return res.json();
  }
  try {
    const coord = await client("coordinator"),
      student = await client("student"),
      sup = await client("supervisor"),
      outsider = await client("student", 2);
    const portal = await json(await coord.get("/api/portal")),
      id = portal.data.students[0].id,
      profile = portal.data.students.find((s) => s.id === id);
    assert.equal((await student.post("/api/templates")).status(), 403);
    assert.equal((await sup.get("/api/templates")).status(), 403);
    const isolated = await client("isolated");
    let t = await json(await coord.post("/api/templates"), 201),
      path = `/api/templates/${t.id}`;
    assert.equal((await isolated.get(path)).status(), 404);
    assert.equal((await isolated.get(path + "?file=word")).status(), 404);
    let config = structuredClone(t.content);
    config.sections = config.sections.filter((s) =>
      ["reflection", "journals", "attendance"].includes(s.key),
    );
    config.sections.push({
      key: "supervisor_notes",
      title: "Supervisor notes",
      instructions: "Describe growth.",
      kind: "narrative",
      required: false,
      respondent: "supervisor",
      pageBreak: true,
      formIds: [],
    });
    const form = portal.data.formDocuments.find((f) => f.id === "form-4");
    assert.ok(form);
    config.sections.push({
      key: "program_evaluation",
      title: "Program evaluation",
      instructions: "Complete the assigned form.",
      kind: "forms",
      required: false,
      respondent: "student",
      pageBreak: true,
      formIds: [form.id],
    });
    config.allowStudentExtras = true;
    t = await json(
      await coord.put(path, {
        data: { revision: t.revision, content: config },
      }),
    );
    assert.equal(
      (
        await coord.post(path, {
          data: { action: "publish", revision: t.revision },
        })
      ).status(),
      400,
    );
    t = await json(
      await coord.post(path, {
        data: { action: "sync", revision: t.revision },
      }),
    );
    const blank = await (await coord.get(path + "?file=word")).body();
    const example = await JSZip.loadAsync(blank);
    example.file(
      "word/document.xml",
      (await example.file("word/document.xml").async("string")).replace(
        "{{student_name}}",
        "REFERENCE PERSON ONLY",
      ),
    );
    t = await json(
      await coord.post(path, {
        multipart: {
          revision: String(t.revision),
          kind: "example",
          file: {
            name: "example.docx",
            mimeType:
              "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            buffer: await example.generateAsync({ type: "nodebuffer" }),
          },
        },
      }),
    );
    const stale = t.revision;
    t = await json(
      await coord.post(path, {
        data: { action: "publish", revision: t.revision },
      }),
    );
    assert.equal(t.versions[0].number, 1);
    assert.equal(
      (
        await coord.put(path, { data: { revision: stale, content: config } })
      ).status(),
      409,
    );
    const assign = {
      action: "assign",
      versionId: t.versions[0].id,
      studentIds: [id],
      dueDate: "2026-12-01",
    };
    const assigned = await json(await coord.post(path, { data: assign }));
    assert.equal(assigned.reportIds.length, 1);
    assert.deepEqual(
      (await json(await coord.post(path, { data: assign }))).reportIds,
      assigned.reportIds,
    );
    const reportPath = `/api/reports/${assigned.reportIds[0]}`;
    let r = await json(await student.get(reportPath));
    assert.equal(r.binding.number, 1);
    assert.ok(r.content.sections.every((s) => s.body === ""));
    const assignedPortal = await json(await student.get("/api/portal"));
    assert.ok(
      assignedPortal.data.formAssignments.some(
        (a) =>
          a.reportId === r.id &&
          assignedPortal.data.formDocuments.find((f) => f.id === a.formId)
            ?.origin?.formId === form.id,
      ),
    );
    assert.equal((await outsider.get(reportPath)).status(), 403);
    assert.equal(
      (
        await outsider.get(path + `?file=word&version=${t.versions[0].id}`)
      ).status(),
      403,
    );
    assert.equal(
      (
        await student.get(path + `?file=example&version=${t.versions[0].id}`)
      ).status(),
      200,
    );
    const ref = await json(
      await student.get(
        path + `?file=example&version=${t.versions[0].id}&preview=true`,
      ),
    );
    assert.ok(ref.preview.some((p) => p.includes("REFERENCE PERSON ONLY")));
    let content = structuredClone(r.content);
    content.sections.find((s) => s.template === "reflection").body =
      "MY ORIGINAL REFLECTION — saved once.";
    content.sections.find((s) => s.template === "reflection").status = "ready";
    r = await json(
      await student.put(reportPath, {
        data: { revision: r.revision, content },
      }),
    );
    for (const change of [
      (c) => c.sections.shift(),
      (c) => (c.sections[0].title = "Tampered title"),
      (c) =>
        (c.sections.find((s) => s.template === "supervisor_notes").body =
          "Cannot impersonate supervisor"),
      (c) => (c.sections[0].required = false),
    ]) {
      const bad = structuredClone(r.content);
      change(bad);
      assert.equal(
        (
          await student.put(reportPath, {
            data: { revision: r.revision, content: bad },
          })
        ).status(),
        403,
      );
    }
    let sr = await json(await sup.get(reportPath));
    content = structuredClone(sr.content);
    content.sections.find((s) => s.template === "supervisor_notes").body =
      "SUPERVISOR ORIGINAL FEEDBACK";
    content.sections.find((s) => s.template === "supervisor_notes").included =
      true;
    content.sections.find((s) => s.template === "supervisor_notes").status =
      "ready";
    sr = await json(
      await sup.put(reportPath, { data: { revision: sr.revision, content } }),
    );
    assert.equal(
      (
        await sup.post(reportPath + "/export", {
          data: { revision: sr.revision, allowIncomplete: true },
        })
      ).status(),
      403,
    );
    assert.equal(
      (
        await sup.post(reportPath, {
          data: {
            action: "review",
            revision: sr.revision,
            sectionId: sr.content.sections.find(
              (s) => s.template === "supervisor_notes",
            ).id,
            status: "reviewed",
            note: "",
          },
        })
      ).status(),
      403,
    );
    r = await json(await student.get(reportPath));
    const extra = {
      id: "custom-test",
      template: "custom_extra",
      title: "Student extra",
      kind: "narrative",
      studentId: id,
      body: "EXTRA ANSWER",
      included: true,
      required: false,
      status: "ready",
      reviewNote: "",
      reviewedAt: null,
    };
    content = structuredClone(r.content);
    content.sections.push(extra);
    r = await json(
      await student.put(reportPath, {
        data: { revision: r.revision, content },
      }),
    );
    assert.equal(
      (
        await student.post(reportPath + "/export", {
          data: { revision: r.revision },
        })
      ).status(),
      409,
    );
    r = await json(
      await student.post(reportPath + "/export", {
        data: { revision: r.revision, allowIncomplete: true },
      }),
    );
    const asset = r.assets.find(
        (a) => a.kind === "export" && a.mime.includes("wordprocessingml"),
      ),
      bytes = await (
        await student.get(`${reportPath}/assets/${asset.id}`)
      ).body(),
      word = await JSZip.loadAsync(bytes),
      xml = await word.file("word/document.xml").async("string");
    assert.match(xml, /MY ORIGINAL REFLECTION/);
    assert.match(xml, /SUPERVISOR ORIGINAL FEEDBACK/);
    assert.match(xml, /EXTRA ANSWER/);
    assert.ok(xml.includes(profile.name));
    assert.doesNotMatch(xml, /REFERENCE PERSON ONLY|SpongeBob|\{\{[a-z_]+\}\}/);
    assert.match(xml, /w:left="2160"/);
    fs.mkdirSync("docs/verification", { recursive: true });
    fs.writeFileSync("docs/verification/template-pilot-report.docx", bytes);
    const reflectionId = r.content.sections.find(
      (s) => s.template === "reflection",
    ).id;
    r = await json(
      await student.post(reportPath + "/export", {
        data: {
          revision: r.revision,
          sectionIds: [reflectionId],
          allowIncomplete: true,
        },
      }),
    );
    const partial = r.assets.find(
      (a) =>
        a.kind === "export" &&
        a.mime.includes("wordprocessingml") &&
        a.sectionId === r.versions.at(-1).id,
    );
    const partZip = await JSZip.loadAsync(
        await (await student.get(`${reportPath}/assets/${partial.id}`)).body(),
      ),
      partXml = await partZip.file("word/document.xml").async("string");
    assert.match(partXml, /MY ORIGINAL REFLECTION/);
    assert.doesNotMatch(
      partXml,
      /SUPERVISOR ORIGINAL FEEDBACK|EXTRA ANSWER|In Partial Fulfillment/,
    );
    assert.match(partXml, /w:left="2160"/);
    const frozen = Buffer.from(
      await (
        await student.get(path + `?file=word&version=${t.versions[0].id}`)
      ).body(),
    );
    config = structuredClone(t.content);
    config.title = "Revised official report";
    config.sections = config.sections.filter(
      (s) => s.key !== "supervisor_notes",
    );
    config.sections.find((s) => s.key === "reflection").instructions =
      "New guidance";
    config.sections.push({
      key: "new_answer",
      title: "New answer",
      instructions: "Write next.",
      kind: "narrative",
      required: true,
      respondent: "student",
      pageBreak: false,
      formIds: [],
    });
    t = await json(
      await coord.put(path, {
        data: { revision: t.revision, content: config },
      }),
    );
    t = await json(
      await coord.post(path, {
        data: { action: "sync", revision: t.revision },
      }),
    );
    t = await json(
      await coord.post(path, {
        data: { action: "publish", revision: t.revision },
      }),
    );
    assert.equal(t.versions[0].number, 2);
    assert.deepEqual(
      Buffer.from(
        await (
          await student.get(path + `?file=word&version=${t.versions[1].id}`)
        ).body(),
      ),
      frozen,
    );
    assert.equal((await json(await student.get(reportPath))).binding.number, 1);
    assert.equal(
      (
        await student.post(reportPath, {
          data: {
            action: "upgrade",
            revision: r.revision,
            versionId: t.versions[0].id,
          },
        })
      ).status(),
      403,
    );
    r = await json(
      await coord.post(reportPath, {
        data: {
          action: "upgrade",
          revision: r.revision,
          versionId: t.versions[0].id,
        },
      }),
    );
    assert.equal(r.binding.number, 2);
    assert.equal(
      r.content.sections.find((s) => s.template === "reflection").body,
      "MY ORIGINAL REFLECTION — saved once.",
    );
    assert.equal(
      r.content.sections.find((s) => s.template === "reflection").status,
      "draft",
    );
    assert.equal(
      r.content.sections.find((s) => s.template === "new_answer").body,
      "",
    );
    assert.ok(
      r.retiredSections.some(
        (s) => s.section.body === "SUPERVISOR ORIGINAL FEEDBACK",
      ),
    );
    assert.ok(r.content.sections.some((s) => s.body === "EXTRA ANSWER"));
    assert.ok(r.assets.some((a) => a.id === asset.id));
    t = await json(
      await coord.post(path, {
        data: { action: "archive", revision: t.revision },
      }),
    );
    assert.ok(t.archived);
    assert.equal((await coord.post(path, { data: assign })).status(), 409);
    assert.equal((await student.get(reportPath)).status(), 200);
    assert.equal((await coord.post("/api/test/reset")).status(), 200);
    const { PrismaClient } = require("@prisma/client"),
      checkDb = new PrismaClient();
    try {
      assert.equal(await checkDb.practicumTemplate.count(), 0);
      assert.equal(await checkDb.practicumReport.count(), 0);
      assert.equal(await checkDb.reportAsset.count(), 0);
    } finally {
      await checkDb.$disconnect();
    }
    console.log(
      "Template API passed: roles, mapping, immutable format versions, blank assignments, linked forms, idempotency, revision conflicts, editable DOCX, retained answers and archive.",
    );
  } finally {
    await Promise.all(clients.map((c) => c.dispose()));
    await app.stop();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
