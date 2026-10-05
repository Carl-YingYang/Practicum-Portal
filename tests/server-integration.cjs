const assert = require("node:assert/strict");
const { randomUUID } = require("node:crypto");
const { request } = require("playwright");
const { startServer } = require("./server-harness.cjs");
(async () => {
  const app = await startServer();
  const contexts = [];
  const context = async () => {
    const ctx = await request.newContext({
      baseURL: app.baseURL,
      extraHTTPHeaders: { Origin: app.baseURL },
    });
    contexts.push(ctx);
    return ctx;
  };
  async function login(ctx, role, index = 1) {
    const credential = app.credentials.find(
      (c) => c.email === `${role}${index}@example.test`,
    );
    const response = await ctx.post("/api/auth/login", {
      data: { email: credential.email, password: credential.password },
    });
    assert.equal(response.status(), 200, await response.text());
    return (await response.json()).currentUser;
  }
  function body(action, args) {
    return {
      action,
      args,
      ids: Array.from({ length: 8 }, randomUUID),
      requestId: randomUUID(),
    };
  }
  async function command(ctx, action, args, expected = 200) {
    const payload = body(action, args);
    const response = await ctx.post("/api/portal", { data: payload });
    assert.equal(response.status(), expected, await response.text());
    return { response, payload, result: await response.json() };
  }
  try {
    const anonymous = await context();
    assert.equal((await anonymous.get("/api/students")).status(), 401);
    assert.equal(
      (
        await anonymous.post("/api/auth/login", {
          data: { email: "unknown@example.test", password: "wrong" },
        })
      ).status(),
      401,
    );
    console.log("PASS anonymous access and generic sign-in errors");
    const student = await context(),
      supervisor = await context(),
      coordinator = await context();
    const actor = await login(student, "student"),
      sup = await login(supervisor, "supervisor");
    await login(coordinator, "coordinator");
    const cookies = (await student.storageState()).cookies;
    assert.ok(
      cookies.some(
        (c) =>
          c.name === "practo_session" && c.httpOnly && c.sameSite === "Strict",
      ),
    );
    const all = (await (await coordinator.get("/api/portal")).json()).data;
    const own = (await (await student.get("/api/portal")).json()).data;
    assert.equal(own.students.length, 1);
    assert.equal(own.students[0].id, actor.studentId);
    assert.ok(
      !JSON.stringify(all).includes('"password"') &&
        !JSON.stringify(all).includes("scrypt:"),
    );
    assert.equal(
      (
        await student.post("/api/portal", {
          headers: { Origin: "https://attacker.example.test" },
          data: body("clockIn", [actor.studentId, "student"]),
        })
      ).status(),
      403,
    );
    await command(student, "clockIn", ["s2", "student"], 403);
    await command(
      student,
      "createSupervisor",
      [{ name: "Forbidden", email: "forbidden@example.test", companyId: "c1" }],
      403,
    );
    const assigned = all.students.find(
      (s) => s.supervisorId === sup.supervisorId,
    );
    const outsider = all.students.find(
      (s) => s.supervisorId !== sup.supervisorId,
    );
    await command(
      supervisor,
      "createJournal",
      [
        {
          studentId: outsider.id,
          date: "2026-10-01",
          hours: 1,
          tasks: "x",
          learnings: "x",
          submit: false,
        },
      ],
      403,
    );
    console.log(
      "PASS HTTP-only sessions, scoped reads, CSRF and role ownership",
    );
    await Promise.all([
      command(student, "clockIn", [actor.studentId, "student"]),
      command(student, "clockIn", [actor.studentId, "student"]),
    ]);
    const running = (
      await (await student.get("/api/portal")).json()
    ).data.timeLogs.filter(
      (t) => t.userId === actor.studentId && !t.clockOutAt,
    );
    assert.equal(running.length, 1);
    await command(student, "clockOut", [actor.studentId]);
    const { load } = require("./load-ts.cjs");
    const { nextJournalDate } = load("src/domain/journal-period.ts");
    const { todayISODate } = load("src/lib/selectors.ts");
    const testDate = nextJournalDate(
      own.timeLogs,
      own.journals,
      actor.studentId,
      todayISODate(),
    );
    const result = await command(student, "createJournal", [
      {
        studentId: actor.studentId,
        date: testDate,
        hours: 999,
        tasks: "Server persistence",
        learnings: "Verified attendance hours",
        submit: false,
      },
    ]);
    const journalId = result.payload.ids[0],
      journal = result.result.data.journals.find((j) => j.id === journalId);
    assert.ok(journal.hours > 0 && journal.hours < 999);
    const replay = await student.post("/api/portal", { data: result.payload });
    assert.equal(replay.status(), 200);
    assert.equal(
      (await replay.json()).data.journals.filter((j) => j.id === journalId)
        .length,
      1,
    );
    const fresh = await context();
    await login(fresh, "student");
    assert.ok(
      (await (await fresh.get("/api/portal")).json()).data.journals.some(
        (j) => j.id === journalId,
      ),
    );
    await command(student, "submitJournal", [journalId]);
    const hoursBeforeApproval = (
      await (await student.get("/api/portal")).json()
    ).data.students[0].loggedHours;
    await command(supervisor, "approveJournal", [journalId]);
    const reviewed = (await (await student.get("/api/portal")).json()).data;
    assert.equal(
      reviewed.journals.find((j) => j.id === journalId).status,
      "approved",
    );
    assert.equal(reviewed.students[0].loggedHours, hoursBeforeApproval);
    await command(
      student,
      "updateJournalDraft",
      [
        journalId,
        { date: testDate, hours: 0, tasks: "Changed", learnings: "Changed" },
      ],
      403,
    );
    const template = await command(coordinator, "createFormDocument", [
      {
        title: "Required Test Form",
        description: "Synthetic workflow",
        category: "journal",
      },
    ]);
    const formId = template.payload.ids[0];
    const block = await command(coordinator, "addFormBlock", [
      formId,
      "fill-in",
    ]);
    const blockId = block.payload.ids[0];
    await command(coordinator, "updateFormBlock", [
      formId,
      blockId,
      { label: "Testing outcome", required: true },
    ]);
    await command(coordinator, "publishFormDocument", [formId]);
    await command(coordinator, "assignForm", [
      { formId, target: "specific_users", targetUserIds: [actor.id] },
    ]);
    const responseDraft = await command(student, "startFormResponse", [
      { formId },
    ]);
    const submissionId = responseDraft.payload.ids[0];
    await command(student, "submitFormResponse", [submissionId], 400);
    await command(student, "saveSubmissionDraft", [
      submissionId,
      { [blockId]: "All checks passed" },
    ]);
    await command(student, "submitFormResponse", [submissionId]);
    await command(coordinator, "reviewSubmission", [
      submissionId,
      "approve",
      "Verified",
    ]);
    const returned = (
      await (await student.get("/api/portal")).json()
    ).data.formSubmissions.find((s) => s.id === submissionId);
    assert.equal(returned.status, "approved");
    await command(student, "saveSubmissionDraft", [submissionId, {}], 403);
    await command(
      student,
      "createJournal",
      [
        {
          studentId: actor.studentId,
          date: "2026-02-31",
          hours: 0,
          tasks: "x",
          learnings: "x",
          submit: false,
        },
      ],
      400,
    );
    console.log(
      "PASS shared journal submission/review, unchanged hours and required form submission/review locks",
    );
    console.log(
      "PASS concurrent clock idempotency, real persistence, replay receipts and server-derived hours",
    );
    await command(coordinator, "updateSchoolIdentity", [
      { journalCadence: "twice-weekly" },
    ]);
    assert.equal(
      (await (await student.get("/api/portal")).json()).data.schoolIdentity
        .journalCadence,
      "twice-weekly",
    );
    const created = await command(coordinator, "createSupervisor", [
      {
        name: "New Test Supervisor",
        email: "new-supervisor@example.test",
        companyId: "c1",
        capacity: 3,
      },
    ]);
    const password =
      "Tmp-" + created.payload.ids[1].replaceAll("-", "").slice(0, 12);
    const invited = await context();
    let response = await invited.post("/api/auth/login", {
      data: { email: "new-supervisor@example.test", password },
    });
    assert.equal(response.status(), 200, await response.text());
    assert.equal((await response.json()).currentUser.mustChangePassword, true);
    assert.equal((await invited.get("/api/portal")).status(), 403);
    response = await invited.post("/api/auth/password", {
      data: { currentPassword: password, newPassword: "PersonalPassword9" },
    });
    assert.equal(response.status(), 200, await response.text());
    assert.equal((await invited.get("/api/portal")).status(), 200);
    await invited.post("/api/auth/logout", { data: {} });
    assert.equal(
      (
        await invited.post("/api/auth/login", {
          data: { email: "new-supervisor@example.test", password },
        })
      ).status(),
      401,
    );
    assert.equal(
      (
        await invited.post("/api/auth/login", {
          data: {
            email: "new-supervisor@example.test",
            password: "PersonalPassword9",
          },
        })
      ).status(),
      200,
    );
    console.log(
      "PASS shared preferences, supervisor provisioning and real first-login password replacement",
    );
    const isolated = await context(),
      credential = app.credentials.find(
        (c) => c.email === "isolated@example.test",
      );
    response = await isolated.post("/api/auth/login", {
      data: { email: credential.email, password: credential.password },
    });
    assert.equal(response.status(), 200);
    assert.equal(
      (await (await isolated.get("/api/portal")).json()).data.students.length,
      0,
    );
    await command(
      isolated,
      "updateStudent",
      [actor.studentId, { name: "Leak" }],
      404,
    );
    assert.equal(
      (
        await isolated.post("/api/auth/demo", {
          data: { userId: credential.id },
        })
      ).status(),
      403,
    );
    assert.equal(
      (await student.post("/api/test/reset", { data: {} })).status(),
      403,
    );
    console.log(
      "PASS cross-school isolation, demo allowlist and coordinator-only reset",
    );
    const { journalHours, journalPeriod } = load(
      "src/domain/journal-period.ts",
    );
    const logs = [
      {
        userId: "test",
        role: "student",
        clockInAt: "2026-10-07T22:00:00+08:00",
        clockOutAt: "2026-10-08T02:00:00+08:00",
      },
    ];
    assert.equal(
      journalHours(logs, "test", "2026-10-07", "twice-weekly").hours,
      2,
    );
    assert.equal(
      journalHours(logs, "test", "2026-10-08", "twice-weekly").hours,
      2,
    );
    assert.equal(
      journalPeriod("2026-10-08", "twice-weekly").start,
      "2026-10-08",
    );
    console.log(
      "PASS Philippine period boundaries and overnight attendance clipping",
    );
    const { spawn } = require("node:child_process");
    const productionURL = "http://127.0.0.1:3103";
    const production = spawn(
      "node",
      [
        "node_modules/next/dist/bin/next",
        "start",
        "--hostname",
        "127.0.0.1",
        "--port",
        "3103",
      ],
      {
        env: { ...app.env, APP_ENV: "production", ENABLE_DEMO_LOGIN: "true" },
        stdio: "ignore",
      },
    );
    let productionClient;
    try {
      for (let i = 0; i < 80; i++) {
        try {
          if ((await fetch(productionURL + "/api/health")).ok) break;
        } catch {}
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
      productionClient = await request.newContext({
        baseURL: productionURL,
        extraHTTPHeaders: { Origin: productionURL },
      });
      assert.equal(
        (
          await productionClient.post("/api/auth/demo", {
            data: { userId: actor.id },
          })
        ).status(),
        404,
      );
      assert.equal(
        (await productionClient.post("/api/test/reset", { data: {} })).status(),
        404,
      );
      const publicSession = await (
        await productionClient.get("/api/auth/session")
      ).json();
      assert.equal(publicSession.demoAccounts.length, 0);
      assert.equal(publicSession.testMode, false);
      for (let i = 0; i < 11; i++) {
        const response = await productionClient.post("/api/auth/login", {
          data: { email: "rate-limit@example.test", password: "wrong" },
        });
        assert.equal(response.status(), i < 10 ? 401 : 429);
      }
      console.log(
        "PASS production disables demo/reset even with demo flag set, and sign-in failures are rate limited",
      );
    } finally {
      if (productionClient) await productionClient.dispose();
      production.kill();
      await new Promise((resolve) => production.once("exit", resolve));
    }
    console.log("All connected-server checks passed.");
  } finally {
    await Promise.all(contexts.map((c) => c.dispose()));
    await app.stop();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
