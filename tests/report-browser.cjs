const assert = require("node:assert/strict");
const { chromium } = require("playwright");
const { startServer } = require("./server-harness.cjs");
(async () => {
  const app = await startServer(3133),
    browser = await chromium.launch({ headless: true, args: ["--no-sandbox"] }),
    page = await browser.newPage({
      viewport: { width: 320, height: 700 },
      timezoneId: "Asia/Manila",
    });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.setDefaultTimeout(20000);
  async function login(role) {
    await page.evaluate(async (role) => {
      const session = await (await fetch("/api/auth/session")).json();
      const u = session.demoAccounts.find(
        (u) => u.email === `${role}1@example.test`,
      );
      const r = await fetch("/api/auth/demo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: u.id }),
      });
      if (!r.ok) throw new Error(await r.text());
    }, role);
    await page.reload();
    await page.getByRole("heading", { name: /Hello,/ }).waitFor();
  }
  async function nav(label) {
    if ((await page.viewportSize()).width < 1024) {
      await page
        .getByRole("button", { name: "Open navigation", exact: true })
        .click();
      await page
        .getByRole("dialog")
        .getByRole("button", { name: new RegExp("^" + label + "(?: |$)") })
        .click();
    } else
      await page
        .locator("aside")
        .getByRole("button", { name: new RegExp("^" + label + "(?: |$)") })
        .click();
  }
  async function overflow() {
    const width = await page.evaluate(() => ({
      scroll: document.documentElement.scrollWidth,
      width: innerWidth,
    }));
    assert.ok(width.scroll <= width.width + 1, JSON.stringify(width));
  }
  try {
    await page.goto(app.baseURL);
    await page.getByRole("heading", { name: "Welcome back." }).waitFor();
    await login("student");
    await nav("My Practicum Report");
    await page
      .getByText("Independent / combined drafts", { exact: true })
      .click();
    await page
      .getByRole("button", { name: "Create report", exact: true })
      .click();
    await page.getByLabel("Report title", { exact: true }).waitFor();
    const reflectionOption = await page
      .getByLabel("Current section", { exact: true })
      .locator("option")
      .filter({ hasText: "Reflection and Self-Assessment" })
      .first()
      .getAttribute("value");
    await page
      .getByLabel("Current section", { exact: true })
      .selectOption(reflectionOption);
    const editor = page.getByLabel("Section content", { exact: true });
    await editor.fill("Initial reflection for a mobile student.");
    await page.getByRole("button", { name: "Save now", exact: true }).click();
    await page.route("**/api/reports/*", async (route) => {
      if (route.request().method() === "PUT") {
        await new Promise((r) => setTimeout(r, 1200));
        await route.continue();
      } else await route.continue();
    });
    await editor.fill("First edit during slow saving.");
    await page.waitForTimeout(1000);
    await editor.fill("LATEST REFLECTION MUST SURVIVE.");
    await page.getByRole("button", { name: "Save now", exact: true }).click();
    await page
      .getByRole("status")
      .filter({ hasText: /^Saved/ })
      .waitFor();
    await page.unroute("**/api/reports/*");
    const list = await page.evaluate(
      async () => await (await fetch("/api/reports")).json(),
    );
    const reportId = list.reports[0].id;
    let report = await page.evaluate(
      async (id) => await (await fetch("/api/reports/" + id)).json(),
      reportId,
    );
    assert.ok(
      report.content.sections.some(
        (s) => s.body === "LATEST REFLECTION MUST SURVIVE.",
      ),
      JSON.stringify(
        report.content.sections.map((s) => ({ title: s.title, body: s.body })),
      ),
    );
    await page
      .getByRole("button", { name: "Ready for review", exact: true })
      .click();
    await page.getByRole("button", { name: "Save now", exact: true }).click();
    await page.getByRole("button", { name: "Preview", exact: true }).click();
    await page
      .getByText("LATEST REFLECTION MUST SURVIVE.", { exact: true })
      .waitFor();
    await overflow();
    await page.screenshot({
      path: "docs/screenshots/report-builder-mobile.png",
      fullPage: false,
    });
    await page.getByLabel("Export a draft with outstanding checks").check();
    await page
      .getByRole("button", { name: "Build full Word report", exact: true })
      .click();
    await page.getByRole("heading", { name: /Version 1/ }).waitFor();
    await page
      .getByRole("link", { name: "practicum-report-v1.docx", exact: true })
      .waitFor();
    await overflow();
    // A failed save must keep local text and block leaving; retry persists it.
    await page.getByRole("button", { name: "Editor", exact: true }).click();
    let failed = false;
    await page.route("**/api/reports/*", async (route) => {
      if (route.request().method() === "PUT" && !failed) {
        failed = true;
        await route.fulfill({
          status: 503,
          contentType: "application/json",
          body: JSON.stringify({ error: "Simulated save interruption" }),
        });
      } else await route.continue();
    });
    await editor.fill("RECOVERABLE LOCAL REFLECTION.");
    await page.getByRole("button", { name: "Save now", exact: true }).click();
    await page
      .getByRole("alert")
      .filter({ hasText: "Simulated save interruption" })
      .waitFor();
    assert.equal(await editor.inputValue(), "RECOVERABLE LOCAL REFLECTION.");
    await page.getByRole("button", { name: "Retry save", exact: true }).click();
    await page.unroute("**/api/reports/*");
    await page.setViewportSize({ width: 1280, height: 850 });
    await page
      .getByRole("button", { name: "Preview report", exact: true })
      .click();
    await page
      .getByText("RECOVERABLE LOCAL REFLECTION.", { exact: true })
      .waitFor();
    await overflow();
    await page.screenshot({
      path: "docs/screenshots/report-builder-desktop.png",
      fullPage: false,
    });
    await login("supervisor");
    await nav("My Interns");
    await page
      .getByRole("row")
      .filter({ has: page.getByText("Sample Student 1", { exact: true }) })
      .click();
    await page
      .getByRole("button", { name: "Review practicum report", exact: true })
      .click();
    await page.getByRole("button", { name: /Practicum Report/ }).click();
    assert.equal(
      await page
        .getByRole("button", { name: "Ready for review", exact: true })
        .count(),
      0,
    );
    assert.equal(
      await page.getByLabel("Report title", { exact: true }).isDisabled(),
      true,
    );
    await overflow();
    // Existing notifications now have persistent read state and optional sound controls.
    await page.getByRole("button", { name: /^Notifications/ }).click();
    await page.getByLabel("Notification sound", { exact: true }).waitFor();
    await page.getByRole("button", { name: "Test sound", exact: true }).click();
    await page.keyboard.press("Escape");
    await page.setViewportSize({ width: 320, height: 700 });
    await login("coordinator");
    await nav("Forms");
    await page
      .getByRole("button", { name: "New form", exact: true })
      .first()
      .click();
    await page
      .getByLabel("Starter template", { exact: true })
      .selectOption("reflection");
    await page
      .getByLabel("Form title", { exact: true })
      .fill("Browser Reflection Check");
    await page.getByRole("button", { name: "Next", exact: true }).click();
    await page
      .getByRole("heading", { name: "Questions included", exact: true })
      .waitFor();
    await page
      .getByRole("listitem")
      .filter({ hasText: "Personal growth and career readiness" })
      .waitFor();
    await page.getByRole("button", { name: "Next", exact: true }).click();
    await page.getByRole("button", { name: /Specific people/ }).click();
    const recipient = page
      .getByRole("dialog")
      .locator("label")
      .filter({ hasText: "Sample Student 1" })
      .first();
    await recipient.locator("input[type=checkbox]").check();
    await page.getByRole("checkbox", { name: /Publish immediately/ }).check();
    await page
      .getByRole("button", { name: "Publish & assign", exact: true })
      .click();
    await page.getByRole("dialog").waitFor({ state: "hidden" });
    const state = await page.evaluate(
      async () => (await (await fetch("/api/portal")).json()).data,
    );
    const form = state.formDocuments.find(
      (f) => f.title === "Browser Reflection Check",
    );
    assert.equal(form.status, "published");
    assert.equal(
      state.formAssignments.find((a) => a.formId === form.id).targetUserIds
        .length,
      1,
    );
    await login("student");
    await nav("Forms");
    await page
      .locator("div.group")
      .filter({
        has: page.getByRole("heading", {
          name: "Browser Reflection Check",
          exact: true,
        }),
      })
      .getByRole("button", { name: "Start Form", exact: true })
      .click();
    for (const label of [
      "Personal growth and career readiness",
      "Alignment with career goals",
      "Areas for improvement and future learning",
    ]) {
      await page
        .getByLabel(label, { exact: true })
        .fill("A meaningful answer to " + label);
    }
    await page
      .getByRole("button", { name: "Submit responses", exact: true })
      .last()
      .click();
    await page
      .getByRole("heading", { name: "Submit these responses?", exact: true })
      .waitFor();
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Submit responses", exact: true })
      .click();
    await page
      .getByText("Submitted — waiting for the coordinator to review.", {
        exact: true,
      })
      .waitFor();
    await page.getByRole("dialog").waitFor({ state: "hidden" });
    const submitted = await page.evaluate(
      async () =>
        (await (await fetch("/api/portal")).json()).data.formSubmissions,
    );
    assert.equal(
      submitted.find((s) => s.formId === form.id).status,
      "submitted",
    );
    await overflow();
    assert.deepEqual(errors, []);
    console.log(
      "Report browser workflow passed: 320px/desktop layout, serialized autosave, preview, Word versions, failed-save recovery, supervisor read-only, sound UI, starter question preview, specific-recipient assignment and confirmed form submission.",
    );
  } finally {
    await browser.close();
    await app.stop();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
