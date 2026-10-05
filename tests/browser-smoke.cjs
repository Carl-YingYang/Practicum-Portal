const { chromium } = require("playwright");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const { startServer } = require("./server-harness.cjs");
(async () => {
  const app = await startServer(3101),
    browser = await chromium.launch({ headless: true, args: ["--no-sandbox"] });
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
  });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  async function screenshot(name) {
    await page.screenshot({
      path: `docs/screenshots/${name}.png`,
      fullPage: true,
    });
  }
  async function snapshot() {
    return page.evaluate(
      async () => (await (await fetch("/api/portal")).json()).data,
    );
  }
  async function role(role) {
    await page.evaluate(async (role) => {
      const session = await (await fetch("/api/auth/session")).json();
      const actor = session.demoAccounts.find((u) => u.role === role);
      const response = await fetch("/api/auth/demo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: actor.id }),
      });
      if (!response.ok) throw new Error(await response.text());
    }, role);
    await page.reload();
    await page.getByRole("heading", { name: /Hello,/ }).waitFor();
  }
  async function noOverflow(label) {
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth + 1,
    );
    if (overflow) console.log(await page.evaluate(() => [...document.querySelectorAll("main *")].map(element => ({ tag: element.tagName, cls: element.className, right: element.getBoundingClientRect().right, left: element.getBoundingClientRect().left })).filter(element => element.right > innerWidth + 1 || element.left < -1).slice(0, 12)));
    assert.equal(overflow, false, `${label} has horizontal overflow`);
  }
  try {
    await page.goto(app.baseURL);
    await page.getByRole("heading", { name: "Welcome back." }).waitFor();
    for (const number of [1, 2, 3]) {
      await page
        .getByRole("button", { name: `Show login hero ${number}` })
        .click();
      assert.equal(
        await page
          .getByRole("button", { name: `Show login hero ${number}` })
          .getAttribute("aria-pressed"),
        "true",
      );
    }
    await screenshot("login-heroes");
    await page.getByRole("button", { name: "Explore the prototype" }).click();
    await page
      .getByRole("button", { name: /Student Sample Student 1/ })
      .click();
    await page.getByRole("heading", { name: /Hello,/ }).waitFor();
    await screenshot("student-light");
    await page
      .getByRole("button", { name: "Write a journal", exact: true })
      .click();
    await page
      .getByRole("heading", { name: "Drafting Room", exact: true })
      .waitFor();
    assert.ok(Number(await page.getByLabel("Rendered hours").inputValue()) > 0);
    assert.equal(
      await page.getByLabel("Rendered hours").getAttribute("readonly"),
      "",
    );
    await page
      .getByLabel("Tasks Performed")
      .fill("Browser verification: shared journal persistence");
    await page
      .getByLabel("Learnings & Reflections")
      .fill("Hours are filled from completed attendance.");
    await page.getByRole("button", { name: "Save Draft", exact: true }).click();
    await page.getByText("Draft saved to server", { exact: true }).waitFor();
    const saved = (await snapshot()).journals.find((j) =>
      j.tasks.includes("Browser verification"),
    );
    assert.ok(saved);
    const wordDownload = page.waitForEvent("download");
    await page.getByRole("button", { name: "Download as Word" }).click();
    const word = await wordDownload;
    assert.ok(word.suggestedFilename().endsWith(".docx"));
    const wordBytes = fs.readFileSync(await word.path());
    assert.equal(wordBytes.subarray(0, 2).toString(), "PK");
    await screenshot("drafting-room");
    await page.reload();
    await page.getByRole("heading", { name: /Hello,/ }).waitFor();
    assert.ok((await snapshot()).journals.some((j) => j.id === saved.id));
    assert.equal(
      await page.evaluate(() => localStorage.getItem("practo:prototype:v1")),
      null,
    );
    console.log(
      "PASS journal autofill, shared persistence, real Word export and no browser domain storage",
    );
    await page
      .getByRole("button", { name: "Toggle theme", exact: true })
      .click();
    await page.waitForTimeout(100);
    assert.ok(
      (await page.locator("html").getAttribute("class")).includes("dark"),
    );
    await screenshot("student-dark");
    await page.getByRole("button", { name: "Clock in", exact: true }).click();
    await page.waitForFunction(async () => {
      const { data } = await (await fetch("/api/portal")).json();
      return data.timeLogs.some((t) => t.userId === "s1" && !t.clockOutAt);
    });
    await page.reload();
    await page
      .getByRole("button", { name: "Clock out", exact: true })
      .last()
      .waitFor();
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
    const pdfDownload = page.waitForEvent("download");
    await page.getByRole("menuitem", { name: "Export PDF" }).click();
    const pdf = await pdfDownload;
    assert.equal(
      fs
        .readFileSync(await pdf.path())
        .subarray(0, 4)
        .toString(),
      "%PDF",
    );
    console.log("PASS dark theme, attendance reload and lazy PDF export");
    await role("supervisor");
    await noOverflow("Supervisor dashboard");
    await role("coordinator");
    await page
      .getByRole("button", { name: "User Management", exact: true })
      .first()
      .click();
    await page
      .getByRole("heading", { name: "User Management", exact: true })
      .waitFor();
    await page
      .getByRole("button", { name: "Create supervisor account", exact: true })
      .click();
    await page
      .getByRole("heading", { name: "Add Supervisor", exact: true })
      .waitFor();
    await page
      .getByLabel("Full Name", { exact: false })
      .fill("Browser Test Supervisor");
    await page
      .getByLabel("Email", { exact: false })
      .fill("browser-supervisor@example.test");
    await page.getByLabel("Company", { exact: false }).fill("Sample Partner 1");
    await page.getByLabel("Job Title", { exact: false }).fill("Testing Lead");
    await page.getByRole("combobox").last().click();
    await page.getByRole("option", { name: "Engineering", exact: true }).click();
    await page.getByRole("button", { name: /Create Supervisor/i }).click();
    await page.getByRole("dialog").waitFor();
    assert.ok(
      (await snapshot()).supervisors.some(
        (s) => s.email === "browser-supervisor@example.test",
      ),
    );
    console.log(
      "PASS visible supervisor creation and persisted account provisioning",
    );
    await page.keyboard.press("Escape");
    await page
      .getByRole("button", { name: "School Settings", exact: true })
      .click();
    await page
      .getByRole("heading", { name: "School Settings", exact: true })
      .waitFor();
    await page
      .getByLabel("Frequency", { exact: true })
      .selectOption("twice-weekly");
    await page.getByRole("button", { name: /Royal Navy/ }).click();
    await page
      .getByRole("button", { name: "Save changes", exact: true })
      .click();
    await page.getByText("School identity saved", { exact: true }).waitFor();
    assert.equal(
      (await snapshot()).schoolIdentity.journalCadence,
      "twice-weekly",
    );
    await screenshot("secondary-color-preview");
    await role("student");
    await page.setViewportSize({ width: 360, height: 800 });
    await noOverflow("Mobile dashboard");
    await screenshot("student-mobile");
    await page
      .getByRole("button", { name: "Write a journal", exact: true })
      .click();
    await page
      .getByRole("heading", { name: "Drafting Room", exact: true })
      .waitFor();
    await noOverflow("Mobile drafting room");
    await screenshot("journal-mobile");
    await page
      .getByRole("button", { name: "My Journals", exact: true })
      .click();
    await page.getByRole("dialog").waitFor();
    await page.keyboard.press("Escape");
    await page
      .getByRole("button", { name: "Open navigation", exact: true })
      .click();
    await page.getByRole("dialog").waitFor();
    await page.keyboard.press("Escape");
    await role("coordinator");
    await page
      .getByRole("button", { name: "Open navigation", exact: true })
      .click();
    await page
      .getByRole("button", { name: "User Management", exact: true })
      .last()
      .click();
    await page
      .getByRole("heading", { name: "User Management", exact: true })
      .waitFor();
    await noOverflow("Mobile user management");
    await screenshot("coordinator-users-mobile");
    assert.deepEqual(errors, []);
    console.log(
      "PASS all three roles, shared schedule/color settings, 360px layout, accessible drawers and no browser errors",
    );
  } finally {
    await browser.close();
    await app.stop();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
