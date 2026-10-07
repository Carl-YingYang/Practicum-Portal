const assert = require("node:assert/strict");
const { request } = require("playwright");
const { randomUUID } = require("node:crypto");
const sharp = require("sharp");
const JSZip = require("jszip");
const { load } = require("./load-ts.cjs");
const { reportChecks } = load("src/domain/reports/checks.ts");
const { startServer } = require("./server-harness.cjs");
(async () => {
  const app = await startServer(3141, { PORTAL_STORAGE_MB: "4" }),
    clients = [];
  async function json(res, code = 200) {
    assert.equal(res.status(), code, await res.text());
    return res.json();
  }
  async function login(role, index = 1) {
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
  async function command(c, action, args, code = 200) {
    return json(
      await c.post("/api/portal", {
        data: {
          action,
          args,
          ids: Array.from({ length: 20 }, () => randomUUID()),
          requestId: randomUUID(),
        },
      }),
      code,
    );
  }
  async function answer(c, r, key, target, marker) {
    const fid = r.binding.sections.find((s) => s.key === key).formIds[0],
      aid = r.binding.assignments[key][fid];
    let p = await command(c, "startFormResponse", [
      {
        formId: fid,
        assignmentId: aid,
        ...(target ? { targetStudentId: target } : {}),
      },
    ]);
    const sub = p.data.formSubmissions.find((s) => s.assignmentId === aid),
      form = sub.formSnapshot,
      values = {};
    for (const b of form.blocks) {
      if (b.type === "fill-in") values[b.id] = marker;
      if (b.type === "rating-table")
        values[b.id] = Object.fromEntries(
          b.criteria.filter((x) => !x.heading).map((x) => [x.id, "4"]),
        );
    }
    await command(c, "saveSubmissionDraft", [sub.id, values]);
    await command(c, "submitFormResponse", [sub.id]);
    return sub.id;
  }
  try {
    const coord = await login("coordinator"),
      student = await login("student"),
      sup = await login("supervisor"),
      other = await login("student", 2);
    const before = await json(await coord.get("/api/portal"));
    await json(await student.post("/api/practicum/demo"), 403);
    const [demo, simultaneous] = await Promise.all([
      coord.post("/api/practicum/demo").then(json),
      coord.post("/api/practicum/demo").then(json),
    ]);
    assert.equal(demo.reportId, simultaneous.reportId);
    const path = `/api/reports/${demo.reportId}`,
      tpath = `/api/templates/${demo.templateId}`;
    let r = await json(await student.get(path));
    assert.equal(r.binding.contextual, true);
    assert.equal(r.content.sections.length, 3);
    let school = await json(await coord.get("/api/portal"));
    assert.equal(school.data.students.length, before.data.students.length);
    assert.equal(
      school.data.formSubmissions.length,
      before.data.formSubmissions.length,
    );
    const sfid = r.binding.sections.find((s) => s.key === "student_reflection")
        .formIds[0],
      said = r.binding.assignments.student_reflection[sfid],
      pinned = school.data.formDocuments.find((f) => f.id === sfid);
    assert.notEqual(pinned.id, pinned.origin.formId);
    await command(student, "startFormResponse", [{ formId: sfid }], 403);
    await command(
      other,
      "startFormResponse",
      [{ formId: sfid, assignmentId: said }],
      403,
    );
    await command(coord, "unassignForm", [said], 409);
    await command(
      coord,
      "updateFormMeta",
      [sfid, { title: "Tampered frozen rubric" }],
      409,
    );
    const sid = r.content.studentIds[0];
    const subId = await answer(
      student,
      r,
      "student_reflection",
      undefined,
      "CONNECTED STUDENT ANSWER",
    );
    await command(sup, "reviewSubmission", [subId, "approve"], 403);
    const supId = await answer(
      sup,
      r,
      "supervisor_evaluation",
      sid,
      "CONNECTED SUPERVISOR ANSWER",
    );
    await command(coord, "reviewSubmission", [subId, "approve"]);
    await command(coord, "reviewSubmission", [supId, "approve"]);
    const handoff = await json(await student.get("/api/portal"));
    assert.ok(
      handoff.data.formSubmissions.some(
        (s) => s.id === supId && s.status === "approved",
      ),
    );
    const supervisorFormId = handoff.data.formSubmissions.find(
      (s) => s.id === supId,
    ).formId;
    const handoffExport = await student.get(
      `/api/forms/${supervisorFormId}/export?mode=answered&submission=${supId}`,
    );
    assert.equal(handoffExport.status(), 200, await handoffExport.text());
    assert.ok(
      (
        await (
          await JSZip.loadAsync(await handoffExport.body())
        )
          .file("word/document.xml")
          .async("string")
      ).includes("Supervisor evaluation"),
    );
    assert.equal(
      (
        await other.get(
          `/api/forms/${supervisorFormId}/export?mode=answered&submission=${supId}`,
        )
      ).status(),
      404,
    );
    await command(
      student,
      "saveSubmissionDraft",
      [supId, { x: "attempt" }],
      403,
    );
    const publishedRoster = await json(
      await coord.get(
        tpath + `?recipients=true&version=${r.binding.versionId}`,
      ),
    );
    assert.ok(publishedRoster.students.find((s) => s.id === sid).reportId);
    assert.ok(publishedRoster.students.some((s) => s.ready && !s.reportId));
    await json(await student.get(tpath + "?recipients=true"), 403);

    r = await json(await student.get(path));
    let content = structuredClone(r.content);
    content.sections.find((s) => s.template === "introduction").body =
      "CONNECTED NARRATIVE — my placement and goal.";
    for (const s of content.sections.filter(
      (s) => s.template !== "supervisor_evaluation",
    ))
      s.status = "ready";
    r = await json(
      await student.put(path, { data: { revision: r.revision, content } }),
    );
    let sr = await json(await sup.get(path)),
      sc = structuredClone(sr.content);
    sc.sections.find((s) => s.template === "supervisor_evaluation").status =
      "ready";
    await json(
      await sup.put(path, { data: { revision: sr.revision, content: sc } }),
    );
    r = await json(await coord.get(path));
    for (const s of r.content.sections)
      r = await json(
        await coord.post(path, {
          data: {
            action: "review",
            revision: r.revision,
            sectionId: s.id,
            status: "reviewed",
            note: "",
          },
        }),
      );
    assert.deepEqual(
      reportChecks(
        r.content,
        (await json(await coord.get("/api/portal"))).data,
        r.assets,
        r.binding,
      ),
      [],
    );
    r = await json(
      await student.post(path + "/export", { data: { revision: r.revision } }),
    );
    assert.equal(r.versions.length, 1);
    const v1 = r.versions[0],
      doc = r.assets.find(
        (a) => a.sectionId === v1.id && a.mime.includes("wordprocessingml"),
      );
    const bytes = await (await student.get(path + `/assets/${doc.id}`)).body(),
      zip = await JSZip.loadAsync(bytes),
      xml = await zip.file("word/document.xml").async("string");
    assert.ok(xml.includes("CONNECTED STUDENT ANSWER"));
    assert.ok(xml.includes("CONNECTED NARRATIVE"));
    assert.ok(xml.includes("Quality of work"));
    require("node:fs").writeFileSync("/tmp/practo-connected-word.docx", bytes);
    r = await json(
      await student.post(path + "/export", { data: { revision: r.revision } }),
    );
    assert.equal(r.versions.length, 1, "unchanged export is reused");
    const usageBefore = await json(await coord.get("/api/storage"));
    assert.ok(usageBefore.usedBytes > 0);
    await json(await student.get("/api/storage"), 403);
    const studentAnswerBefore = (
      await json(await coord.get("/api/portal"))
    ).data.formSubmissions.find((s) => s.id === subId);
    assert.equal(
      (await json(await coord.post("/api/practicum/demo"))).reportId,
      r.id,
    );
    assert.deepEqual(
      (await json(await coord.get("/api/portal"))).data.formSubmissions.find(
        (s) => s.id === subId,
      ),
      studentAnswerBefore,
    );
    // Library edits never rewrite a previously published format or response.
    await command(coord, "unpublishFormDocument", [pinned.origin.formId]);
    await command(coord, "updateFormMeta", [
      pinned.origin.formId,
      { title: "Revised library reflection" },
    ]);
    await command(coord, "publishFormDocument", [pinned.origin.formId]);
    school = await json(await coord.get("/api/portal"));
    assert.equal(
      school.data.formDocuments.find((f) => f.id === sfid).title,
      pinned.title,
    );
    let t = await json(await coord.get(tpath));
    const link = {
      action: "link",
      revision: t.revision,
      formId: pinned.origin.formId,
      title: "Second reflection requirement",
      respondent: "student",
      required: false,
    };
    await json(await student.post(tpath, { data: link }), 403);
    t = await json(await coord.post(tpath, { data: link }));
    await json(await coord.post(tpath, { data: link }), 409);
    assert.ok(t.slots.includes(`section_${t.content.sections.at(-1).key}`));
    assert.equal((await json(await student.get(path))).binding.number, 1);
    // Same form repeated in two sections must produce separate responses.
    const repeatKey = t.content.sections.at(-1).key;
    t = await json(
      await coord.post(tpath, {
        data: { action: "publish", revision: t.revision },
      }),
    );
    r = await json(
      await coord.post(path, {
        data: {
          action: "upgrade",
          revision: r.revision,
          versionId: t.versions[0].id,
        },
      }),
    );
    assert.equal(r.binding.number, 2);
    school = await json(await coord.get("/api/portal"));
    assert.equal(
      school.data.formAssignments.find((a) => a.id === said).retired,
      true,
    );
    await command(
      student,
      "startFormResponse",
      [{ formId: sfid, assignmentId: said }],
      403,
    );
    assert.ok(
      school.data.formSubmissions.some((s) => s.id === subId),
      "old answers retained",
    );
    const newSubId = await answer(
      student,
      r,
      "student_reflection",
      undefined,
      "ONLY FIRST NEW REQUIREMENT",
    );
    await command(coord, "reviewSubmission", [newSubId, "approve"]);
    const nf = r.binding.sections.find((s) => s.key === "student_reflection")
      .formIds[0];
    assert.equal(
      nf,
      r.binding.sections.find((s) => s.key === repeatKey).formIds[0],
    );
    assert.notEqual(
      r.binding.assignments.student_reflection[nf],
      r.binding.assignments[repeatKey][nf],
    );
    // Mark optional second requirement included so its missing answer is checked.
    r = await json(await student.get(path));
    content = structuredClone(r.content);
    content.sections.find((s) => s.template === repeatKey).included = true;
    r = await json(
      await student.put(path, { data: { revision: r.revision, content } }),
    );
    assert.ok(
      reportChecks(
        r.content,
        (await json(await coord.get("/api/portal"))).data,
        r.assets,
        r.binding,
      ).some(
        (s) =>
          s.includes("Second reflection requirement") &&
          s.includes("approved response"),
      ),
    );
    r = await json(
      await student.post(path + "/export", {
        data: { revision: r.revision, allowIncomplete: true },
      }),
    );
    const latest = r.versions.at(-1),
      newDoc = r.assets.find(
        (a) => a.sectionId === latest.id && a.mime.includes("wordprocessingml"),
      );
    const newXml = await (
      await JSZip.loadAsync(
        await (await student.get(path + `/assets/${newDoc.id}`)).body(),
      )
    )
      .file("word/document.xml")
      .async("string");
    // Reflection has three questions: appearing six times would leak into the second section.
    assert.equal((newXml.match(/ONLY FIRST NEW REQUIREMENT/g) || []).length, 3);
    const originalDoc = await (
      await student.get(path + `/assets/${doc.id}`)
    ).body();
    assert.deepEqual(originalDoc, bytes);
    // Shared definition, separate report/intern contexts.
    const intern2 = school.data.students.find(
      (s) =>
        s.supervisorId ===
          school.data.students.find((s) => s.id === sid).supervisorId &&
        s.id !== sid,
    );
    const assigned2 = await json(
      await coord.post(tpath, {
        data: {
          action: "assign",
          versionId: t.versions[0].id,
          studentIds: [intern2.id],
          dueDate: null,
        },
      }),
    );
    const r2 = await json(
      await coord.get(`/api/reports/${assigned2.reportIds[0]}`),
    );
    assert.equal(
      r2.binding.sections.find((s) => s.key === "student_reflection")
        .formIds[0],
      nf,
    );
    assert.notEqual(
      r2.binding.assignments.student_reflection[nf],
      r.binding.assignments.student_reflection[nf],
    );
    const supFid = r2.binding.sections.find(
      (s) => s.key === "supervisor_evaluation",
    ).formIds[0];
    await command(
      sup,
      "startFormResponse",
      [
        {
          formId: supFid,
          assignmentId: r2.binding.assignments.supervisor_evaluation[supFid],
          targetStudentId: sid,
        },
      ],
      403,
    );
    // Normalize/deduplicate evidence without a storage service dependency.
    let independent = await json(
        await student.post("/api/reports", { data: { studentIds: [sid] } }),
        201,
      ),
      ipath = `/api/reports/${independent.id}`;
    const evidence = independent.content.sections.find(
      (s) => s.kind === "evidence",
    );
    const image = await sharp({
      create: { width: 4000, height: 3000, channels: 3, background: "#267e98" },
    })
      .jpeg()
      .toBuffer();
    async function upload(file, sectionId, kind = "evidence", code = 200) {
      const response = await (kind === "evidence" ? coord : student).post(
        ipath + "/assets",
        {
          multipart: {
            revision: String(independent.revision),
            sectionId,
            kind,
            file,
          },
        },
      );
      if (code !== 200) {
        assert.equal(response.status(), code, await response.text());
        return;
      }
      independent = await json(response, 200);
    }
    const img = { name: "large.jpg", mimeType: "image/jpeg", buffer: image };
    await upload(img, evidence.id);
    const imageAsset = independent.assets.find((a) => a.kind === "evidence");
    assert.equal(imageAsset.width, 2000);
    assert.equal(imageAsset.height, 1500);
    assert.ok(imageAsset.size < image.length);
    await upload(img, evidence.id);
    assert.equal(
      independent.assets.filter((a) => a.kind === "evidence").length,
      1,
    );
    const huge = Buffer.alloc(4 * 1024 * 1024, 32);
    huge.write("%PDF-1.4\n");
    const failedRev = independent.revision;
    await upload(
      { name: "oversized.pdf", mimeType: "application/pdf", buffer: huge },
      evidence.id,
      "evidence",
      413,
    );
    independent = await json(await student.get(ipath));
    assert.equal(
      independent.revision,
      failedRev,
      "quota failure rolls back the revision",
    );
    assert.equal(
      independent.assets.filter((a) => a.kind === "evidence").length,
      1,
    );
    // Cleanup preserves Word, newest ZIP and grammarian-linked ZIP.
    for (let i = 0; i < 3; i++) {
      independent = await json(
        await student.post(ipath + "/export", {
          data: { revision: independent.revision, allowIncomplete: true },
        }),
      );
      if (i === 0)
        await upload(
          {
            name: "reviewed.docx",
            mimeType:
              "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            buffer: bytes,
          },
          independent.versions[0].id,
          "reviewed",
        );
      if (i < 2) {
        const c = structuredClone(independent.content);
        c.title = `Storage fixture ${i}`;
        independent = await json(
          await student.put(ipath, {
            data: { revision: independent.revision, content: c },
          }),
        );
      }
    }
    const protectedId = independent.versions[0].id,
      discardedId = independent.versions[1].id,
      latestId = independent.versions[2].id;
    await json(
      await sup.post(ipath, {
        data: { action: "cleanup", revision: independent.revision },
      }),
      403,
    );
    independent = await json(
      await student.post(ipath, {
        data: { action: "cleanup", revision: independent.revision },
      }),
    );
    assert.equal(
      independent.assets.filter(
        (a) => a.kind === "export" && a.mime.includes("wordprocessingml"),
      ).length,
      3,
    );
    assert.ok(
      independent.assets.some(
        (a) => a.sectionId === protectedId && a.mime === "application/zip",
      ),
    );
    assert.ok(
      independent.assets.some(
        (a) => a.sectionId === latestId && a.mime === "application/zip",
      ),
    );
    assert.ok(
      !independent.assets.some(
        (a) => a.sectionId === discardedId && a.mime === "application/zip",
      ),
    );
    assert.ok(independent.assets.some((a) => a.kind === "reviewed"));
    // Preview and write guards must agree when accounts change after publication.
    const fixtureDb = load("src/server/database.ts").db;
    const liveSchool = (await json(await coord.get("/api/portal"))).data;
    const candidate = liveSchool.students.find(
      (s) =>
        s.status === "active" &&
        s.supervisorId ===
          liveSchool.students.find((s) => s.id === sid).supervisorId &&
        ![sid, intern2.id].includes(s.id),
    );
    assert.ok(candidate);
    for (const role of ["supervisor", "student"]) {
      const profileId =
        role === "supervisor" ? candidate.supervisorId : candidate.id;
      const row = await fixtureDb.portalAccount.findFirstOrThrow({
        where: { profileId, role, schoolId: "practo" },
      });
      await fixtureDb.portalAccount.update({
        where: { id: row.id },
        data: { status: "disabled" },
      });
      try {
        const roster = await json(
          await coord.get(
            tpath + `?recipients=true&version=${t.versions[0].id}`,
          ),
        );
        const target = roster.students.find((s) => s.id === candidate.id);
        assert.equal(target.ready, false);
        assert.match(
          target.reason,
          role === "supervisor" ? /active supervisor/ : /Activate the student/,
        );
        await json(
          await coord.post(tpath, {
            data: {
              action: "assign",
              versionId: t.versions[0].id,
              studentIds: [candidate.id],
              dueDate: null,
            },
          }),
          400,
        );
        assert.equal(
          await fixtureDb.practicumAssignment.count({
            where: { versionId: t.versions[0].id, studentId: candidate.id },
          }),
          0,
          "blocked assignment does not leave a partial report",
        );
      } finally {
        await fixtureDb.portalAccount.update({
          where: { id: row.id },
          data: { status: row.status },
        });
      }
    }
    console.log(
      "Connected workflow passed: gated/resumable demo, actual student/supervisor responses and final Word, fixed rubrics, direct draft linking, report/section/intern isolation, legacy retention, optimized/deduplicated uploads, atomic quota rejection, export reuse and guarded cleanup.",
    );
  } finally {
    for (const c of clients) await c.dispose();
    await app.stop();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
