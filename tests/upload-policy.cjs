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
    assert.equal(r.uploadPolicy.imagesEnabled, !disabled);
    assert.equal(r.uploadPolicy.maxImages, 1);
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
    await upload(image, "photo.png", "image/png", disabled ? 403 : 200);
    if (!disabled) {
      await upload(image);
      assert.equal(r.assets.filter((a) => a.kind === "evidence").length, 1);
      const revision = r.revision;
      const other = await sharp({
        create: { width: 500, height: 400, channels: 3, background: "#486f52" },
      })
        .png()
        .toBuffer();
      await upload(other, "other.png", "image/png", 413);
      const oversized = Buffer.alloc(2 * 1024 * 1024, 32);
      oversized.write("%PDF-1.4\n");
      await upload(oversized, "large.pdf", "application/pdf", 413);
      const after = await json(await c.get(path));
      assert.equal(after.revision, revision);
      assert.equal(after.assets.length, r.assets.length);
    }
    console.log(
      disabled
        ? "Student image gate passed: server rejects images when disabled."
        : "Upload policy passed: image-count limit, duplicate reuse, student byte budget and atomic rejection without losing saved assets.",
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
