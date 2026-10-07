const { test } = require("node:test");
const assert = require("node:assert/strict");
const { load } = require("./load-ts.cjs");
const { createEditorHistory } = load("src/domain/editor-history.ts");
const { responseForm, formDraftSignature, formDraftContent } = load(
  "src/domain/forms/response-form.ts",
);
const { createPortalStore } = load("src/domain/portal/engine.ts");
const { sampleFormValues } = load("src/domain/forms/sample.ts");
const { responseErrors } = load("src/lib/prototype.ts");
test("history groups typing, preserves structural edits, bounds memory and clears redo", () => {
  const h = createEditorHistory({ title: "A" }, 2);
  h.record({ title: "AB" }, "title", 1000);
  h.record({ title: "ABC" }, "title", 1300);
  assert.deepEqual(h.undo(), { title: "A" });
  assert.deepEqual(h.redo(), { title: "ABC" });
  h.record({ title: "D" });
  h.record({ title: "E" });
  h.record({ title: "F" });
  assert.deepEqual(h.undo(), { title: "E" });
  assert.deepEqual(h.undo(), { title: "D" });
  assert.equal(h.undo(), undefined);
  h.record({ title: "new" });
  assert.equal(h.canRedo, false);
  const ordered = createEditorHistory({ first: 1, second: 2 });
  ordered.record({ second: 2, first: 1 });
  assert.equal(ordered.canUndo, false);
  const copy = h.present;
  copy.title = "mutated";
  assert.equal(h.present.title, "new");
});
test("republishing refreshes ordinary unsubmitted drafts only, including heading rows", () => {
  const store = createPortalStore(),
    s = () => store.getState();
  const old = {
    ...s().formDocuments[0],
    id: "quality",
    status: "draft",
    version: 1,
  };
  const heading = {
    id: "table",
    type: "rating-table",
    required: true,
    scaleLabels: ["1", "2", "3", "4", "5"],
    criteria: [
      { id: "h", label: "Quality", role: "heading" },
      { id: "c", label: "Work" },
    ],
  };
  old.blocks = [heading];
  const sub = {
    id: "ordinary",
    formId: old.id,
    formSnapshot: { ...structuredClone(old), status: "published" },
    userId: "u-student",
    values: { table: { c: "4" } },
    status: "in_progress",
    submittedAt: null,
  };
  store.setState({
    formDocuments: [old],
    formAssignments: [],
    formSubmissions: [
      sub,
      {
        ...structuredClone(sub),
        id: "submitted",
        status: "submitted",
        submittedAt: "2026-10-01",
      },
      {
        ...structuredClone(sub),
        id: "pinned",
        assignmentId: "report-requirement",
      },
    ],
  });
  s().updateFormBlock(old.id, "table", {
    criteria: [
      { id: "h", label: "New heading", role: "heading" },
      { id: "c", label: "Work" },
    ],
  });
  s().publishFormDocument(old.id);
  const [ordinary, submitted, pinned] = s().formSubmissions;
  assert.equal(
    ordinary.formSnapshot.blocks[0].criteria[0].label,
    "New heading",
  );
  assert.equal(submitted.formSnapshot.blocks[0].criteria[0].label, "Quality");
  assert.equal(pinned.formSnapshot.blocks[0].criteria[0].label, "Quality");
  assert.deepEqual(ordinary.values, sub.values);
  assert.equal(responseForm(s().formDocuments[0], submitted).version, 1);
  assert.deepEqual(
    responseErrors(
      ordinary.formSnapshot,
      sampleFormValues(ordinary.formSnapshot),
    ),
    [],
  );
  assert.equal(sampleFormValues(ordinary.formSnapshot).table.h, undefined);
});
test("Trash restore and purge protect used forms; draft replay checks content conflicts", () => {
  const store = createPortalStore(),
    s = () => store.getState();
  store.setState({
    formDocuments: [],
    formAssignments: [],
    formSubmissions: [],
  });
  const id = s().createFormDocument({ title: "Unused", category: "other" });
  s().deleteFormDocument(id);
  assert.ok(s().formDocuments[0].trashedAt);
  s().restoreFormDocument(id);
  assert.equal(s().formDocuments[0].status, "draft");
  assert.equal(s().formDocuments[0].trashedAt, undefined);
  const before = formDraftContent(s().formDocuments[0]);
  s().updateFormMeta(id, { title: "Newer" });
  assert.throws(
    () => s().replaceFormDraft(id, formDraftSignature(before), before),
    /Draft changed/,
  );
  s().replaceFormDraft(id, formDraftSignature(s().formDocuments[0]), before);
  assert.equal(s().formDocuments[0].title, "Unused");
  store.setState({ formAssignments: [{ id: "used", formId: id }] });
  assert.throws(() => s().deleteFormDocument(id), /Archive/);
  assert.equal(s().formDocuments[0].trashedAt, undefined);
  assert.throws(() => s().purgeFormDocument(id), /unused/);
  store.setState({ formAssignments: [] });
  s().deleteFormDocument(id);
  s().purgeFormDocument(id);
  assert.equal(s().formDocuments.length, 0);
});
