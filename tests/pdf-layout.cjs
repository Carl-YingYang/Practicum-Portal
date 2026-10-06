// Inspect generated PDF text geometry, not just whether a download was emitted.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const jspdf = require("jspdf");
const ActualPdf = jspdf.jsPDF;
let captured;
jspdf.jsPDF = function (...args) {
  const doc = new ActualPdf(...args);
  doc.save = () => { captured = doc; return doc; };
  return doc;
};
const { load } = require("./load-ts.cjs");
const filename = load("src/lib/pdf-renderer.ts").downloadPdfReport({
  filename: "long-record",
  title: "Practicum journal and evaluation record for a student with a long institutional report title",
  subtitle: "Semester 2026 · Sample school · Multiple reporting periods",
  meta: [{ label: "Student", value: "Sample Student With A Very Long Name ".repeat(8) }, { label: "Email", value: "long-email-address-".repeat(12) + "@example.test" }],
  sections: [
    { heading: "Student context", keyValue: Array.from({ length: 18 }, (_, i) => ({ label: `Context ${i + 1}`, value: "This context includes a detailed multi-line record. ".repeat(8) })) },
    { heading: "Journal narrative", paragraphs: [{ label: "Tasks and reflections", text: Array.from({ length: 160 }, (_, i) => `Narrative line ${i + 1}: Verified an actual practicum task and its outcome.`).join("\n") }] },
    { heading: "Attendance records", table: { head: ["Date", "Details", "Hours"], body: Array.from({ length: 100 }, (_, i) => [String(i + 1), "Completed sample attendance session and documented the outcome", "8"]) } },
  ],
});
assert.equal(filename, "long-record.pdf");
assert.ok(captured.getNumberOfPages() >= 7);
const folder = fs.mkdtempSync(path.join(os.tmpdir(), "practo-pdf-layout-"));
try {
  const pdf = path.join(folder, filename);
  fs.writeFileSync(pdf, Buffer.from(captured.output("arraybuffer")));
  const result = spawnSync("python", ["-c", `
import fitz, sys
doc = fitz.open(sys.argv[1])
text = "".join(p.get_text() for p in doc)
assert "Narrative line 160" in text, "last narrative line must survive pagination"
assert "Context 18" in text, "last metadata item must survive pagination"
for i, page in enumerate(doc):
    assert f"Page {i+1} of {len(doc)}" in page.get_text(), "every page has a footer"
    for word in page.get_text("words"):
        x0,y0,x1,y1 = word[:4]
        assert x0 >= 39 and x1 <= page.rect.width - 39, (i+1, "horizontal text overflow", word)
        assert y0 >= 15 and y1 <= page.rect.height - 9, (i+1, "vertical text overflow", word)
print(f"PASS {len(doc)}-page PDF: wrapped long metadata, complete narrative/table and in-bounds text on every page")
`, pdf], { encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  process.stdout.write(result.stdout);
} finally { fs.rmSync(folder, { recursive: true, force: true }); }
