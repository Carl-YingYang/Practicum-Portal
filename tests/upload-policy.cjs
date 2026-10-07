const assert = require("node:assert/strict");
const { request } = require("playwright");
const sharp = require("sharp");
const { startServer } = require("./server-harness.cjs");
(async () => {
  const disabled = process.argv.includes("--disabled");
  const app = await startServer(disabled ? 3146 : 3145, {
    PORTAL_STUDENT_IMAGES: disabled ? "false" : "true",
    PORTAL_STUDENT_IMAGE_COUNT: "1",
    PORTAL_STUDENT_UPLOAD_MB: "1",
  });
  const c = await request.newContext({
    baseURL: app.baseURL,
    extraHTTPHeaders: { Origin: app.baseURL },
  });
  async function json(r, code = 200) {
    assert.equal(r.status(), code, await r.text());
    return r.json();
  }
  try {
    const cr = app.credentials.find((c) => c.email === "student1@example.test");
    await json(
      await c.post("/api/auth/login", {
        data: { email: cr.email, password: cr.password },
      }),
    );
    const p = await json(await c.get("/api/portal"));
    let r = await json(
        await c.post("/api/reports", {
          data: { studentIds: [p.currentUser.studentId] },
        }),
        201,
      ),
      path = `/api/reports/${r.id}`;
    assert.equal(r.uploadPolicy.imagesEnabled, false);
    const section = r.content.sections.find((s) => s.kind === "evidence");
    async function upload(
      buffer,
      name = "photo.png",
      mimeType = "image/png",
      code = 200,
    ) {
      const result = await c.post(path + "/assets", {
        multipart: {
          revision: String(r.revision),
          sectionId: section.id,
          kind: "evidence",
          file: { name, mimeType, buffer },
        },
      });
      if (code === 200) r = await json(result);
      else await json(result, code);
    }
    const image = await sharp({
      create: { width: 500, height: 400, channels: 3, background: "#28788b" },
    })
      .png()
      .toBuffer();
    const revision = r.revision;
    await upload(image, "photo.png", "image/png", 403);
    await upload(
      image,
      "pretend.docx",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      403,
    );
    await upload(
      Buffer.from("%PDF-1.4\n"),
      "photo.pdf",
      "application/pdf",
      403,
    );
    const after = await json(await c.get(path));
    assert.equal(after.revision, revision);
    assert.equal(after.assets.length, 0);
    const content = structuredClone(r.content);
    content.sections.find((s) => s.id === section.id).included = true;
    content.sections.find((s) => s.id === section.id).body =
      "Project presentation — add photograph in offline Word.";
    r = await json(
      await c.put(path, { data: { revision: r.revision, content } }),
    );
    r = await json(
      await c.post(path + "/export", {
        data: { revision: r.revision, allowIncomplete: true },
      }),
    );
    const asset = r.assets.find(
      (a) => a.kind === "export" && a.mime.includes("wordprocessingml"),
    );
    const bytes = await (await c.get(path + `/assets/${asset.id}`)).body();
    const JSZip = require("jszip");
    const xml = await (
      await JSZip.loadAsync(bytes)
    )
      .file("word/document.xml")
      .async("string");
    if (!disabled) {
      require("fs").mkdirSync("docs/verification", { recursive: true });
      require("fs").writeFileSync(
        "docs/verification/placeholder-evidence.docx",
        bytes,
      );
    }
    assert.ok(xml.includes("IMAGE PLACEHOLDER"));
    assert.ok(xml.includes("Project presentation"));
    r = await json(
      await c.post(path + "/assets", {
        multipart: {
          revision: String(r.revision),
          sectionId: r.versions.at(-1).id,
          kind: "reviewed",
          file: {
            name: "reviewed.docx",
            mimeType:
              "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            buffer: bytes,
          },
        },
      }),
    );
    assert.ok(r.assets.some((a) => a.kind === "reviewed"));
    console.log(
      `Student evidence prohibition passed (${disabled ? "legacy false flag" : "legacy true flag cannot bypass"}): images, disguised binaries, PDF rejected atomically; placeholder Word and grammarian return work.`,
    );
  } catch (e) {
    console.error(app.serverOutput());
    throw e;
  } finally {
    await c.dispose();
    await app.stop();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
