const { test } = require("node:test");
const assert = require("node:assert/strict");
const { load } = require("./load-ts.cjs");
const { resolveAutoFillValue, buildFormAutoFillContext } = load(
  "src/lib/selectors.ts",
);
const { createPortalStore } = load("src/domain/portal/engine.ts");
const { snapshot } = load("src/domain/portal/snapshot.ts");
const { accountUsers } = load("src/lib/prototype.ts");
const { canReadSupervisorResponse } = load(
  "src/domain/forms/response-access.ts",
);
const { scopedData } = load("src/server/permissions.ts");
const { assignedSections, pilotContent } = load(
  "src/domain/templates/model.ts",
);
const { formTaskPhase } = load("src/domain/forms/task-status.ts");
const { reportChecks } = load("src/domain/reports/checks.ts");
test("specific identities never fall through to student name or substrings", () => {
  const ctx = buildFormAutoFillContext({
    studentName: "Intern",
    companyName: "Acme",
    department: "Engineering",
    position: "Trainee",
    supervisorName: "Mentor",
    supervisorTitle: "Lead",
    schoolYear: "2026",
  });
  for (const [label, expected] of [
    ["Name of Department", "Engineering"],
    ["Name of Company", "Acme"],
    ["Supervisor position", "Lead"],
    ["Position of supervisor", "Lead"],
    ["Name of Student", "Intern"],
    ["Name", "Intern"],
    ["School name", ""],
    ["Name of parent", ""],
    ["System identifier", ""],
    ["Student job title", "Trainee"],
  ])
    assert.equal(resolveAutoFillValue(label, ctx), expected, label);
  assert.equal(
    resolveAutoFillValue("Name of Department", { studentName: "Intern" }),
    "",
  );
});
test("submitted supervisor responses are readonly for exactly their intern; drafts and other reports remain private", () => {
  const data = snapshot(createPortalStore().getState());
  const users = accountUsers(data);
  const actor = users.find(
    (u) =>
      u.role === "student" &&
      data.students.find((s) => s.id === u.studentId)?.supervisorId,
  );
  const student = data.students.find((s) => s.id === actor.studentId);
  const sup = users.find(
    (u) => u.role === "supervisor" && u.supervisorId === student.supervisorId,
  );
  const sub = {
    id: "handoff",
    formId: data.formDocuments[0].id,
    userId: sup.id,
    targetStudentId: student.id,
    assignmentId: "bound",
    values: { answer: "visible" },
    status: "submitted",
  };
  data.formAssignments.push({
    id: "bound",
    formId: sub.formId,
    studentId: student.id,
    reportId: "report",
    target: "specific_users",
    targetUserIds: [sup.id],
  });
  for (const status of ["not_started", "in_progress", "needs_revision"])
    assert.equal(
      canReadSupervisorResponse(data, actor, { ...sub, status }),
      false,
      status,
    );
  for (const status of ["submitted", "under_review", "approved"])
    assert.equal(
      canReadSupervisorResponse(data, actor, { ...sub, status }),
      true,
      status,
    );
  assert.equal(
    canReadSupervisorResponse(data, actor, {
      ...sub,
      targetStudentId: "someone-else",
    }),
    false,
  );
  assert.equal(
    canReadSupervisorResponse(data, actor, { ...sub, userId: actor.id }),
    false,
  );
  data.formSubmissions.push(sub, {
    ...sub,
    id: "private",
    status: "in_progress",
  });
  const projected = scopedData(data, actor);
  assert.ok(projected.formSubmissions.some((s) => s.id === "handoff"));
  assert.ok(!projected.formSubmissions.some((s) => s.id === "private"));
  assert.ok(projected.formAssignments.some((a) => a.id === "bound"));
  assert.deepEqual(
    projected.formAssignments.find((a) => a.id === "bound").targetUserIds,
    [],
  );
  student.supervisorId = "transferred-to-another-mentor";
  assert.equal(
    canReadSupervisorResponse(data, actor, sub),
    true,
    "assigned response remains readable after a placement mentor transfer",
  );
  assert.equal(
    canReadSupervisorResponse(data, actor, { ...sub, assignmentId: undefined }),
    false,
    "unbound responses follow current placement ownership",
  );
  data.formAssignments.find((a) => a.id === "bound").retired = true;
  assert.equal(canReadSupervisorResponse(data, actor, sub), false);
});
test("coordinator sections are included by default and evidence can finish through reviewed placeholders", () => {
  const config = pilotContent();
  assert.equal(config.contextVersion, 1);
  assert.equal(
    config.sections.find((s) => s.kind === "forms").respondent,
    "supervisor",
  );
  const sections = assignedSections(config, "stu", () => crypto.randomUUID());
  assert.ok(sections.every((s) => s.included));
  const data = snapshot(createPortalStore().getState());
  const evidence = {
    ...sections.find((s) => s.kind === "evidence"),
    body: "Photo of project presentation with caption",
    status: "reviewed",
  };
  const content = {
    studentIds: ["stu"],
    settings: { start: "", end: "" },
    sections: [evidence],
  };
  assert.deepEqual(reportChecks(content, data, []), []);
  assert.ok(
    reportChecks(
      { ...content, sections: [{ ...evidence, body: "" }] },
      data,
      [],
    ).some((e) => e.includes("describe the image placeholder")),
  );
});
test("task totals distinguish work remaining from waiting for review", () => {
  for (const status of ["not_started", "in_progress", "needs_revision"])
    assert.equal(formTaskPhase(status), "pending");
  for (const status of ["submitted", "under_review"])
    assert.equal(formTaskPhase(status), "review");
  assert.equal(formTaskPhase("approved"), "completed");
});
