const { chromium } = require("playwright");
const assert = require("node:assert/strict");
const { spawn } = require("node:child_process");
const server = spawn(
  "node",
  [
    "node_modules/next/dist/bin/next",
    "start",
    "--hostname",
    "127.0.0.1",
    "--port",
    "3101",
  ],
  { cwd: process.cwd(), stdio: "ignore" },
);
process.on("exit", () => server.kill());
(async () => {
  await new Promise((r) => setTimeout(r, 1000));
  const browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox"],
  });
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
  });
  const errors = [];
  page.on("pageerror", (e) => {
    errors.push(e.message);
    console.log("PAGE ERROR", e.message);
  });
  await page.goto("http://127.0.0.1:3101");
  await page.getByRole("heading", { name: "Welcome back." }).waitFor();
  await page.getByRole("button", { name: "Explore the prototype" }).click();
  await page.getByRole("button", { name: /Student Juan/ }).click();
  await page.getByRole("heading", { name: /Hello, Juan/ }).waitFor();
  console.log(
    "Student dashboard",
    await page.locator("html").getAttribute("class"),
  );
  console.log(
    "surfaces",
    await page
      .locator("body")
      .evaluate((el) => ({
        bg: getComputedStyle(el).backgroundColor,
        fg: getComputedStyle(el).color,
      })),
  );
  await page.screenshot({
    path: "docs/screenshots/student-light.png",
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "Write a journal", exact: true })
    .click();
  await page
    .getByRole("heading", { name: "Drafting Room", exact: true })
    .waitFor();
  await page
    .locator("textarea")
    .first()
    .fill("Browser smoke: immediate local autosave");
  assert.ok(
    await page.evaluate(() =>
      JSON.parse(
        localStorage.getItem("practo:prototype:v1"),
      ).state.journals.some((j) =>
        j.tasks.includes("Browser smoke: immediate local autosave"),
      ),
    ),
  );
  await page.reload();
  await page.getByRole("heading", { name: /Hello, Juan/ }).waitFor();
  assert.ok(
    await page.evaluate(() =>
      JSON.parse(
        localStorage.getItem("practo:prototype:v1"),
      ).state.journals.some((j) =>
        j.tasks.includes("Browser smoke: immediate local autosave"),
      ),
    ),
  );
  console.log("Journal autosave survived refresh");
  await page.getByRole("button", { name: "Toggle theme", exact: true }).click();
  await page.waitForTimeout(150);
  await page.screenshot({
    path: "docs/screenshots/student-dark.png",
    fullPage: true,
  });
  assert.ok(
    (await page.locator("html").getAttribute("class")).includes("dark"),
  );
  await page.getByRole("button", { name: "Clock in", exact: true }).click();
  await page.reload();
  await page
    .getByRole("button", { name: "Clock out", exact: true })
    .last()
    .waitFor();
  console.log("Clock persisted after reload");
  await page
    .getByRole("button", { name: "Clock out", exact: true })
    .last()
    .click();
  await page
    .getByRole("button", { name: "Practicum Weekly Journal", exact: false })
    .first()
    .click();
  await page
    .getByRole("heading", { name: "Practicum Weekly Journal", exact: true })
    .waitFor();
  await page.getByRole("button", { name: "More form actions" }).click();
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("menuitem", { name: "Export PDF" }).click();
  const download = await downloadPromise;
  assert.ok(download.suggestedFilename().endsWith(".pdf"));
  const bytes = require("node:fs").readFileSync(await download.path());
  assert.ok(bytes.length > 500 && bytes.subarray(0, 4).toString() === "%PDF");
  console.log("Actual form PDF downloaded:", download.suggestedFilename());
  await page.getByRole("button", { name: "Open profile menu" }).click();
  await page.getByRole("menuitem", { name: /Maria Santos/ }).click();
  await page.getByRole("heading", { name: /Hello, Maria/ }).waitFor();
  console.log("Supervisor dashboard");
  await page.getByRole("button", { name: "Open profile menu" }).click();
  await page.getByRole("menuitem", { name: /Patricia Lim/ }).click();
  await page.getByRole("heading", { name: /Hello,/ }).waitFor();
  console.log(
    "Coordinator greeting",
    await page.getByRole("heading", { name: /Hello,/ }).innerText(),
  );
  console.log("Coordinator dashboard");
  await page
    .getByRole("button", { name: "Forms", exact: true })
    .first()
    .click();
  await page
    .getByRole("heading", { name: "Forms & Reviews", exact: true })
    .waitFor();
  console.log("Coordinator forms");
  await page.getByRole("button", { name: "School Settings", exact: true }).click();
  await page.getByRole("heading", { name: "School Settings", exact: true }).waitFor();
  const preview = page.getByTestId("school-theme-preview");
  const previewAction = page.getByTestId("preview-primary");
  const save = page.getByRole("button", { name: "Save changes", exact: true });
  const bg = (locator) => locator.evaluate((el) => getComputedStyle(el).backgroundColor);
  const savedColor = await bg(save);
  await page.getByRole("button", { name: /Royal Navy/ }).click();
  await page.getByRole("button", { name: "Clay accent", exact: true }).click();
  assert.notEqual(await bg(previewAction), savedColor, "unsaved draft changes the preview");
  assert.equal(await bg(save), savedColor, "draft leaves saved application colors intact");
  await save.click();
  await page.mouse.move(0, 0);
  await page.waitForTimeout(220);
  assert.equal(await bg(previewAction), await bg(save), "saved dark action matches preview");
  assert.equal(await bg(page.getByTestId("preview-sidebar")), "rgb(23, 23, 23)");
  await page.locator("[data-sonner-toast]").first().waitFor({ state: "hidden", timeout: 10000 });
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(150);
  await page.screenshot({ path: "docs/screenshots/school-settings-dark.png", fullPage: true });
  await page.getByRole("button", { name: "Toggle theme", exact: true }).click();
  await page.waitForTimeout(150);
  assert.equal(await bg(page.locator("body")), "rgb(255, 255, 255)");
  assert.equal(await bg(page.getByTestId("preview-sidebar")), "rgb(255, 255, 255)");
  assert.equal(await bg(previewAction), await bg(save), "saved light action matches preview");
  const savedAccent = await bg(page.getByTestId("preview-accent"));
  await page.getByRole("button", { name: "Sage accent", exact: true }).click();
  assert.notEqual(await bg(page.getByTestId("preview-accent")), savedAccent);
  assert.equal(await bg(previewAction), await bg(save), "accent remains separate from the school palette");
  await page.getByRole("button", { name: "Discard changes", exact: true }).click();
  assert.equal(await bg(page.getByTestId("preview-accent")), savedAccent);
  await page.getByRole("button", { name: "Custom Pick your own colors" }).click();
  await page.getByRole("textbox", { name: "Primary hex", exact: true }).fill("#oops");
  await save.click();
  await page.getByText("Enter three valid hex colors, for example #003a70.", { exact: true }).waitFor();
  await page.getByRole("button", { name: "Discard changes", exact: true }).click();
  assert.equal(await page.getByText("Enter three valid hex colors, for example #003a70.", { exact: true }).count(), 0);
  await page.reload();
  await page.getByRole("heading", { name: /Hello,/ }).waitFor();
  await page.getByRole("button", { name: "School Settings", exact: true }).click();
  assert.equal(await page.getByRole("button", { name: /Royal Navy/ }).getAttribute("aria-pressed"), "true");
  assert.equal(await page.getByRole("button", { name: "Clay accent", exact: true }).getAttribute("aria-pressed"), "true");
  assert.equal(await bg(previewAction), await bg(save));
  await page.screenshot({ path: "docs/screenshots/school-settings-light.png", fullPage: true });
  assert.equal(await preview.count(), 1);
  console.log("Branding: preview/save/discard/validation/refresh and neutral surfaces in both modes passed");
  await page.getByRole("button", { name: "Dashboard", exact: true }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: "docs/screenshots/coordinator-mobile.png",
    fullPage: true,
  });
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  );
  await page.getByRole("button", { name: "Open navigation" }).click();
  await page.getByRole("dialog").waitFor();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: /^Students/ })
    .click();
  await page.getByRole("heading", { name: "Students", exact: true }).waitFor();
  console.log("Mobile drawer navigation pass");
  console.log("Mobile nav and width pass; browser errors:", errors);
  assert.equal(errors.length, 0);
  await browser.close();
  server.kill();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
