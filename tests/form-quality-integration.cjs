const assert = require("node:assert/strict");
const { request } = require("playwright");
const { randomUUID } = require("node:crypto");
const fs = require("node:fs");
const JSZip = require("jszip");
const { startServer } = require("./server-harness.cjs");
const { load } = require("./load-ts.cjs");
(async () => {
  const app = await startServer(3143),
    clients = [];
  async function json(res, code = 200) {
    assert.equal(res.status(), code, await res.text());
    return res.json();
  }
  async function client(role, index = 1) {
    const c = await request.newContext({
      baseURL: app.baseURL,
      extraHTTPHeaders: { Origin: app.baseURL },
    });
    clients.push(c);
    const cr = app.credentials.find(
      (c) => c.email === `${role}${index}@example.test`,
    );
    await json(
      await c.post("/api/auth/login", {
        data: { email: cr.email, password: cr.password },
      }),
    );
    return c;
  }
  async function cmd(c, action, args, code = 200) {
    return json(
      await c.post("/api/portal", {
        data: {
          action,
          args,
          ids: Array.from({ length: 25 }, () => randomUUID()),
          requestId: randomUUID(),
        },
      }),
      code,
    );
  }
  async function word(res) {
    assert.equal(res.status(), 200, await res.text());
    const bytes = await res.body();
    return {
      bytes,
      xml: await (
        await JSZip.loadAsync(bytes)
      )
        .file("word/document.xml")
        .async("string"),
    };
  }
  const db = load("src/server/database.ts").db;
  try {
    const coord = await client("coordinator"),
      student = await client("student"),
      other = await client("student", 10),
      sup = await client("supervisor");
    const before = await json(await coord.get("/api/portal"));
    let p = await cmd(coord, "createFormDocument", [
      { title: "Quality regression form", description: "", category: "other" },
    ]);
    const f = p.data.formDocuments.find(
        (f) => f.title === "Quality regression form",
      ),
      fid = f.id;
    p = await cmd(coord, "addFormBlock", [fid, "fill-in"]);
    const field = p.data.formDocuments
      .find((f) => f.id === fid)
      .blocks.at(-1).id;
    p = await cmd(coord, "updateFormBlock", [
      fid,
      field,
      { label: "Reflection", required: true },
    ]);
    await cmd(coord, "publishFormDocument", [fid]);
    await cmd(coord, "assignForm", [{ formId: fid, target: "all_students" }]);
    const ids = [];
    for (const c of [student, other]) {
      p = await cmd(c, "startFormResponse", [{ formId: fid }]);
      const sub = p.data.formSubmissions.find((s) => s.formId === fid);
      ids.push(sub.id);
      await cmd(c, "saveSubmissionDraft", [
        sub.id,
        { [field]: "Retained answer" },
      ]);
    }
    await cmd(coord, "unpublishFormDocument", [fid]);
    await cmd(coord, "updateFormBlock", [
      fid,
      f.blocks[0].id,
      { text: "New shared heading" },
    ]);
    await cmd(coord, "publishFormDocument", [fid]);
    for (const [i, c] of [student, other].entries()) {
      p = await json(await c.get("/api/portal"));
      const sub = p.data.formSubmissions.find((s) => s.id === ids[i]);
      assert.equal(sub.formSnapshot.blocks[0].text, "New shared heading");
      assert.equal(sub.values[field], "Retained answer");
    }
    await cmd(student, "submitFormResponse", [ids[0]]);
    await cmd(coord, "unpublishFormDocument", [fid]);
    await cmd(coord, "updateFormBlock", [
      fid,
      f.blocks[0].id,
      { text: "Second shared heading" },
    ]);
    await cmd(coord, "publishFormDocument", [fid]);
    p = await json(await coord.get("/api/portal"));
    assert.equal(
      p.data.formSubmissions.find((s) => s.id === ids[0]).formSnapshot.blocks[0]
        .text,
      "New shared heading",
    );
    assert.equal(
      p.data.formSubmissions.find((s) => s.id === ids[1]).formSnapshot.blocks[0]
        .text,
      "Second shared heading",
    );
    await cmd(coord, "deleteFormDocument", [fid], 409);
    const blank = await word(await student.get(`/api/forms/${fid}/export`)),
      sample = await word(
        await coord.get(`/api/forms/${fid}/export?mode=sample`),
      ),
      answered = await word(
        await student.get(
          `/api/forms/${fid}/export?mode=answered&submission=${ids[0]}`,
        ),
      );
    assert.ok(!blank.xml.includes("Retained answer"));
    assert.ok(sample.xml.includes("FICTIONAL SAMPLE"));
    assert.ok(answered.xml.includes("Retained answer"));
    assert.ok(answered.xml.includes("New shared heading"));
    assert.equal(
      (
        await other.get(
          `/api/forms/${fid}/export?mode=answered&submission=${ids[0]}`,
        )
      ).status(),
      404,
    );
    assert.equal(
      (await student.get(`/api/forms/${fid}/export?mode=sample`)).status(),
      403,
    );
    p = await cmd(coord, "createFormDocument", [
      { title: "Trash regression", description: "", category: "other" },
    ]);
    const trash = p.data.formDocuments.find(
      (f) => f.title === "Trash regression",
    ).id;
    await cmd(coord, "deleteFormDocument", [trash]);
    p = await cmd(coord, "restoreFormDocument", [trash]);
    assert.equal(
      p.data.formDocuments.find((f) => f.id === trash).status,
      "draft",
    );
    await cmd(coord, "purgeFormDocument", [trash], 409);
    await cmd(coord, "deleteFormDocument", [trash]);
    p = await cmd(coord, "purgeFormDocument", [trash]);
    assert.ok(!p.data.formDocuments.some((f) => f.id === trash));
    await json(await student.post("/api/practicum/completed-demo"), 403);
    const [demo, parallel] = await Promise.all([
      coord.post("/api/practicum/completed-demo").then(json),
      coord.post("/api/practicum/completed-demo").then(json),
    ]);
    assert.equal(demo.reportId, parallel.reportId);
    p = await json(await coord.get("/api/portal"));
    const completed = p.data.students.find((s) => s.id === demo.studentId);
    assert.equal(completed.loggedHours, 250);
    assert.equal(
      p.data.journals.filter((j) => j.studentId === completed.id).length,
      32,
    );
    assert.ok(
      p.data.journals
        .filter((j) => j.studentId === completed.id)
        .every((j) => j.status === "approved"),
    );
    assert.equal(
      p.data.evaluations.find((e) => e.studentId === completed.id).status,
      "submitted",
    );
    let r = await json(await coord.get(`/api/reports/${demo.reportId}`));
    assert.equal(r.versions.length, 1);
    assert.ok(r.content.sections.every((s) => s.status === "reviewed"));
    const completedAsset = r.assets.find(
      (a) =>
        a.sectionId === r.versions[0].id && a.mime.includes("wordprocessingml"),
    );
    assert.ok(completedAsset);
    const completedWord = await word(
      await coord.get(
        `/api/reports/${demo.reportId}/assets/${completedAsset.id}`,
      ),
    );
    assert.ok(completedWord.xml.includes("250"));
    assert.ok(completedWord.xml.includes("Wet signature"));
    assert.ok(!completedWord.xml.includes("{{"));
    fs.mkdirSync("/tmp/practo-quality-docs", { recursive: true });
    fs.writeFileSync(
      "/tmp/practo-quality-docs/completed-demo.docx",
      completedWord.bytes,
    );
    fs.writeFileSync("/tmp/practo-quality-docs/form-sample.docx", sample.bytes);
    const again = await json(await coord.post("/api/practicum/completed-demo"));
    assert.equal(again.reportId, demo.reportId);
    p = await json(await coord.get("/api/portal"));
    assert.equal(p.data.students.length, before.data.students.length + 1);
    assert.equal(
      p.data.students.find((s) => s.id === demo.studentId).loggedHours,
      250,
    );
    for (const old of before.data.students)
      assert.deepEqual(
        p.data.students.find((s) => s.id === old.id),
        old,
      );
    const coordAccount = await db.portalAccount.findFirst({
      where: { role: "coordinator", schoolId: "practo" },
    });
    await db.portalAccount.update({
      where: { id: coordAccount.id },
      data: { isDemo: false },
    });
    await json(await coord.post("/api/practicum/completed-demo"), 403);
    await db.portalAccount.update({
      where: { id: coordAccount.id },
      data: { isDemo: true },
    });
    let t = await json(await coord.post("/api/templates"), 201),
      tp = `/api/templates/${t.id}`;
    t = await json(
      await coord.put(tp, {
        data: {
          revision: t.revision,
          content: {
            ...t.content,
            title: "200 recipient capacity fixture",
            sections: [
              {
                key: "reflection",
                title: "Reflection",
                instructions: "Complete reflection",
                kind: "forms",
                required: true,
                respondent: "student",
                pageBreak: true,
                formIds: [fid],
              },
            ],
          },
        },
      }),
    );
    let preflight = await json(
      await coord.post(tp, {
        data: { action: "preflight", revision: t.revision },
      }),
    );
    assert.ok(preflight.errors.length > 0);
    t = await json(
      await coord.post(tp, { data: { action: "sync", revision: t.revision } }),
    );
    preflight = await json(
      await coord.post(tp, {
        data: { action: "preflight", revision: t.revision },
      }),
    );
    assert.deepEqual(preflight.errors, []);
    assert.ok(preflight.preview.join(" ").includes("SAMPLE"));
    const tplSample = await word(await coord.get(tp + "?file=sample"));
    assert.ok(!tplSample.xml.includes("{{"));
    fs.writeFileSync(
      "/tmp/practo-quality-docs/format-sample.docx",
      tplSample.bytes,
    );
    await json(
      await coord.post(tp, {
        data: { action: "preflight", revision: t.revision - 1 },
      }),
      409,
    );
    t = await json(
      await coord.post(tp, {
        data: { action: "publish", revision: t.revision },
      }),
    );
    // Disposable capacity fixture only: create 200 account/profile rows without touching the developer database.
    const school = await db.portalSchool.findUnique({
        where: { id: "practo" },
      }),
      data = JSON.parse(school.stateJson),
      source = data.students[0];
    const capacity = Array.from({ length: 200 }, (_, i) => ({
      ...source,
      id: `capacity-${i}`,
      studentNumber: `CAP-${i}`,
      name: `Capacity Student ${i}`,
      email: `capacity-${i}@example.test`,
      loggedHours: 0,
      status: "active",
      accountStatus: "active",
      mustChangePassword: false,
    }));
    data.students.push(...capacity);
    const { accountUsers } = load("src/lib/prototype.ts"),
      accounts = accountUsers(data).filter((u) =>
        u.studentId?.startsWith("capacity-"),
      ),
      hash = (
        await db.portalAccount.findFirst({
          where: { role: "student", schoolId: "practo" },
        })
      ).passwordHash;
    await db.$transaction(async (tx) => {
      await tx.portalSchool.update({
        where: { id: "practo" },
        data: { stateJson: JSON.stringify(data), revision: { increment: 1 } },
      });
      await tx.portalAccount.createMany({
        data: accounts.map((u) => ({
          id: u.id,
          schoolId: "practo",
          profileId: u.studentId,
          role: "student",
          email: u.email,
          passwordHash: hash,
          status: "active",
          mustChangePassword: false,
          isDemo: true,
        })),
      });
    });
    const started = Date.now(),
      reportIds = [];
    for (let i = 0; i < 200; i += 25) {
      const batch = await json(
        await coord.post(tp, {
          data: {
            action: "assign",
            versionId: t.versions[0].id,
            studentIds: capacity.slice(i, i + 25).map((s) => s.id),
            dueDate: null,
          },
        }),
      );
      reportIds.push(...batch.reportIds);
    }
    assert.equal(new Set(reportIds).size, 200);
    const retried = await json(
      await coord.post(tp, {
        data: {
          action: "assign",
          versionId: t.versions[0].id,
          studentIds: capacity.slice(0, 25).map((s) => s.id),
          dueDate: null,
        },
      }),
    );
    assert.deepEqual(retried.reportIds, reportIds.slice(0, 25));
    assert.equal(
      await db.practicumAssignment.count({
        where: { versionId: t.versions[0].id },
      }),
      200,
    );
    const concurrent = await Promise.all(
      accounts.slice(0, 10).map(async (u, i) => {
        const c = await request.newContext({
          baseURL: app.baseURL,
          extraHTTPHeaders: { Origin: app.baseURL },
        });
        clients.push(c);
        await json(await c.post("/api/auth/demo", { data: { userId: u.id } }));
        const report = await json(await c.get(`/api/reports/${reportIds[i]}`));
        const section = report.binding.sections[0],
          formId = section.formIds[0],
          assignmentId = report.binding.assignments[section.key][formId];
        const state = await cmd(c, "startFormResponse", [
          { formId, assignmentId },
        ]);
        const sub = state.data.formSubmissions.find(
          (s) => s.assignmentId === assignmentId,
        );
        await cmd(c, "saveSubmissionDraft", [
          sub.id,
          { [field]: `Isolated concurrent answer ${i}` },
        ]);
        return { id: sub.id, marker: `Isolated concurrent answer ${i}` };
      }),
    );
    p = await json(await coord.get("/api/portal"));
    for (const c of concurrent)
      assert.equal(
        p.data.formSubmissions.find((s) => s.id === c.id).values[field],
        c.marker,
      );
    console.log(
      JSON.stringify({
        checks:
          "form lifecycle, draft publication, Word exports/ownership, completed fixture/idempotence, preflight/conflicts, 200 batch assignments, retry without duplicates, 10 concurrent isolated saves",
        recipients: 200,
        batchSize: 25,
        concurrentWriters: 10,
        capacityDurationMs: Date.now() - started,
      }),
    );
  } catch (e) {
    console.error(app.serverOutput());
    throw e;
  } finally {
    await Promise.all(clients.map((c) => c.dispose()));
    await db.$disconnect();
    await app.stop();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
