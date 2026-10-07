const assert = require("node:assert/strict");
const { chromium } = require("playwright");
const { startServer } = require("./server-harness.cjs");
(async () => {
  const app = await startServer(3142);
  let browser;
  try {
    browser = await chromium.launch({ headless: true, args: ["--no-sandbox"] });
    const page = await browser.newPage({
        viewport: { width: 320, height: 568 },
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
          const b = await r.json();
          if (!r.ok) throw Error(JSON.stringify(b));
          return b;
        },
        { url, method, data },
      );
    }
    async function login(role) {
      const session = await api("/api/auth/session"),
        user = session.demoAccounts.find(
          (u) => u.email === `${role}1@example.test`,
        );
      assert.ok(user);
      await api("/api/auth/demo", "POST", { userId: user.id });
      await page.reload();
      await page.getByRole("heading", { name: /Hello,/ }).waitFor();
    }
    async function nav(label) {
      if (page.viewportSize().width < 1024) {
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
      const sizes = await page.evaluate(() => ({
        width: innerWidth,
        scroll: document.documentElement.scrollWidth,
        offenders: [...document.querySelectorAll("main *")]
          .filter((e) => e.getBoundingClientRect().right > innerWidth + 1)
          .slice(0, 15)
          .map((e) => ({
            tag: e.tagName,
            text: e.textContent.slice(0, 100),
            cls: e.className,
            right: e.getBoundingClientRect().right,
          })),
      }));
      assert.ok(sizes.scroll <= sizes.width + 1, JSON.stringify(sizes));
    }
    async function section(label) {
      await page
        .getByLabel("Current section", { exact: true })
        .selectOption({ label: `Sample Student 1 — ${label}` });
    }
    async function ready() {
      await page
        .getByRole("button", { name: "Ready for review", exact: true })
        .click();
      await page.getByRole("button", { name: "Save now", exact: true }).click();
    }
    async function submit() {
      await page
        .getByRole("button", { name: "Submit responses", exact: true })
        .last()
        .click();
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
    }
    await page.goto(app.baseURL);
    await page.getByRole("heading", { name: "Welcome back." }).waitFor();
    await page
      .getByRole("button", { name: "Try coordinator account", exact: true })
      .waitFor();
    await login("coordinator");
    await nav("Practicum");
    await page
      .getByRole("heading", { name: "File storage", exact: true })
      .waitFor();
    await page
      .getByRole("button", { name: "How to use Practo", exact: true })
      .click();
    await page
      .getByRole("dialog")
      .getByText("Forgot what a status means?", { exact: true })
      .waitFor();
    await overflow();
    assert.ok(
      (await page
        .getByRole("dialog")
        .evaluate((e) => e.getBoundingClientRect().height)) <=
        568 * 0.85 + 1,
    );
    await page.keyboard.press("Escape");
    await page
      .getByRole("button", { name: "Prepare guided sample", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Open guided report", exact: true })
      .waitFor();
    await overflow();
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({
      path: "docs/screenshots/connected-practicum-mobile.png",
      fullPage: false,
    });
    const reports = (await api("/api/reports")).reports,
      reportId = reports.find((r) => r.title === "Guided demo practicum").id;
    await page.setViewportSize({ width: 1440, height: 1000 });
    await overflow();
    await page.screenshot({
      path: "docs/screenshots/connected-practicum-desktop.png",
      fullPage: true,
    });
    // Direct linking works from the actual editor, without disturbing v1 assignment.
    await nav("Form Library");
    const card = page
      .locator("div.rounded-lg")
      .filter({
        has: page.getByRole("heading", {
          name: "Guided demo — Supervisor evaluation",
          exact: true,
        }),
      })
      .filter({
        has: page.getByRole("button", { name: "Open editor", exact: true }),
      })
      .last();
    await card
      .getByRole("button", { name: "Open editor", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Add to practicum report", exact: true })
      .click();
    const templates = await api("/api/templates");
    const tid = templates.templates.find(
      (t) => t.title === "Guided demo practicum",
    ).id;
    await page.getByLabel("Report format", { exact: true }).selectOption(tid);
    await page
      .getByLabel("Destination section", { exact: true })
      .selectOption("supervisor_evaluation");
    await page
      .getByRole("button", { name: "Save link to format draft", exact: true })
      .click();
    await page.getByText(/is linked to Guided demo practicum/).waitFor();
    assert.equal((await api(`/api/reports/${reportId}`)).binding.number, 1);
    await page.setViewportSize({ width: 320, height: 568 });
    await overflow();
    await login("student");
    await nav("My Practicum Report");
    await page.getByRole("button", { name: /Guided demo practicum/ }).click();
    await page
      .getByLabel("Section content", { exact: true })
      .fill(
        "I am learning through a supervised placement. My goal is to improve documentation.",
      );
    await ready();
    await section("Student reflection");
    await page
      .getByRole("button", { name: /^Open Guided demo — Student reflection/ })
      .click();
    await page
      .getByText(
        "Assigned format · Rubric v1 · Answers belong to this report requirement.",
        { exact: true },
      )
      .waitFor();
    for (const label of [
      "Personal growth and career readiness",
      "Alignment with career goals",
      "Areas for improvement and future learning",
    ])
      await page
        .getByLabel(label, { exact: true })
        .fill("UI CONNECTED REFLECTION — learning with a mentor.");
    await submit();
    await overflow();
    await page
      .getByRole("button", { name: "Back to assigned report", exact: true })
      .click();
    await section("Student reflection");
    await ready();
    await login("supervisor");
    await nav("Shared Forms");
    await page.getByText(/interns? still need your responses/).waitFor();
    await page.getByRole("button", { name: /^To do \(/ }).click();
    assert.ok(
      await page
        .getByRole("button", { name: /Guided demo — Supervisor evaluation/ })
        .count(),
    );
    await overflow();
    await page.screenshot({
      path: "docs/screenshots/supervisor-checklist-mobile.png",
      fullPage: true,
    });
    await page.getByRole("button", { name: /^All \(/ }).click();

    await page
      .getByRole("button", { name: /Guided demo — Supervisor evaluation/ })
      .click();
    await page
      .getByText("Sample Student 1 · Guided testing cycle", { exact: true })
      .waitFor();
    const ratings = page.getByRole("button", {
      name: /^Rate .* as Very Good \(4\)$/,
    });
    assert.equal(await ratings.count(), 2);
    await ratings.nth(0).click();
    await ratings.nth(1).click();
    await submit();
    await overflow();
    await page
      .getByRole("button", { name: "Back to assigned report", exact: true })
      .click();
    await section("Supervisor evaluation");
    await ready();
    await login("student");
    await nav("Forms");
    await page.getByRole("heading", { name: /From your supervisor/ }).waitFor();
    const shared = page
      .locator("details")
      .filter({
        has: page.locator("summary", {
          hasText: "Guided demo — Supervisor evaluation",
        }),
      });
    await shared.locator("summary").click();
    await shared.getByText(/coordinator approval is still required/).waitFor();
    assert.equal(
      await shared.getByRole("textbox").count(),
      0,
      "supervisor responses are readonly",
    );
    const download = page.waitForEvent("download");
    await shared
      .getByRole("button", { name: "Answered Word", exact: true })
      .click();
    assert.ok((await download).suggestedFilename().endsWith("-answered.docx"));
    await overflow();
    await page.screenshot({
      path: "docs/screenshots/supervisor-handoff-mobile.png",
      fullPage: true,
    });
    await login("coordinator");
    await nav("Practicum");
    await page
      .getByRole("button", { name: "Review form responses", exact: true })
      .click();
    for (const title of [
      "Guided demo — Student reflection",
      "Guided demo — Supervisor evaluation",
    ]) {
      await page
        .getByRole("row")
        .filter({ has: page.getByText(title, { exact: true }) })
        .click();
      const dialog = page.getByRole("dialog");
      await dialog
        .getByRole("button", { name: "Approve", exact: true })
        .click();
      await dialog
        .getByRole("button", { name: "Confirm approval", exact: true })
        .click();
      await page.getByRole("dialog").waitFor({ state: "hidden" });
    }
    await nav("Practicum");
    await page
      .getByRole("button", { name: "Review & export", exact: true })
      .click();
    assert.equal(
      await page
        .getByText("Independent / combined drafts", { exact: true })
        .count(),
      0,
    );
    await page.getByRole("button", { name: /Guided demo practicum/ }).click();
    for (const label of [
      "My practicum introduction",
      "Student reflection",
      "Supervisor evaluation",
    ]) {
      await section(label);
      await page
        .getByRole("button", { name: "Mark reviewed", exact: true })
        .click();
      await page
        .getByRole("button", { name: "Mark reviewed", exact: true })
        .waitFor({ state: "hidden" });
    }
    await page
      .getByRole("button", { name: "Preview report", exact: true })
      .click();
    await page
      .locator("details")
      .filter({
        has: page.locator("summary", {
          hasText: "Guided demo — Student reflection",
        }),
      })
      .locator("summary")
      .click();
    await page
      .getByText("UI CONNECTED REFLECTION — learning with a mentor.", {
        exact: true,
      })
      .first()
      .waitFor();
    await overflow();
    await page
      .getByRole("button", { name: "Close report preview", exact: true })
      .click();

    await page
      .getByRole("button", { name: "Build full Word report", exact: true })
      .click();
    await page.getByText(/Version 1 ·/).waitFor();
    const report = await api(`/api/reports/${reportId}`);
    assert.equal(report.versions.length, 1);
    assert.ok(report.content.sections.every((s) => s.status === "reviewed"));
    await overflow();
    assert.deepEqual(errors, []);
    console.log(
      "Connected browser passed: visible testing login, coordinator hub/help/direct linking, 320px short mobile and desktop, student draft/save/submit, supervisor correct-intern ratings, coordinator approvals/reviews, preview and final Word. Zero page errors.",
    );
  } finally {
    if (browser) await browser.close();
    await app.stop();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
