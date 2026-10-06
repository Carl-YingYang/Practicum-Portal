const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const JSZip = require("jszip");
const { load } = require("./load-ts.cjs");
const { templateErrors, pilotContent } = load("src/domain/templates/model.ts");
const { inspectTemplateWord, syncWordSlots } = load(
  "src/server/templates/word.ts",
);
const { ratingResponseErrors, isRatingHeading, ratingSummary } = load(
  "src/domain/form-templates.ts",
);
test("pilot is clean, mapped, and keeps the supplied Letter margins", async () => {
  const bytes = fs.readFileSync("public/templates/practicum-pilot.docx"),
    info = await inspectTemplateWord(bytes);
  assert.deepEqual(templateErrors(pilotContent(), info.slots), []);
  const zip = await JSZip.loadAsync(bytes),
    xml = await zip.file("word/document.xml").async("string");
  assert.match(xml, /w:left="2160"/);
  assert.match(xml, /w:w="12240"/);
  for (const entry of Object.values(zip.files).filter((e) =>
    e.name.endsWith(".xml"),
  ))
    assert.doesNotMatch(
      await entry.async("string"),
      /SpongeBob|SquarePants|Squidward|Krabby Patty/i,
    );
  const synced = await syncWordSlots(bytes, ["reflection", "custom_one"], true),
    next = await inspectTemplateWord(synced);
  assert.ok(next.slots.includes("extra_sections"));
  assert.ok(next.slots.includes("section_custom_one"));
  assert.ok(!next.slots.includes("section_journals"));
});
test("rating headings never require a score and both numeric and historical label answers validate", () => {
  const block = {
    id: "ratings",
    type: "rating-table",
    required: true,
    scaleLabels: ["Poor (1)", "Fair (2)", "Good (3)"],
    criteria: [
      { id: "h", label: "Group", role: "heading" },
      { id: "a", label: "Work quality" },
    ],
  };
  assert.deepEqual(ratingResponseErrors(block, { a: "3" }), []);
  assert.deepEqual(ratingResponseErrors(block, { a: "Good (3)" }), []);
  assert.equal(ratingResponseErrors(block, {}).length, 1);
  assert.equal(ratingResponseErrors(block, { a: "4" }).length, 1);
  assert.ok(
    isRatingHeading({ id: "o1g", label: "1. MARKET ONESELF EFFECTIVELY" }),
  );
  assert.equal(
    isRatingHeading({ id: "random", label: "ACTUAL CRITERION" }),
    false,
  );
  assert.equal(
    isRatingHeading({
      id: "o1g",
      label: "1. MARKET ONESELF EFFECTIVELY",
      role: "criterion",
    }),
    false,
  );
  assert.equal(ratingSummary(block, { a: "3" }), null);
  assert.deepEqual(
    ratingSummary({ ...block, summaryMode: "average" }, { a: "Good (3)" }),
    { label: "Average score", value: "3" },
  );
  const weighted = {
    ...block,
    scoreMode: true,
    summaryMode: "total",
    criteria: [
      ...block.criteria.map((c) => ({ ...c, max: "20" })),
      { id: "b", label: "Knowledge", max: "10" },
    ],
  };
  assert.equal(ratingSummary(weighted, { a: "0" }).value, "Incomplete");
  assert.equal(ratingSummary(weighted, { a: "0", b: "5" }).value, "5");
});
test("unmapped, duplicate, mixed, nested, and unknown placeholders fail instead of guessing", async () => {
  const zip = await JSZip.loadAsync(
    fs.readFileSync("public/templates/practicum-pilot.docx"),
  );
  const original = await zip.file("word/document.xml").async("string");
  for (const replacement of [
    "Not mapped",
    "{{section_reflection}}{{section_reflection}}",
    "Text {{section_reflection}}",
  ]) {
    const copy = await JSZip.loadAsync(
      fs.readFileSync("public/templates/practicum-pilot.docx"),
    );
    copy.file(
      "word/document.xml",
      original.replace("{{section_reflection}}", replacement),
    );
    if (replacement === "Not mapped")
      assert.ok(
        templateErrors(
          pilotContent(),
          (
            await inspectTemplateWord(
              await copy.generateAsync({ type: "nodebuffer" }),
            )
          ).slots,
        ).length,
      );
    else {
      const bytes = await copy.generateAsync({ type: "nodebuffer" });
      await assert.rejects(() => inspectTemplateWord(bytes));
    }
  }
  const nested = await JSZip.loadAsync(
    fs.readFileSync("public/templates/practicum-pilot.docx"),
  );
  const nestedXml = original.replace(
    /<w:p><w:pPr\/><w:r><w:t>\{\{section_reflection\}\}<\/w:t><\/w:r><\/w:p>/,
    "<w:tbl><w:tr><w:tc><w:p><w:r><w:t>{{section_reflection}}</w:t></w:r></w:p></w:tc></w:tr></w:tbl>",
  );
  assert.notEqual(nestedXml, original);
  nested.file("word/document.xml", nestedXml);
  const nestedBytes = await nested.generateAsync({ type: "nodebuffer" });
  await assert.rejects(() => inspectTemplateWord(nestedBytes), /outside table/);
  assert.ok(
    templateErrors(pilotContent(), ["unknown_field"]).some((e) =>
      e.includes("Unknown"),
    ),
  );
  const extra = new JSZip();
  extra.file("word/document.xml", "x");
  extra.file("[Content_Types].xml", "x");
  extra.file("word/embeddings/object.bin", "danger");
  const bytes = await extra.generateAsync({ type: "nodebuffer" });
  await assert.rejects(() => inspectTemplateWord(bytes));
});
