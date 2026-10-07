const assert = require("node:assert/strict");
const { request } = require("playwright");
const { randomUUID } = require("node:crypto");
const JSZip = require("jszip");
const sharp = require("sharp");
const { startServer } = require("./server-harness.cjs");
(async () => {
  const app = await startServer(3132);
  const contexts = [];
  async function client(role, index = 1) {
    const c = await request.newContext({
      baseURL: app.baseURL,
      extraHTTPHeaders: { Origin: app.baseURL },
    });
    contexts.push(c);
    const credential = app.credentials.find(
      (c) => c.email === `${role}${index}@example.test`,
    );
    assert.ok(credential);
    const res = await c.post("/api/auth/login", {
      data: { email: credential.email, password: credential.password },
    });
    assert.equal(res.status(), 200);
    return c;
  }
  try {
    const student = await client("student"),
      supervisor = await client("supervisor"),
      coordinator = await client("coordinator");
    const studentData = await (await student.get("/api/portal")).json(),
      all = await (await coordinator.get("/api/portal")).json();
    const studentId = studentData.currentUser.studentId,
      otherId = all.data.students.find((s) => s.id !== studentId).id;
    assert.equal(
      (
        await student.post("/api/reports", { data: { studentIds: [otherId] } })
      ).status(),
      403,
    );
    assert.equal(
      (
        await supervisor.post("/api/reports", {
          data: { studentIds: [studentId] },
        })
      ).status(),
      403,
    );
    let res = await student.post("/api/reports", {
      data: { studentIds: [studentId] },
    });
    assert.equal(res.status(), 201, await res.text());
    let report = await res.json();
    const path = `/api/reports/${report.id}`;
    const outsider = await client("student", 2);
    assert.equal((await outsider.get(path)).status(), 403);
    const noauth = await request.newContext({ baseURL: app.baseURL });
    contexts.push(noauth);
    assert.equal((await noauth.get(path)).status(), 401);
    const badOrigin = await request.newContext({
      baseURL: app.baseURL,
      storageState: await student.storageState(),
    });
    contexts.push(badOrigin);
    assert.equal(
      (
        await badOrigin.put(path, {
          data: { revision: report.revision, content: report.content },
        })
      ).status(),
      403,
    );
    const original = report.revision;
    let content = structuredClone(report.content);
    for (const s of content.sections) {
      s.included = false;
      s.required = false;
    }
    const section = content.sections.find((s) => s.template === "reflection");
    section.included = true;
    section.body =
      "Personal growth and career readiness.\n\nFINAL CONTENT PRESERVED.";
    section.status = "ready";
    res = await student.put(path, {
      data: { revision: report.revision, content },
    });
    assert.equal(res.status(), 200, await res.text());
    report = await res.json();
    assert.equal(
      report.content.sections.find((s) => s.id === section.id).status,
      "ready",
    );
    assert.equal(
      (
        await student.put(path, { data: { revision: original, content } })
      ).status(),
      409,
    );
    assert.equal(
      (
        await supervisor.put(path, {
          data: { revision: report.revision, content },
        })
      ).status(),
      403,
    );
    assert.equal(
      (
        await student.post(path, {
          data: {
            action: "review",
            revision: report.revision,
            sectionId: section.id,
            status: "reviewed",
            note: "",
          },
        })
      ).status(),
      403,
    );
    res = await supervisor.post(path, {
      data: {
        action: "review",
        revision: report.revision,
        sectionId: section.id,
        status: "revision",
        note: "Expand the reflection.",
      },
    });
    assert.equal(res.status(), 200, await res.text());
    report = await res.json();
    assert.equal(
      report.content.sections.find((s) => s.id === section.id).reviewNote,
      "Expand the reflection.",
    );
    content = structuredClone(report.content);
    content.sections.find((s) => s.id === section.id).status = "ready";
    res = await student.put(path, {
      data: { revision: report.revision, content },
    });
    assert.equal(res.status(), 200, await res.text());
    report = await res.json();
    res = await supervisor.post(path, {
      data: {
        action: "review",
        revision: report.revision,
        sectionId: section.id,
        status: "reviewed",
        note: "Reviewed.",
      },
    });
    assert.equal(res.status(), 200, await res.text());
    report = await res.json();
    res = await student.post(path + "/export", {
      data: { revision: report.revision },
    });
    assert.equal(res.status(), 200, await res.text());
    report = await res.json();
    assert.equal(report.versions.length, 1);
    const version = report.versions[0];
    const exported = report.assets.find(
      (a) => a.kind === "export" && a.name.endsWith(".docx"),
    );
    const bundle = report.assets.find((a) => a.name.endsWith(".zip"));
    const bytes = await (
      await student.get(`${path}/assets/${exported.id}`)
    ).body();
    const zip = await JSZip.loadAsync(bytes);
    assert.ok(
      (await zip.file("word/document.xml").async("string")).includes(
        "FINAL CONTENT PRESERVED",
      ),
    );
    assert.equal(
      (await outsider.get(`${path}/assets/${exported.id}`)).status(),
      403,
    );
    const bundleZip = await JSZip.loadAsync(
      await (await student.get(`${path}/assets/${bundle.id}`)).body(),
    );
    assert.ok(bundleZip.file("report-manifest.json"));
    res = await student.post(path + "/assets", {
      multipart: {
        revision: String(report.revision),
        kind: "reviewed",
        sectionId: version.id,
        file: { name: "Reviewed.docx", mimeType: exported.mime, buffer: bytes },
      },
    });
    assert.equal(res.status(), 200, await res.text());
    report = await res.json();
    assert.ok(report.assets.some((a) => a.kind === "reviewed"));
    assert.equal(
      (
        await student.post(path, {
          data: {
            action: "asset",
            revision: report.revision,
            assetId: exported.id,
            remove: true,
          },
        })
      ).status(),
      400,
    );
    const png = await sharp({
      create: { width: 80, height: 40, channels: 3, background: "#5f8b7a" },
    })
      .png()
      .toBuffer();
    res = await coordinator.post(path + "/assets", {
      multipart: {
        revision: String(report.revision),
        kind: "evidence",
        sectionId: section.id,
        file: { name: "Photo.png", mimeType: "image/png", buffer: png },
      },
    });
    assert.equal(res.status(), 200, await res.text());
    report = await res.json();
    let evidence = report.assets.find((a) => a.kind === "evidence");
    assert.equal(evidence.width, 80);
    assert.equal(
      report.content.sections.find((s) => s.id === section.id).status,
      "draft",
    );
    res = await student.post(path, {
      data: {
        action: "asset",
        revision: report.revision,
        assetId: evidence.id,
        caption: "Activity photo",
        rotation: 90,
      },
    });
    assert.equal(res.status(), 200, await res.text());
    report = await res.json();
    assert.equal(report.assets.find((a) => a.id === evidence.id).rotation, 90);
    assert.notEqual(report.sourceFingerprint, version.sourceFingerprint);
    res = await coordinator.post(path + "/assets", {
      multipart: {
        revision: String(report.revision),
        kind: "evidence",
        sectionId: section.id,
        file: {
          name: "fake.png",
          mimeType: "image/png",
          buffer: Buffer.from("fake"),
        },
      },
    });
    assert.equal(res.status(), 400);
    const reviewedAsset = report.assets.find((a) => a.kind === "reviewed");
    assert.deepEqual(
      await (await student.get(`${path}/assets/${reviewedAsset.id}`)).body(),
      bytes,
    );
    const groupStudents = all.data.students
      .filter(
        (s) =>
          s.companyId ===
          all.data.students.find((s) => s.id === studentId).companyId,
      )
      .slice(0, 2);
    assert.equal(groupStudents.length, 2);
    res = await coordinator.post("/api/reports", {
      data: { studentIds: groupStudents.map((s) => s.id) },
    });
    assert.equal(res.status(), 201, await res.text());
    const group = await res.json();
    assert.equal((await student.get(`/api/reports/${group.id}`)).status(), 403);
    assert.equal(
      group.content.sections.filter((s) => s.template === "company").length,
      1,
    );
    assert.equal(
      group.content.sections.filter((s) => s.template === "journals").length,
      2,
    );
    const preference = await (
      await student.get("/api/preferences/notifications")
    ).json();
    const nextPrefs = {
      ...preference,
      accountId: studentData.currentUser.id,
      sound: true,
      readIds: ["one"],
      seenIds: ["one"],
    };
    res = await student.post("/api/preferences/notifications", {
      data: nextPrefs,
    });
    assert.equal(res.status(), 200, await res.text());
    assert.equal(
      (await (await student.get("/api/preferences/notifications")).json())
        .sound,
      true,
    );
    assert.equal(
      (await (await outsider.get("/api/preferences/notifications")).json())
        .sound,
      false,
    );
    assert.equal(
      (
        await outsider.post("/api/preferences/notifications", {
          data: nextPrefs,
        })
      ).status(),
      403,
    );
    const command = {
      action: "createFormDocument",
      args: [
        {
          title: "Site evaluation",
          description: "Template check",
          category: "program",
          templateKey: "site",
        },
      ],
      ids: Array.from({ length: 10 }, randomUUID),
      requestId: randomUUID(),
    };
    res = await coordinator.post("/api/portal", { data: command });
    assert.equal(res.status(), 200, await res.text());
    const after = await res.json();
    assert.ok(
      after.data.formDocuments
        .find((f) => f.title === "Site evaluation")
        .blocks.some((b) => b.label?.includes("obstacles")),
    );
    const starter = after.data.formDocuments.find(
      (f) => f.title === "Site evaluation",
    );
    async function sendCommand(action, args) {
      return coordinator.post("/api/portal", {
        data: {
          action,
          args,
          ids: Array.from({ length: 20 }, randomUUID),
          requestId: randomUUID(),
        },
      });
    }
    res = await sendCommand("publishFormDocument", [starter.id]);
    assert.equal(res.status(), 200, await res.text());
    res = await sendCommand("updateFormMeta", [
      starter.id,
      { title: "Edited published" },
    ]);
    assert.equal(res.status(), 409, await res.text());
    res = await sendCommand("assignForm", [
      { formId: starter.id, target: "all_students" },
    ]);
    assert.equal(res.status(), 200, await res.text());
    res = await student.post("/api/portal", {
      data: {
        action: "startFormResponse",
        args: [{ formId: starter.id }],
        ids: [randomUUID()],
        requestId: randomUUID(),
      },
    });
    assert.equal(res.status(), 200, await res.text());
    const savedResponse = (await res.json()).data.formSubmissions.find(
      (s) => s.formId === starter.id,
    );
    assert.ok(savedResponse?.formSnapshot);
    res = await sendCommand("unpublishFormDocument", [starter.id]);
    assert.equal(res.status(), 200, await res.text());
    res = await sendCommand("updateFormMeta", [
      starter.id,
      { title: "Revised template" },
    ]);
    assert.equal(res.status(), 200, await res.text());
    const revised = await res.json();
    assert.equal(
      revised.data.formSubmissions.find((s) => s.id === savedResponse.id)
        .formSnapshot.title,
      "Site evaluation",
    );
    res = await sendCommand("deleteFormDocument", [starter.id]);
    assert.equal(res.status(), 409, await res.text());
    console.log(
      "Report HTTP checks passed: ownership, combined scope, revisions, reviewer permissions, durable assets, immutable exports/reviewed Word, preferences and template creation.",
    );
  } finally {
    for (const c of contexts) await c.dispose();
    await app.stop();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
