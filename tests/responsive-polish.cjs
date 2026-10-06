const assert = require("node:assert/strict");
const { chromium } = require("playwright");
const { startServer } = require("./server-harness.cjs");

(async () => {
  const app = await startServer(3124);
  const browser = await chromium.launch({ headless: true, args: ["--no-sandbox"] });
  const page = await browser.newPage({ viewport: { width: 360, height: 640 } });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const snapshot = () => page.evaluate(async () => (await (await fetch("/api/portal")).json()).data);
  async function role(role) {
    await page.evaluate(async (role) => {
      const session = await (await fetch("/api/auth/session")).json();
      const user = session.demoAccounts.find((u) => u.email === `${role}1@example.test`);
      const response = await fetch("/api/auth/demo", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId: user.id }),
      });
      if (!response.ok) throw new Error(await response.text());
    }, role);
    await page.reload();
    await page.getByRole("heading", { name: /Hello,/ }).waitFor();
  }
  async function navigate(label, heading) {
    if (page.viewportSize().width < 1024) {
      await page.getByRole("button", { name: "Open navigation", exact: true }).click();
      await page.getByRole("dialog").getByRole("button", { name: new RegExp("^" + label + "(?: |$)") }).click();
    } else await page.getByRole("button", { name: new RegExp("^" + label + "(?: |$)") }).first().click();
    if (heading) await page.getByRole("heading", { name: heading, exact: true }).waitFor();
  }
  async function noOverflow(label) {
    await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1);
    if (overflow) console.log(label, await page.evaluate(() => [...document.querySelectorAll("main *")].map((e) => ({ tag: e.tagName, cls: e.className, width: e.getBoundingClientRect().width, right: e.getBoundingClientRect().right })).filter((e) => e.right > innerWidth + 1).slice(0, 15)));
    assert.equal(overflow, false, label);
  }
  async function shot(name) {
    for (const close of await page.locator("[toast-close]").all()) { if (await close.isVisible()) await close.click(); }
    await page.screenshot({ path: `docs/screenshots/${name}.png`, fullPage: false });
  }
  try {
    let release;
    const ready = new Promise((resolve) => { release = resolve; });
    await page.route("**/api/auth/session", async (route) => { await ready; await route.continue(); });
    await page.goto(app.baseURL);
    await page.getByRole("status", { name: "Loading workspace" }).waitFor();
    release();
    await page.getByRole("heading", { name: "Welcome back." }).waitFor();
    await page.unroute("**/api/auth/session");
    await page.route("**/api/auth/session", (route) => route.fulfill({ status: 500, contentType: "application/json", body: "{" }));
    await page.reload();
    await page.getByText("The server returned an incomplete response. Please retry.").waitFor();
    await page.unroute("**/api/auth/session");
    await page.getByRole("button", { name: "Retry connection", exact: true }).click();
    await page.getByRole("button", { name: "Try coordinator account", exact: true }).waitFor();
    console.log("PASS real session loading and malformed-response recovery");

    await role("coordinator");
    for (const size of [{ width: 320, height: 568 }, { width: 360, height: 360 }, { width: 640, height: 360 }]) {
      await page.setViewportSize(size);
      await page.getByRole("button", { name: "Open navigation", exact: true }).click();
      const drawer = page.getByRole("dialog");
      await drawer.evaluate(async (e) => { await Promise.all(e.getAnimations().map((a) => a.finished.catch(() => {}))); });
      const scroll = drawer.locator("[data-navigation-scroll]");
      const heights = await scroll.evaluate((e) => ({ client: e.clientHeight, scroll: e.scrollHeight }));
      assert.ok(heights.scroll > heights.client && heights.client > 0, "menu has a bounded scroll region");
      await scroll.evaluate((e) => { e.scrollTop = e.scrollHeight; });
      const reports = drawer.getByRole("button", { name: "Reports", exact: true });
      await reports.scrollIntoViewIfNeeded();
      const bounds = await reports.boundingBox();
      assert.ok(bounds.y >= 0 && bounds.y + bounds.height <= size.height, "last navigation item stays reachable");
      if (size.width === 320) await shot("polish-sidebar-mobile");
      await page.keyboard.press("Escape");
      await page.waitForFunction(() => document.querySelector("[data-mobile-navigation-trigger]") === document.activeElement);
    }
    await page.setViewportSize({ width: 360, height: 640 });
    const profile = page.getByRole("button", { name: "Open profile menu", exact: true });
    const box = await profile.boundingBox();
    assert.equal(box.width, 44); assert.equal(box.height, 44);
    await navigate("Students", "Students");
    await page.getByText("Sample Student 1", { exact: true }).first().click();
    await page.getByRole("heading", { name: "Sample Student 1", exact: true }).first().waitFor();
    for (const width of [320, 360, 390, 768]) {
      await page.setViewportSize({ width, height: 640 });
      await noOverflow(`Student detail ${width}`);
      for (const label of ["Overview", "Time Logs", "Journals", "Evaluations"]) {
        const tab = page.getByRole("tab", { name: new RegExp("^" + label + "(?: |$)") });
        await tab.click();
        await noOverflow(`Student ${label} ${width}`);
      }
      assert.equal(await page.getByRole("button", { name: "Edit", exact: true }).count(), 1, "detail actions appear once");
    }
    await page.getByRole("tab", { name: "Overview", exact: true }).click();
    await page.setViewportSize({ width: 360, height: 640 });
    await page.getByRole("tab", { name: "Overview", exact: true }).scrollIntoViewIfNeeded();
    // Wait for the existing count-up before taking visual evidence.
    await page.waitForFunction(() => [...document.querySelectorAll("span")].filter((e) => e.textContent === "27%").length >= 2);
    await shot("polish-student-detail-mobile");
    console.log("PASS short/landscape scrollable navigation, keyboard dismissal, square profile control and student tabs at 320–768px");

    await navigate("User Management", "User Management");
    await page.getByRole("button", { name: "Add User", exact: true }).click();
    await page.getByRole("menuitem", { name: /Add Coordinator/ }).click();
    await page.getByRole("heading", { name: "Add Coordinator", exact: true }).waitFor();
    await page.getByLabel("Full Name", { exact: false }).fill("Responsive Test Coordinator");
    await page.getByLabel("Email", { exact: false }).fill("polish.coordinator@example.test");
    await page.getByLabel("Title", { exact: false }).fill("Practicum Coordinator");
    await page.getByLabel("Department", { exact: false }).click();
    await page.getByRole("option").first().click();
    let postCount = 0, began;
    const started = new Promise((resolve) => { began = resolve; });
    const saved = new Promise((resolve) => { release = resolve; });
    await page.route("**/api/portal", async (route) => {
      if (route.request().method() === "POST") { postCount++; began(); await saved; }
      await route.continue();
    });
    await page.getByRole("button", { name: "Create Coordinator", exact: true }).click();
    await started;
    assert.ok(await page.getByRole("button", { name: "Saving…", exact: true }).isDisabled());
    release();
    await page.getByRole("dialog").waitFor();
    assert.equal(postCount, 1);
    assert.equal((await snapshot()).coordinators.filter((c) => c.email === "polish.coordinator@example.test").length, 1);
    await page.unroute("**/api/portal");
    await page.keyboard.press("Escape");
    console.log("PASS coordinator creation access, pending state, single request and persisted account");

    await navigate("Forms", "Forms & Reviews");
    const form = (await snapshot()).formDocuments.find((f) => f.status === "published");
    await page.getByRole("button", { name: `Actions for ${form.title}`, exact: true }).click();
    await page.getByRole("menuitem", { name: "Edit", exact: true }).click();
    await page.getByText("Published form — unpublish to edit the template.", { exact: true }).waitFor();
    assert.equal(await page.getByRole("button", { name: "Duplicate block", exact: true }).count(), 0);
    await page.getByRole("button", { name: "Unpublish", exact: true }).click();
    await page.getByRole("button", { name: "Duplicate block", exact: true }).first().waitFor();
    for (const width of [320, 360, 390, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 640 });
      await noOverflow(`Form editor ${width}`);
    }
    await page.setViewportSize({ width: 360, height: 640 });
    await page.getByRole("button", { name: "Duplicate block", exact: true }).first().scrollIntoViewIfNeeded();
    await shot("polish-form-editor-mobile");
    await page.getByRole("button", { name: "Publish", exact: true }).click();
    await page.getByText("Published form — unpublish to edit the template.", { exact: true }).waitFor();
    await page.getByRole("button", { name: "Exit", exact: true }).click();
    await page.getByRole("heading", { name: "Forms & Reviews", exact: true }).waitFor();
    await page.route("**/api/portal", (route) => route.request().method() === "POST"
      ? route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ error: "Simulated form action failure" }) })
      : route.continue());
    await page.getByRole("button", { name: `Actions for ${form.title}`, exact: true }).click();
    await page.getByRole("menuitem", { name: "Revert to draft", exact: true }).click();
    await page.getByText("Simulated form action failure Retry the form action.", { exact: true }).waitFor();
    assert.equal((await snapshot()).formDocuments.find((f) => f.id === form.id).status, "published");
    await page.unroute("**/api/portal");
    await page.getByRole("button", { name: `Actions for ${form.title}`, exact: true }).click();
    await page.getByRole("menuitem", { name: "Revert to draft", exact: true }).click();
    await page.getByText("Reverted to draft", { exact: true }).waitFor();
    assert.equal((await snapshot()).formDocuments.find((f) => f.id === form.id).status, "draft");
    await page.getByRole("button", { name: `Actions for ${form.title}`, exact: true }).click();
    await page.getByRole("menuitem", { name: "Preview", exact: true }).click();
    await page.getByRole("dialog").waitFor();
    const download = page.waitForEvent("download");
    await page.getByRole("button", { name: "Export PDF", exact: true }).click();
    assert.ok((await download).suggestedFilename().endsWith(".pdf"));
    await page.emulateMedia({ media: "print" });
    assert.equal(await page.locator(".editorial-shell").isVisible(), false);
    assert.ok(await page.locator(".print-area").isVisible());
    await page.emulateMedia({ media: "screen" });
    await page.keyboard.press("Escape");
    console.log("PASS responsive form editor, published read-only flow, actual PDF download and document-only print preview");
    // Long records are fixture changes in this disposable test database only.
    await page.evaluate(async () => {
      const data = (await (await fetch("/api/portal")).json()).data;
      const response = await fetch("/api/portal", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "updateStudent", args: [data.students[1].id, { name: "Sample Student With A Very Long Institutional Name And Multiple Surnames", email: "very-long-student-email-address-for-mobile-layout-verification@example.test" }], ids: [], requestId: crypto.randomUUID() }),
      });
      if (!response.ok) throw new Error(await response.text());
    });
    const { navConfig } = require("./load-ts.cjs").load("src/lib/nav.ts");
    for (const actor of ["coordinator", "student", "supervisor"]) {
      await role(actor);
      for (const { width, theme } of [{ width: 320, theme: "light" }, { width: 390, theme: "dark" }, { width: 768, theme: "light" }]) {
        await page.setViewportSize({ width, height: 640 });
        await page.evaluate((theme) => {
          localStorage.setItem("theme", theme);
          document.documentElement.classList.toggle("dark", theme === "dark");
        }, theme);
        for (const item of navConfig[actor]) {
          await navigate(item.label);
          await page.getByRole("status", { name: "Loading workspace" }).waitFor({ state: "hidden" });
          await page.locator("main").getByRole("heading").first().waitFor();
          await noOverflow(`${actor} ${item.label} ${width} ${theme}`);
        }
      }
    }
    console.log("PASS all role navigation pages at 320/390/768px, light/dark, including long student names and emails");
    assert.deepEqual(errors, []);
  } catch (error) {
    await page.screenshot({ path: "/tmp/practo-polish-failure.png", fullPage: true });
    throw error;
  } finally { await browser.close(); await app.stop(); }
})().catch((error) => { console.error(error); process.exitCode = 1; });
