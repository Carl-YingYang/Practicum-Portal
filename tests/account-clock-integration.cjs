const assert = require("node:assert/strict");
const { randomUUID } = require("node:crypto");
const { request } = require("playwright");
const { startServer } = require("./server-harness.cjs");
(async () => {
  const app = await startServer(3110);
  const contexts = [];
  async function context() {
    const ctx = await request.newContext({
      baseURL: app.baseURL,
      extraHTTPHeaders: { Origin: app.baseURL },
    });
    contexts.push(ctx);
    return ctx;
  }
  async function login(ctx, email, password, expected = 200) {
    const response = await ctx.post("/api/auth/login", {
      data: { email, password },
    });
    assert.equal(response.status(), expected, await response.text());
    return response.json();
  }
  async function command(ctx, action, args, expected = 200) {
    const payload = {
      action,
      args,
      ids: Array.from({ length: 8 }, randomUUID),
      requestId: randomUUID(),
    };
    const response = await ctx.post("/api/portal", { data: payload });
    assert.equal(response.status(), expected, await response.text());
    return { payload, result: await response.json() };
  }
  try {
    const roleContexts = {};
    for (const role of ["student", "supervisor", "coordinator"]) {
      const credential = app.credentials.find(
        (c) => c.email === `${role}1@example.test`,
      );
      const ctx = await context(),
        otherSession = await context();
      await login(ctx, credential.email, credential.password);
      await login(otherSession, credential.email, credential.password);
      for (const data of [
        { currentPassword: "incorrect", newPassword: "PersonalPassword9" },
        { currentPassword: credential.password, newPassword: "weak" },
        {
          currentPassword: credential.password,
          newPassword: "PersonalPassword9",
          accountId: "someone-else",
        },
      ])
        assert.equal(
          (await ctx.post("/api/auth/password", { data })).status(),
          400,
        );
      const response = await ctx.post("/api/auth/password", {
        data: {
          currentPassword: credential.password,
          newPassword: "PersonalPassword9",
        },
      });
      assert.equal(response.status(), 200, await response.text());
      assert.equal((await otherSession.get("/api/portal")).status(), 401);
      assert.equal((await ctx.get("/api/portal")).status(), 200);
      const fresh = await context();
      await login(fresh, credential.email, credential.password, 401);
      await login(fresh, credential.email, "PersonalPassword9");
      roleContexts[role] = ctx;
    }
    console.log(
      "PASS all-role password persistence, current-password verification, targeting rejection and session rotation",
    );
    const student = roleContexts.student,
      supervisor = roleContexts.supervisor,
      coordinator = roleContexts.coordinator;
    const actor = (await (await student.get("/api/auth/session")).json())
      .currentUser;
    const otherStudent = await context(),
      otherSupervisor = await context();
    for (const [ctx, role] of [
      [otherStudent, "student"],
      [otherSupervisor, "supervisor"],
    ]) {
      const c = app.credentials.find(
        (c) => c.email === `${role}2@example.test`,
      );
      await login(ctx, c.email, c.password);
    }
    const created = await command(student, "addManualTimeLog", [
      {
        userId: actor.studentId,
        role: "student",
        clockInAt: "2020-01-01T00:00:00Z",
        clockOutAt: "2020-01-01T08:00:00Z",
      },
    ]);
    const logId = created.payload.ids[0];
    const before = created.result.data.students.find(
      (s) => s.id === actor.studentId,
    ).loggedHours;
    const args = [
      logId,
      "2020-01-01T06:00:00Z",
      "Forgot to clock out when work ended.",
    ];
    await command(otherStudent, "requestTimeCorrection", args, 403);
    await command(
      student,
      "requestTimeCorrection",
      [logId, "2030-01-01T00:00:00Z", args[2]],
      409,
    );
    const pending = await command(student, "requestTimeCorrection", args);
    assert.equal(
      pending.result.data.students.find((s) => s.id === actor.studentId)
        .loggedHours,
      before,
    );
    const correctionId = pending.result.data.timeLogs.find(
      (t) => t.id === logId,
    ).corrections[0].id;
    await command(student, "requestTimeCorrection", args, 409);
    for (const ctx of [student, otherSupervisor, coordinator])
      await command(
        ctx,
        "reviewTimeCorrection",
        [logId, correctionId, "approved"],
        403,
      );
    await command(supervisor, "reviewTimeCorrection", [
      logId,
      correctionId,
      "approved",
      "Confirmed",
    ]);
    const updated = (await (await student.get("/api/portal")).json()).data;
    const log = updated.timeLogs.find((t) => t.id === logId);
    assert.equal(log.durationMs, 6 * 3600000);
    assert.equal(
      Date.parse(log.corrections[0].originalClockOutAt),
      Date.parse("2020-01-01T08:00:00Z"),
    );
    assert.equal(
      updated.students.find((s) => s.id === actor.studentId).loggedHours,
      before - 2,
    );
    await command(
      supervisor,
      "reviewTimeCorrection",
      [logId, correctionId, "approved"],
      409,
    );
    await command(student, "deleteTimeLog", [logId], 403);
    const pending2 = await command(student, "requestTimeCorrection", [
      logId,
      "2020-01-01T05:00:00Z",
      "Another proposed end time",
    ]);
    const c2 = pending2.result.data.timeLogs
      .find((t) => t.id === logId)
      .corrections.at(-1).id;
    await command(
      supervisor,
      "reviewTimeCorrection",
      [logId, c2, "rejected", ""],
      409,
    );
    await command(supervisor, "reviewTimeCorrection", [
      logId,
      c2,
      "rejected",
      "Original correction was accurate",
    ]);
    assert.equal(
      (await (await student.get("/api/portal")).json()).data.timeLogs.find(
        (t) => t.id === logId,
      ).durationMs,
      6 * 3600000,
    );
    console.log(
      "PASS correction permissions, approval/rejection, preserved originals, recalculated hours and repeat-review rejection",
    );
    const reset = await command(coordinator, "resetAccountCredentials", [
      "student",
      actor.studentId,
    ]);
    const temporary =
      "Tmp-" + reset.payload.ids[0].replaceAll("-", "").slice(0, 12);
    assert.equal((await student.get("/api/portal")).status(), 401);
    const restored = await context();
    await login(restored, "student1@example.test", "PersonalPassword9", 401);
    const result = await login(restored, "student1@example.test", temporary);
    assert.equal(result.currentUser.mustChangePassword, true);
    assert.equal((await restored.get("/api/portal")).status(), 403);
    assert.equal(
      (
        await restored.post("/api/auth/password", {
          data: {
            currentPassword: temporary,
            newPassword: "RestoredPassword9",
          },
        })
      ).status(),
      200,
    );
    console.log(
      "PASS coordinator reset invalidates old credentials and requires a personal password before access",
    );
  } finally {
    await Promise.all(contexts.map((ctx) => ctx.dispose()));
    await app.stop();
  }
})().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
