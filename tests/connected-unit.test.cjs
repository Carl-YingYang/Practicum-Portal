const { test } = require("node:test");
const assert = require("node:assert/strict");
const { load } = require("./load-ts.cjs");
const { reportSources } = load("src/domain/reports/sources.ts");
const { attendanceMinutes } = load("src/domain/reports/checks.ts");
const { assignedFormsForUser, submissionFor } = load("src/lib/selectors.ts");
test("official sources isolate requirements and clamp attendance to the Manila placement window without mutating records", () => {
  const content = { settings: { start: "2026-10-05", end: "2026-10-06" } };
  const data = {
    journals: [
      { id: "earlier", date: "2026-09-01", cadence: "daily" },
      { id: "inside", date: "2026-10-06", cadence: "daily" },
      { id: "after", date: "2026-10-07", cadence: "daily" },
    ],
    timeLogs: [
      {
        id: "t1",
        role: "student",
        userId: "s1",
        clockInAt: "2026-10-04T23:00:00+08:00",
        clockOutAt: "2026-10-05T01:00:00+08:00",
        durationMs: 7200000,
      },
      {
        id: "t2",
        role: "student",
        userId: "s1",
        clockInAt: "2026-10-06T23:00:00+08:00",
        clockOutAt: "2026-10-07T01:00:00+08:00",
        durationMs: 7200000,
      },
      {
        id: "later",
        role: "student",
        userId: "s1",
        clockInAt: "2026-11-01T00:00:00+08:00",
        clockOutAt: null,
      },
    ],
    evaluations: [{ id: "native" }],
    formSubmissions: [
      { id: "one", assignmentId: "a1" },
      { id: "two", assignmentId: "a2" },
      { id: "legacy" },
      { id: "another-report", assignmentId: "a3" },
    ],
  };
  const original = structuredClone(data),
    binding = {
      contextual: true,
      assignments: { first: { f: "a1" }, second: { f: "a2" } },
    };
  const scoped = reportSources(content, data, binding, "first");
  assert.deepEqual(
    scoped.formSubmissions.map((s) => s.id),
    ["one"],
  );
  assert.deepEqual(
    scoped.journals.map((s) => s.id),
    ["inside"],
  );
  assert.deepEqual(scoped.evaluations, []);
  assert.equal(attendanceMinutes(scoped, "s1"), 120);
  assert.deepEqual(data, original);
  assert.equal(
    reportSources(content, data),
    data,
    "legacy scope remains compatible",
  );
});
test("inbox and submission selectors keep generic responses compatible and distinct contextual requirements separate", () => {
  const user = { id: "u", role: "student" },
    forms = [{ id: "f", status: "published" }],
    base = { formId: "f", target: "specific_users", targetUserIds: ["u"] };
  const assignments = [
    { ...base, id: "legacy" },
    { ...base, id: "a1", reportId: "r1" },
    { ...base, id: "a2", reportId: "r2" },
    { ...base, id: "a3", reportId: "r3", retired: true },
  ];
  assert.deepEqual(
    assignedFormsForUser(forms, assignments, user).map((r) => r.assignment.id),
    ["legacy", "a1", "a2"],
  );
  const subs = [
    { id: "old", formId: "f", userId: "u" },
    { id: "new", formId: "f", userId: "u", assignmentId: "a1" },
  ];
  assert.equal(submissionFor(subs, "f", "u").id, "old");
  assert.equal(submissionFor(subs, "f", "u", undefined, "a1").id, "new");
  assert.equal(submissionFor(subs, "f", "u", undefined, "a2"), undefined);
});
