const assert = require("node:assert/strict");
const { chromium } = require("playwright");
const { startServer } = require("./server-harness.cjs");
(async () => {
  const browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox"],
  });
  const app = await startServer(3120);
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
  });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const snapshot = () =>
    page.evaluate(async () => (await (await fetch("/api/portal")).json()).data);
  async function waitForData(predicate) {
    const deadline = Date.now() + 10000;
    while (Date.now() < deadline) {
      const data = await snapshot();
      if (predicate(data)) return data;
      await page.waitForTimeout(100);
    }
    throw new Error("Timed out waiting for the saved server state.");
  }
  async function login(role, index = 1) {
    await page.evaluate(
      async ({ role, index }) => {
        const accounts = (await (await fetch("/api/auth/session")).json())
          .demoAccounts;
        const user = accounts.find(
          (u) => u.email === `${role}${index}@example.test`,
        );
        const response = await fetch("/api/auth/demo", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: user.id }),
        });
        if (!response.ok) throw new Error(await response.text());
      },
      { role, index },
    );
    await page.reload();
    await page.getByRole("heading", { name: /Hello,/ }).waitFor();
  }
  async function drafting() {
    await page
      .getByRole("button", { name: "Write a journal", exact: true })
      .click();
    await page
      .getByRole("heading", { name: "Drafting Room", exact: true })
      .waitFor();
  }
  async function assistant() {
    await page
      .getByRole("button", { name: "Writing Assistant", exact: true })
      .click();
    await page.getByRole("dialog").waitFor();
    await page
      .getByText("Preferences saved to your account", { exact: true })
      .waitFor();
  }
  async function noOverflow(label) {
    // Chromium updates dynamic viewport units on the next rendered frame.
    await page.evaluate(
      () =>
        new Promise((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(resolve)),
        ),
    );
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth + 1,
      ),
      false,
      label,
    );
    const dialog = page.getByRole("dialog");
    if (await dialog.count()) {
      // A drawer intentionally enters from outside the viewport. Check its
      // usable layout after that entrance, including any resize transition.
      await dialog.evaluate(async (element) => {
        await Promise.all(
          element
            .getAnimations()
            .map((animation) => animation.finished.catch(() => {})),
        );
      });
      const bounds = await dialog.boundingBox();
      if (
        bounds.y < -1 ||
        bounds.y + bounds.height > page.viewportSize().height + 1
      ) {
        console.log(
          "Dialog bounds",
          label,
          bounds,
          await dialog.evaluate((element) => ({
            maxHeight: getComputedStyle(element).maxHeight,
            maxWidth: getComputedStyle(element).maxWidth,
            top: getComputedStyle(element).top,
            innerHeight,
            innerWidth,
            viewportHeight: visualViewport.height,
          })),
        );
        await page.screenshot({ path: "/tmp/practo-dialog-failure.png" });
      }
      assert.ok(
        bounds.x >= -1 &&
          bounds.x + bounds.width <= page.viewportSize().width + 1,
        `${label}: dialog width`,
      );
      assert.ok(
        bounds.y >= -1 &&
          bounds.y + bounds.height <= page.viewportSize().height + 1,
        `${label}: dialog height`,
      );
    }
  }
  async function shot(name) {
    await page.screenshot({
      path: `docs/screenshots/${name}.png`,
      fullPage: false,
    });
  }
  try {
    await page.goto(app.baseURL);
    await page.getByRole("heading", { name: "Welcome back." }).waitFor();
    assert.equal(
      await page
        .locator("img[data-login-hero]")
        .first()
        .evaluate((image) => getComputedStyle(image).objectFit),
      "cover",
    );
    const hero = await page
      .locator("img[data-login-hero]")
      .first()
      .boundingBox();
    const about = await page
      .getByRole("region", { name: "About Practo" })
      .boundingBox();
    assert.ok(Math.abs(hero.width - about.width) < 1);
    await shot("login-contained-hero");
    await page
      .getByRole("button", { name: "Try student account", exact: true })
      .click();
    await page.getByRole("heading", { name: /Hello,/ }).waitFor();
    await drafting();
    const tasks = page.getByLabel("Tasks Performed", { exact: true });
    const learnings = page.getByLabel("Learnings & Reflections", {
      exact: true,
    });
    const original = "i  tested the login";
    await tasks.fill(original);
    await learnings.fill("I learned to compare expected and actual results.");
    const originalHours = await page.getByLabel("Rendered hours").inputValue();
    await assistant();
    await page
      .getByRole("button", { name: "Make it formal", exact: true })
      .click();
    await page.getByRole("region", { name: "Suggestion preview" }).waitFor();
    assert.equal(
      await tasks.inputValue(),
      original,
      "preview must not mutate the journal",
    );
    await page
      .getByRole("button", { name: "Replace section", exact: true })
      .click();
    assert.ok(
      (await tasks.inputValue()).includes("During this reporting period"),
    );
    await page.keyboard.press("Escape");
    await page
      .getByRole("button", { name: "Undo suggestion", exact: true })
      .click();
    assert.equal(await tasks.inputValue(), original);
    // Selection replacement retains the untouched suffix.
    await tasks.focus();
    await page.keyboard.press("Control+Home");
    await page.keyboard.press("Shift+ArrowRight");
    await assistant();
    await page
      .getByRole("button", { name: "Fix grammar", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Replace selected text", exact: true })
      .waitFor();
    await page
      .getByRole("button", { name: "Replace selected text", exact: true })
      .click();
    assert.equal(await tasks.inputValue(), "I  tested the login");
    await page.getByLabel("Writing language").selectOption("taglish");
    await page.getByLabel("Response detail").selectOption("detailed");
    await page
      .getByRole("button", { name: "Save preferences", exact: true })
      .click();
    await page
      .getByText("Preferences saved to your account", { exact: true })
      .waitFor();
    await page
      .getByLabel("Journal section", { exact: true })
      .selectOption("learnings");
    await page.getByLabel("Simulate demo error").check();
    await page
      .getByRole("button", { name: "Help with reflection", exact: true })
      .click();
    await page.getByText(/Demo error: the sample could not load/).waitFor();
    await page
      .getByRole("button", { name: "Retry sample", exact: true })
      .click();
    await page.getByRole("region", { name: "Suggestion preview" }).waitFor();
    assert.ok(await page.getByText(/Actual outcome:/).isVisible());
    await page.waitForFunction(
      () => document.querySelectorAll("[data-sonner-toast]").length === 0,
    );
    await shot("writing-assistant-desktop");
    await page
      .getByRole("button", { name: "Insert suggestion", exact: true })
      .click();
    await page.keyboard.press("Escape");
    assert.ok((await learnings.inputValue()).includes("[Ilagay"));
    assert.equal(
      await page.getByLabel("Rendered hours").inputValue(),
      originalHours,
    );
    console.log(
      "PASS demo previews/manual apply, selection preservation, undo, reflection placeholders, error/retry and unchanged hours",
    );

    // Slow save: a newer edit must survive the completion of the first request.
    let release, began;
    const started = new Promise((resolve) => {
      began = resolve;
    });
    const released = new Promise((resolve) => {
      release = resolve;
    });
    let held = false;
    await page.route("**/api/portal", async (route) => {
      if (route.request().method() === "POST" && !held) {
        held = true;
        began();
        await released;
      }
      await route.continue();
    });
    await tasks.fill("Workflow draft: first edit");
    await started;
    await tasks.fill("Workflow draft: latest edit survives a slow save");
    release();
    await waitForData((data) =>
      data.journals.some(
        (j) => j.tasks === "Workflow draft: latest edit survives a slow save",
      ),
    );
    await page.unroute("**/api/portal");
    let draft = (await snapshot()).journals.find((j) =>
      j.tasks.startsWith("Workflow draft:"),
    );
    if (!draft)
      console.log(
        "Draft diagnostic",
        (await snapshot()).journals.map((j) => ({
          id: j.id,
          tasks: j.tasks,
          status: j.status,
        })),
      );
    assert.ok(draft);
    // Failed save: navigation stays in the editor, then an explicit retry succeeds.
    await page.route("**/api/portal", async (route) =>
      route.request().method() === "POST"
        ? route.fulfill({
            status: 503,
            contentType: "application/json",
            body: JSON.stringify({ error: "Simulated save failure" }),
          })
        : route.continue(),
    );
    await tasks.fill("Workflow draft: keep my unsaved text");
    await page
      .getByRole("button", { name: "My Journals", exact: true })
      .first()
      .count();
    await page
      .getByRole("button", { name: "Journals", exact: true })
      .first()
      .click();
    await page
      .getByRole("button", { name: "Retry saving", exact: true })
      .waitFor();
    assert.equal(
      await tasks.inputValue(),
      "Workflow draft: keep my unsaved text",
    );
    assert.ok(
      await page
        .getByRole("heading", { name: "Drafting Room", exact: true })
        .isVisible(),
    );
    await page.unroute("**/api/portal");
    await page
      .getByRole("button", { name: "Retry saving", exact: true })
      .click();
    await page.getByText("Draft saved to server", { exact: true }).waitFor();
    await tasks.fill("Workflow draft: save before sidebar navigation");
    await page
      .getByRole("button", { name: "Journals", exact: true })
      .first()
      .click();
    await page.getByRole("region", { name: "Hours breakdown" }).waitFor();
    draft = (await snapshot()).journals.find((j) => j.id === draft.id);
    assert.equal(draft.tasks, "Workflow draft: save before sidebar navigation");
    await page
      .getByRole("button", { name: "Continue editing", exact: true })
      .click();
    await page
      .getByRole("heading", { name: "Edit Journal", exact: true })
      .waitFor();
    assert.equal(await tasks.inputValue(), draft.tasks);
    await learnings.fill(
      "Workflow reflection: compared the actual test results.",
    );
    await page
      .getByRole("button", { name: "Submit for Approval", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Submit for approval", exact: true })
      .last()
      .click();
    await page.getByRole("region", { name: "Hours breakdown" }).waitFor();
    draft = (await snapshot()).journals.find((j) => j.id === draft.id);
    assert.equal(draft.status, "pending");
    const recorded = (await snapshot()).students[0].loggedHours;
    console.log(
      "PASS slow-save edits, failed-save navigation guard, explicit retry and saved-draft recovery",
    );

    await login("supervisor");
    await page
      .getByRole("button", { name: "Review journals", exact: true })
      .click();
    const row = page.getByRole("row").filter({ hasText: "Sample Student 1" });
    await row.getByRole("button", { name: /Review/ }).click();
    await page
      .getByRole("heading", { name: "Review Journal", exact: true })
      .waitFor();
    await page
      .getByRole("button", { name: "Request revision…", exact: true })
      .click();
    await page
      .getByLabel("Reason", { exact: false })
      .fill("Please include the actual test outcome.");
    await page
      .getByRole("button", { name: "Request revision", exact: true })
      .click();
    await page
      .getByRole("heading", { name: "Journal Approvals", exact: true })
      .waitFor();
    await login("student");
    await page.getByRole("button", { name: /Revise your journal/ }).click();
    await page
      .getByRole("heading", { name: "Edit Journal", exact: true })
      .waitFor();
    assert.ok(
      await page
        .getByText(
          "Revision requested: Please include the actual test outcome.",
        )
        .isVisible(),
    );
    await learnings.fill(
      "Workflow reflection: the login matched expected results and I documented the outcome.",
    );
    await page
      .getByRole("button", { name: "Submit for Approval", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Submit for approval", exact: true })
      .last()
      .click();
    await page.getByRole("region", { name: "Hours breakdown" }).waitFor();
    await login("supervisor");
    await page
      .getByRole("button", { name: "Review journals", exact: true })
      .click();
    await page
      .getByRole("row")
      .filter({ hasText: "Sample Student 1" })
      .getByRole("button", { name: /Review/ })
      .click();
    await page.getByRole("button", { name: "Approve", exact: true }).click();
    assert.ok(
      await page.getByText(/Attendance totals remain unchanged/).isVisible(),
    );
    await page
      .getByRole("button", { name: "Approve Journal", exact: true })
      .click();
    await page
      .getByRole("heading", { name: "Journal Approvals", exact: true })
      .waitFor();
    await login("coordinator");
    const all = await snapshot();
    assert.equal(
      all.journals.find((j) => j.id === draft.id).status,
      "approved",
    );
    assert.equal(
      all.students.find((s) => s.id === draft.studentId).loggedHours,
      recorded,
    );
    console.log(
      "PASS student submission, supervisor revision/resubmission/approval, coordinator visibility and unchanged attendance totals",
    );

    // The screenshot's modal header must reserve a full close target.
    await page
      .getByRole("button", { name: "Forms", exact: true })
      .first()
      .click();
    await page
      .getByRole("button", { name: /New form|Create form/i })
      .first()
      .click();
    await page
      .getByRole("heading", { name: "Create a new form", exact: true })
      .waitFor();
    for (const width of [1440, 360, 320]) {
      await page.setViewportSize({
        width,
        height: width === 1440 ? 1000 : 640,
      });
      await noOverflow(`Form wizard at ${width}`);
      const close = await page
        .getByRole("dialog")
        .getByRole("button", { name: "Close", exact: true })
        .boundingBox();
      const step = await page
        .getByText("Step 1 of 3", { exact: true })
        .boundingBox();
      assert.ok(close.width >= 44 && close.height >= 44);
      assert.ok(
        step.x + step.width <= close.x,
        "step label must not overlap close control",
      );
    }
    await shot("form-wizard-mobile");
    await page.keyboard.press("Escape");
    await page.setViewportSize({ width: 1440, height: 1000 });
    await login("student");
    await drafting();
    await tasks.fill("Responsive journal: tested the interface.");
    await learnings.fill("Checked the actual layout on a small screen.");
    await assistant();
    assert.equal(
      await page.getByLabel("Writing language").inputValue(),
      "taglish",
    );
    assert.equal(
      await page.getByLabel("Response detail").inputValue(),
      "detailed",
    );
    await page.keyboard.press("Escape");
    for (const theme of ["light", "dark"]) {
      await page.evaluate((theme) => {
        localStorage.setItem("theme", theme);
        document.documentElement.classList.toggle("dark", theme === "dark");
      }, theme);
      for (const width of [320, 360, 390, 768]) {
        await page.setViewportSize({ width, height: 640 });
        await noOverflow(`Draft ${theme} ${width}`);
        await assistant();
        await noOverflow(`Assistant ${theme} ${width}`);
        await page
          .getByRole("button", { name: "Help with reflection", exact: true })
          .click();
        await page
          .getByRole("region", { name: "Suggestion preview" })
          .waitFor();
        await noOverflow(`Preview ${theme} ${width}`);
        if (width === 360) {
          await shot(`writing-assistant-mobile-${theme}`);
          await page
            .getByRole("button", { name: "Insert suggestion", exact: true })
            .scrollIntoViewIfNeeded();
          assert.ok(
            await page
              .getByRole("button", { name: "Insert suggestion", exact: true })
              .isVisible(),
          );
          await shot(`writing-assistant-preview-mobile-${theme}`);
        }
        await page.keyboard.press("Escape");
      }
    }
    await page.setViewportSize({ width: 360, height: 640 });
    await page
      .getByRole("button", { name: "Open profile menu", exact: true })
      .click();
    await page
      .getByRole("menuitem", { name: "Testing scenarios", exact: true })
      .click();
    await page
      .getByRole("heading", { name: "Testing scenarios", exact: true })
      .waitFor();
    await noOverflow("Testing scenario picker mobile");
    await shot("testing-scenarios-mobile");
    await page.getByRole("button", { name: /New student/ }).click();
    await page.getByRole("heading", { name: /Hello,/ }).waitFor();
    assert.equal((await snapshot()).students[0].loggedHours, 0);
    await drafting();
    assert.equal(await page.getByLabel("Rendered hours").inputValue(), "0");
    await assistant();
    assert.equal(
      await page.getByLabel("Writing language").inputValue(),
      "english",
      "preferences must not leak between accounts",
    );
    await page.keyboard.press("Escape");
    assert.deepEqual(errors, []);
    console.log(
      "PASS full-width half-screen hero, non-overlapping 44px modal close, responsive demo drawer in both themes, durable isolated preferences and testing scenario switches",
    );
  } finally {
    await browser.close();
    await app.stop();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
