const { test, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const storage = new Map();
global.localStorage = {
  getItem: (k) => storage.get(k) ?? null,
  setItem: (k, v) => storage.set(k, v),
  removeItem: (k) => storage.delete(k),
};
const { load } = require("./load-ts.cjs");
const { useAppStore: store } = load("src/store/use-app-store.ts");
const { accountUsers, validateTimeEntry, responseErrors } = load(
  "src/lib/prototype.ts",
);
const { elapsedMs, validateToolUrl } = load("src/lib/selectors.ts");
const { escapeCell } = load("src/lib/csv-export.ts");
const state = () => store.getState();
beforeEach(() => {
  state().resetPrototype();
});

test("attendance remains the single hours source through repeated approvals and deletion", () => {
  const initial = state().students.find((s) => s.id === "s1").loggedHours;
  const id = state().addManualTimeLog({
    userId: "s1",
    role: "student",
    clockInAt: "2026-01-02T08:00:00+08:00",
    clockOutAt: "2026-01-02T16:00:00+08:00",
  });
  assert.equal(
    state().students.find((s) => s.id === "s1").loggedHours,
    initial + 8,
  );
  const journal = state().createJournal({
    studentId: "s1",
    date: "2026-01-02",
    hours: 8,
    tasks: "Completed prototype testing",
    learnings: "Verified hours",
    submit: true,
  });
  state().approveJournal(journal);
  state().approveJournal(journal);
  assert.equal(
    state().students.find((s) => s.id === "s1").loggedHours,
    initial + 8,
  );
  state().deleteTimeLog(id);
  assert.equal(
    state().students.find((s) => s.id === "s1").loggedHours,
    initial,
  );
});

test("clock-in is idempotent and zero-duration completed sessions stay closed", () => {
  const a = state().clockIn("s1", "student"),
    b = state().clockIn("s1", "student");
  assert.equal(a, b);
  assert.equal(
    state().timeLogs.filter((t) => t.userId === "s1" && !t.clockOutAt).length,
    1,
  );
  state().clockOut("s1");
  assert.equal(
    elapsedMs(
      { clockInAt: "2026-01-01", clockOutAt: "2026-01-01", durationMs: 0 },
      Date.now(),
    ),
    0,
  );
});

test("manual attendance rejects invalid, reversed, future, long and overlapping sessions", () => {
  const logs = [
    {
      userId: "s1",
      clockInAt: "2026-01-01T08:00:00Z",
      clockOutAt: "2026-01-01T16:00:00Z",
    },
  ];
  const now = Date.parse("2026-02-01T00:00:00Z");
  for (const [a, b] of [
    ["bad", "bad"],
    ["2026-01-01T16:00Z", "2026-01-01T08:00Z"],
    ["2026-02-02T08:00Z", "2026-02-02T09:00Z"],
    ["2026-01-02T00:00Z", "2026-01-04T00:00Z"],
    ["2026-01-01T07:00Z", "2026-01-01T09:00Z"],
  ])
    assert.ok(validateTimeEntry(logs, "s1", a, b, now));
  assert.equal(
    validateTimeEntry(
      logs,
      "s1",
      "2026-01-01T16:00Z",
      "2026-01-01T17:00Z",
      now,
    ),
    null,
  );
});

test("disabled demo users cannot sign in or use previews; reset replaces credentials", () => {
  const user = accountUsers(state()).find((u) => u.studentId === "s1");
  state().login("coordinator");
  state().setAccountStatus("student", "s1", "disabled");
  assert.equal(
    state().loginByCredentials(user.email, user.idNumber),
    "inactive",
  );
  state().logout();
  state().loginAs(user.id);
  assert.equal(state().currentUser, null);
  const reset = state().resetAccountCredentials("student", "s1");
  assert.equal(state().loginByCredentials(user.email, user.idNumber), "bad-pw");
  assert.equal(
    state().loginByCredentials(user.email, reset.tempPassword),
    "ok",
  );
  assert.equal(state().currentUser.mustChangePassword, true);
  assert.equal(
    state().completeFirstLoginPasswordChange(reset.tempPassword, "NewPassword7")
      .ok,
    true,
  );
  state().logout();
  assert.equal(
    state().loginByCredentials(user.email, "newpassword7"),
    "bad-pw",
  );
  assert.equal(state().loginByCredentials(user.email, "NewPassword7"), "ok");
});

test("new accounts get school identity and global email uniqueness", () => {
  state().login("coordinator");
  const created = state().createStudent({
    name: "Test Student",
    email: "new@example.test",
    studentNumber: "TEST-1",
    course: "BSIT",
    requiredHours: 300,
    companyId: "",
    supervisorId: null,
  });
  const student = state().students.find((s) => s.id === created.studentId);
  assert.ok(student.schoolId);
  assert.ok(accountUsers(state()).some((u) => u.studentId === student.id));
  assert.throws(
    () =>
      state().createCoordinator({
        name: "Duplicate",
        email: "NEW@example.test",
      }),
    /already uses/,
  );
});

test("rejected journals reopen the same draft and can be resubmitted", () => {
  const id = state().createJournal({
    studentId: "s1",
    date: "2026-01-02",
    hours: 2,
    tasks: "Original",
    learnings: "Original",
    submit: true,
  });
  state().rejectJournal(id, "Please add details");
  state().updateJournalDraft(id, { tasks: "Updated detail" });
  state().submitJournal(id);
  assert.equal(
    state().journals.find((j) => j.id === id).tasks,
    "Updated detail",
  );
  assert.equal(state().journals.find((j) => j.id === id).status, "pending");
});

test("specific recipients, required responses, template snapshots, locked reviews and cascade delete", () => {
  state().login("coordinator");
  const form = state().formDocuments.find((f) => f.status === "published");
  const user = accountUsers(state()).find((u) => u.studentId === "s1");
  const before = state().formAssignments.length;
  state().assignForm({
    formId: form.id,
    target: "specific_users",
    targetUserIds: [],
  });
  assert.equal(state().formAssignments.length, before);
  state().assignForm({
    formId: form.id,
    target: "specific_users",
    targetUserIds: [user.id],
  });
  // Isolate a fresh form response independently from historical fixtures.
  store.setState({
    formSubmissions: [],
    formDocuments: [
      {
        ...form,
        blocks: [
          {
            id: "required",
            type: "fill-in",
            label: "Reflection",
            required: true,
          },
        ],
      },
    ],
  });
  state().loginAs(user.id);
  const id = state().startFormResponse({ formId: form.id });
  assert.ok(id);
  state().submitFormResponse(id);
  assert.equal(state().formSubmissions[0].status, "in_progress");
  state().saveSubmissionDraft(id, { required: "Completed answer" });
  store.setState({
    formDocuments: [{ ...form, title: "Changed template", blocks: [] }],
  });
  assert.equal(state().formSubmissions[0].formSnapshot.title, form.title);
  state().submitFormResponse(id);
  state().saveSubmissionDraft(id, { required: "changed" });
  assert.equal(state().formSubmissions[0].values.required, "Completed answer");
  state().login("coordinator");
  state().reviewSubmission(id, "approve");
  state().reviewSubmission(id, "request_revision", "again");
  assert.equal(state().formSubmissions[0].status, "approved");
  state().deleteFormDocument(form.id);
  assert.equal(
    state().formAssignments.filter((a) => a.formId === form.id).length,
    0,
  );
  assert.equal(
    state().formSubmissions.filter((a) => a.formId === form.id).length,
    0,
  );
});

test("browser persistence restores edits and reconciles the current user", async () => {
  state().login("student");
  const id = state().createJournal({
    studentId: "s1",
    date: "2026-01-02",
    hours: 1,
    tasks: "Persisted",
    learnings: "Refresh",
    submit: false,
  });
  const snapshot = storage.get("practo:prototype:v1");
  assert.ok(snapshot);
  state().resetPrototype();
  storage.set("practo:prototype:v1", snapshot);
  await state().hydratePrototype();
  assert.ok(state().journals.some((j) => j.id === id));
  assert.equal(state().currentUser.role, "student");
  assert.equal(state().hasHydrated, true);
});

test("tool links validate HTTPS and exact hosts; CSV values escape formulas", () => {
  assert.ok(
    validateToolUrl("drive", "https://drive.google.com.attacker.test/foo"),
  );
  assert.ok(validateToolUrl("drive", "http://drive.google.com/foo"));
  assert.equal(
    validateToolUrl("drive", "https://drive.google.com/drive/folders/a"),
    "",
  );
  assert.equal(escapeCell("=SUM(1,2)"), '"\'=SUM(1,2)"');
  assert.equal(escapeCell('safe, "quoted"'), '"safe, ""quoted"""');
  assert.equal(escapeCell(-2), "-2");
});

test('evaluation ownership and submitted immutability hold for the actual store', () => {
  state().login('supervisor');
  const input = { studentId: 's1', supervisorId: 'sup1', term: '2026-2027', qualityOfWork: 5, jobKnowledge: 4, dependability: 4, strengths: 'Reliable', weaknesses: 'Practice', recommendations: 'Continue', submit: true };
  const id = state().saveEvaluation(input);
  assert.equal(state().evaluations.find((e) => e.id === id).status, 'submitted');
  state().saveEvaluation({ ...input, id, strengths: 'Changed' });
  assert.equal(state().evaluations.find((e) => e.id === id).strengths, 'Reliable');
  const other = state().students.find((s) => s.supervisorId && s.supervisorId !== 'sup1');
  const before = state().evaluations.length;
  state().saveEvaluation({ ...input, studentId: other.id });
  assert.equal(state().evaluations.length, before);
});

test('responses require assignments and supervisor targets stay within the intern roster', () => {
  const form = state().formDocuments.find((f) => f.status === 'published');
  assert.equal(state().startFormResponse({ formId: form.id }), '');
  state().login('supervisor');
  const supervisorForm = state().formDocuments.find((f) => state().formAssignments.some((a) => a.formId === f.id && a.target === 'all_supervisors') && f.status === 'published');
  const other = state().students.find((s) => s.supervisorId && s.supervisorId !== 'sup1');
  assert.equal(state().startFormResponse({ formId: supervisorForm.id, targetStudentId: other.id }), '');
  store.setState({ formAssignments: [] });
  assert.equal(state().startFormResponse({ formId: supervisorForm.id }), '');
});

test('provisioning cannot assign a full or mismatched supervisor', () => {
  state().login('coordinator');
  const sup = state().supervisors[0];
  store.setState({ supervisors: state().supervisors.map((s) => s.id === sup.id ? { ...s, capacity: 0 } : s) });
  const added = state().createStudent({ name: 'Capacity Check', email: 'capacity@example.test', studentNumber: 'CAP-1', course: 'BSIT', requiredHours: 300, companyId: sup.companyId, supervisorId: sup.id });
  assert.equal(state().students.find((s) => s.id === added.studentId).supervisorId, null);
});

const { schoolThemeCssVars, resolveSchoolTheme, SCHOOL_THEME_PRESETS, colorContrast } = load("src/lib/school-themes.ts");

test("every preset and extreme custom palette keeps action text and selected text readable in both modes", () => {
  const palettes = [...SCHOOL_THEME_PRESETS.map((p) => ({ themePreset: p.key })),
    ...["#ffffff", "#000000", "#ffff00"].map((color) => ({ themePreset: "custom", customColors: { primary: color, deep: color, light: color } }))];
  for (const identity of palettes) {
    const vars = schoolThemeCssVars({ ...identity, accentColor: "sand" });
    for (const suffix of ["", "-dark"]) {
      const primary = vars[`--school-primary${suffix}`];
      assert.ok(colorContrast(primary, vars[`--school-on-primary${suffix}`]) >= 4.5);
      assert.ok(colorContrast(primary, vars[`--school-soft${suffix}`]) >= 4.5);
    }
  }
});

test("theme rejects malformed custom colors and keeps school palette independent of editorial accent", () => {
  const identity = { themePreset: "royal-navy", accentColor: "clay" };
  const a = schoolThemeCssVars(identity);
  const b = schoolThemeCssVars({ ...identity, accentColor: "sage" });
  assert.equal(a["--school-primary"], b["--school-primary"]);
  assert.notEqual(a["--brand-accent"], b["--brand-accent"]);
  assert.deepEqual(resolveSchoolTheme({ themePreset: "custom", customColors: { primary: "#fff", deep: "red", light: "#ffffff" } }), SCHOOL_THEME_PRESETS[0].colors);
});
