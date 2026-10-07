const assert = require("node:assert/strict");
const { chromium } = require("playwright");
const { startServer } = require("./server-harness.cjs");
const { randomUUID } = require("node:crypto");
(async () => {
  const app = await startServer(3144),
    browser = await chromium.launch({ headless: true, args: ["--no-sandbox"] }),
    page = await browser.newPage({
      viewport: { width: 320, height: 700 },
      timezoneId: "Asia/Manila",
    }),
    errors = [];
  page.setDefaultTimeout(20000);
  page.on("pageerror", (e) => errors.push(e.message));
  async function api(url, method = "GET", data) {
    return page.evaluate(
      async ({ url, method, data }) => {
        const r = await fetch(url, {
          method,
          headers: data ? { "Content-Type": "application/json" } : undefined,
          body: data ? JSON.stringify(data) : undefined,
        });
        const result = await r.json();
        if (!r.ok) throw Error(JSON.stringify(result));
        return result;
      },
      { url, method, data },
    );
  }
  async function nav(name) {
    if (name === "Form Library") name = "Forms";
    if (page.viewportSize().width < 1024) {
      await page
        .getByRole("button", { name: "Open navigation", exact: true })
        .click();
      await page
        .getByRole("dialog")
        .getByRole("button", { name: new RegExp("^" + name + "(?: |$)") })
        .click();
    } else
      await page
        .locator("aside")
        .getByRole("button", { name: new RegExp("^" + name + "(?: |$)") })
        .click();
  }
  async function overflow() {
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
    );
  }
  try {
    await page.goto(app.baseURL);
    const cr = app.credentials.find(
      (c) => c.email === "coordinator1@example.test",
    );
    await api("/api/auth/login", "POST", {
      email: cr.email,
      password: cr.password,
    });
    await api("/api/portal", "POST", {
      action: "createFormDocument",
      args: [{ title: "Quality UI draft", description: "", category: "other" }],
      ids: Array.from({ length: 20 }, () => randomUUID()),
      requestId: randomUUID(),
    });
    await page.reload();
    await page.getByRole("heading", { name: /Hello,/ }).waitFor();
    await nav("Form Library");
    await page
      .getByRole("button", {
        name: "Actions for Quality UI draft",
        exact: true,
      })
      .click();
    await page.getByRole("menuitem", { name: "Edit", exact: true }).click();
    const title = page.getByLabel("Form title", { exact: true });
    await title.fill("Edited Quality UI draft");
    await page.getByRole("button", { name: "Undo", exact: true }).click();
    await assertText(title, "Quality UI draft");
    await page.getByRole("button", { name: "Redo", exact: true }).click();
    await assertText(title, "Edited Quality UI draft");
    await overflow();
    await page.screenshot({
      path: "docs/screenshots/form-history-mobile.png",
      fullPage: true,
    });
    const sampleDownload = page.waitForEvent("download");
    await page
      .getByRole("button", { name: "Sample Word", exact: true })
      .click();
    assert.ok(
      (await sampleDownload).suggestedFilename().endsWith("-sample.docx"),
    );
    await nav("Form Library");
    await page
      .getByRole("button", {
        name: "Actions for Edited Quality UI draft",
        exact: true,
      })
      .click();
    await page
      .getByRole("menuitem", { name: "Move to Trash", exact: true })
      .click();
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Cancel", exact: true })
      .click();
    assert.ok(
      (await api("/api/portal")).data.formDocuments.some(
        (f) => f.title === "Edited Quality UI draft" && !f.trashedAt,
      ),
    );
    await page
      .getByRole("button", {
        name: "Actions for Edited Quality UI draft",
        exact: true,
      })
      .click();
    await page
      .getByRole("menuitem", { name: "Move to Trash", exact: true })
      .click();
    await page.screenshot({
      path: "docs/screenshots/form-trash-confirmation-mobile.png",
      fullPage: true,
    });
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Move to Trash", exact: true })
      .click();
    await page.getByRole("combobox").nth(1).click();
    await page.getByRole("option", { name: "Trash", exact: true }).click();
    await page
      .getByRole("button", { name: "Restore draft", exact: true })
      .click();
    const stored = (await api("/api/portal")).data.formDocuments.find(
      (f) => f.title === "Edited Quality UI draft",
    );
    assert.equal(stored.trashedAt, undefined);
    assert.equal(stored.status, "draft");
    await page.setViewportSize({ width: 1440, height: 1000 });
    await nav("Practicum");
    await page
      .getByRole("button", { name: "Prepare completed demo", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Open completed report", exact: true })
      .waitFor();
    await page
      .getByRole("button", { name: "Open completed report", exact: true })
      .click();
    await page
      .getByRole("heading", { name: /Completed Demo/ })
      .first()
      .waitFor();
    await overflow();
    await page.screenshot({
      path: "docs/screenshots/completed-report-desktop.png",
      fullPage: true,
    });
    assert.deepEqual(errors, []);
    console.log(
      "Form UI passed: 320px undo/redo, Word download, deletion cancellation/confirmation, Trash restoration, completed report navigation, desktop overflow and no browser exceptions.",
    );
  } catch (e) {
    console.error(app.serverOutput());
    console.error(await page.getByRole("button").allTextContents());
    await page.screenshot({
      path: "/tmp/practo-quality-ui-failed.png",
      fullPage: true,
    });
    throw e;
  } finally {
    await browser.close();
    await app.stop();
  }
  async function assertText(input, text) {
    for (let i = 0; i < 40; i++) {
      if ((await input.inputValue()) === text) return;
      await page.waitForTimeout(50);
    }
    assert.equal(await input.inputValue(), text);
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
