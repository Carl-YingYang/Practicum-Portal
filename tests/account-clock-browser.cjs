const assert = require("node:assert/strict");
const { chromium } = require("playwright");
const { randomUUID } = require("node:crypto");
const { startServer } = require("./server-harness.cjs");
(async () => {
  const app = await startServer(3126);
  const browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox"],
  });
  const page = await browser.newPage({
    viewport: { width: 360, height: 740 },
    timezoneId: "Asia/Manila",
  });
  page.setDefaultTimeout(15000);
  const errors = [];
  page.on("pageerror", (err) => errors.push(err.message));
  async function login(role) {
    await page.evaluate(async (role) => {
      const session = await (await fetch("/api/auth/session")).json();
      const user = session.demoAccounts.find(
        (u) => u.email === `${role}1@example.test`,
      );
      const response = await fetch("/api/auth/demo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id }),
      });
      if (!response.ok) throw new Error(await response.text());
    }, role);
    await page.reload();
    await page.getByRole("heading", { name: /Hello,/ }).waitFor();
  }
  async function navigate(label, heading) {
    await page
      .getByRole("button", { name: "Open navigation", exact: true })
      .click();
    await page
      .getByRole("dialog")
      .getByRole("button", { name: new RegExp("^" + label + "(?: |$)") })
      .click();
    if (heading)
      await page.getByRole("heading", { name: heading, exact: true }).waitFor();
  }
  async function noOverflow(label) {
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
  }
  async function command(action, args) {
    return page.evaluate(
      async (body) => {
        const response = await fetch("/api/portal", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!response.ok) throw new Error(await response.text());
        return (await response.json()).data;
      },
      {
        action,
        args,
        ids: Array.from({ length: 8 }, randomUUID),
        requestId: randomUUID(),
      },
    );
  }
  try {
    let release;
    const hold = new Promise((resolve) => (release = resolve));
    await page.route("**/api/auth/session", async (route) => {
      await hold;
      await route.continue();
    });
    await page.goto(app.baseURL);
    const loader = page.getByRole("status", {
      name: "Loading workspace",
      exact: true,
    });
    await loader.waitFor();
    assert.equal(await loader.locator("img").count(), 0);
    assert.equal(await loader.getByText(/Practo/i).count(), 0);
    await page.screenshot({
      path: "docs/screenshots/account-loading-mobile.png",
    });
    release();
    await page
      .getByRole("heading", { name: "Welcome back.", exact: true })
      .waitFor();
    await page.unroute("**/api/auth/session");
    console.log("PASS restrained real bootstrap loader without brand/logo");
    for (const role of ["student", "supervisor", "coordinator"]) {
      await login(role);
      const header = page.locator("[data-workspace-header]");
      assert.equal(await header.locator('img[src*="logo"]').count(), 0);
      assert.equal(
        await header.getByText("Practo", { exact: true }).count(),
        0,
      );
      await page
        .getByRole("button", { name: "Open profile menu", exact: true })
        .click();
      await page
        .getByRole("menuitem", { name: "My profile", exact: true })
        .click();
      const credential = app.credentials.find(
        (c) => c.email === `${role}1@example.test`,
      );
      await page.getByLabel("Current password", { exact: true }).fill("wrong");
      await page
        .getByLabel("New password", { exact: true })
        .fill("PersonalPassword9");
      await page
        .getByLabel("Confirm new password", { exact: true })
        .fill("PersonalPassword9");
      await page
        .getByRole("button", { name: "Update password", exact: true })
        .click();
      await page
        .getByText("Your current password is incorrect.", { exact: true })
        .waitFor();
      assert.equal(
        await page.getByLabel("New password", { exact: true }).inputValue(),
        "PersonalPassword9",
      );
      await page
        .getByLabel("Current password", { exact: true })
        .fill(credential.password);
      let continueSave;
      const pending = new Promise((resolve) => (continueSave = resolve));
      await page.route("**/api/auth/password", async (route) => {
        await pending;
        await route.continue();
      });
      await page
        .getByRole("button", { name: "Update password", exact: true })
        .click();
      const saving = page.getByRole("button", {
        name: "Saving password…",
        exact: true,
      });
      await saving.waitFor();
      assert.equal(await saving.isDisabled(), true);
      continueSave();
      await page.getByText("Password updated", { exact: true }).waitFor();
      await page.unroute("**/api/auth/password");
      await page
        .getByRole("heading", { name: "Change password", exact: true })
        .waitFor();
      for (const width of [320, 360, 640]) {
        await page.setViewportSize({ width, height: 740 });
        await noOverflow(`${role} profile ${width}`);
      }
      await page.setViewportSize({ width: 360, height: 740 });
      if (role === "student")
        await page.screenshot({
          path: "docs/screenshots/account-password-mobile.png",
        });
    }
    console.log(
      "PASS all-role real password forms, errors retained, duplicate-submit lock, profile preservation and 320–640px layouts",
    );
    await login("student");
    await navigate("Time Clock", "Time Clock");
    let releaseClock;
    const holdClock = new Promise((resolve) => (releaseClock = resolve));
    await page.route("**/api/portal", async (route) => {
      if (
        route.request().method() === "POST" &&
        route.request().postDataJSON().action === "clockIn"
      ) {
        await holdClock;
      }
      await route.continue();
    });
    await page.getByRole("button", { name: "Clock In", exact: true }).click();
    const clockSaving = page.getByRole("button", {
      name: "Saving…",
      exact: true,
    });
    await clockSaving.waitFor();
    assert.equal(await clockSaving.isDisabled(), true);
    assert.equal(
      await page.getByText("Clocked in", { exact: true }).count(),
      0,
    );
    releaseClock();
    await page.getByText("Clocked in", { exact: true }).waitFor();
    await page.unroute("**/api/portal");
    // Disposable fixture: simulate returning to a saved clock-in after 13 hours.
    const { db } = require("./load-ts.cjs").load("src/server/database.ts");
    const school = await db.portalSchool.findUnique({ where: { id: "practo" } });
    const persisted = JSON.parse(school.stateJson);
    persisted.timeLogs.find(log => log.userId === "s1" && log.clockOutAt === null).clockInAt = new Date(Date.now() - 13 * 3600000).toISOString();
    await db.portalSchool.update({ where: { id: "practo" }, data: { stateJson: JSON.stringify(persisted), revision: { increment: 1 } } });
    await db.$disconnect();
    await page.reload(); await page.getByRole("heading", { name: /Hello,/ }).waitFor(); await navigate("Time Clock", "Time Clock");
    await page.getByText(/This session has been running for over 12 hours/).waitFor();
    await page.context().setOffline(true);
    await page.getByRole("button", { name: "Clock Out", exact: true }).click();
    await page.getByText("Changes were not saved", { exact: true }).waitFor();
    await page
      .getByRole("button", { name: "Clock Out", exact: true })
      .waitFor();
    assert.equal(
      await page.getByRole("button", { name: "Clock In", exact: true }).count(),
      0,
    );
    await page.context().setOffline(false);
    await page.getByRole("button", { name: "Reconnect", exact: true }).click();
    await page
      .getByText("Connected · changes saved", { exact: true })
      .waitFor();
    await page.getByRole("button", { name: "Clock Out", exact: true }).click();
    await page.getByText("Clocked out", { exact: true }).waitFor();
    console.log(
      "PASS delayed clock save, no premature success, offline clock-out rollback and reconnect",
    );
    const data = await command("addManualTimeLog", [
      {
        userId: "s1",
        role: "student",
        clockInAt: "2020-01-01T00:00:00Z",
        clockOutAt: "2020-01-01T08:00:00Z",
      },
    ]);
    const log = data.timeLogs.find(
      (t) => t.clockInAt === "2020-01-01T00:00:00.000Z",
    );
    await page.reload();
    await page.getByRole("heading", { name: /Hello,/ }).waitFor();
    await navigate("Time Clock", "Time Clock");
    await page.getByLabel("Session", { exact: true }).selectOption(log.id);
    await page
      .getByLabel("Actual clock-out time", { exact: true })
      .fill("2020-01-01T14:00");
    await page
      .getByLabel("Reason for correction", { exact: true })
      .fill("Forgot to stop the clock when the work ended.");
    await page
      .getByRole("button", { name: "Request correction", exact: true })
      .click();
    await page.getByText("Correction request saved", { exact: true }).waitFor();
    await noOverflow("Student correction form");
    await page
      .getByRole("button", { name: "Toggle theme", exact: true })
      .click();
    await page
      .getByRole("heading", { name: "Clock-out corrections", exact: true })
      .scrollIntoViewIfNeeded();
    await page.screenshot({
      path: "docs/screenshots/account-correction-student-dark.png",
    });
    await login("supervisor");
    await navigate("My Interns", "My Interns");
    await page.getByText("Sample Student 1", { exact: true }).first().click();
    await page
      .getByRole("heading", { name: "Sample Student 1", exact: true })
      .waitFor();
    await page.getByRole("tab", { name: /^Time logs/i }).click();
    await page
      .getByRole("heading", {
        name: "Clock-out correction review",
        exact: true,
      })
      .waitFor();
    for (const width of [320, 360, 390, 640, 768]) {
      await page.setViewportSize({ width, height: 740 });
      await noOverflow(`Intern corrections ${width}`);
      for (const name of [
        /^Overview/,
        /^Journals/,
        /^Evaluations/,
        /^Time logs/i,
      ]) {
        await page.getByRole("tab", { name }).click();
        await noOverflow(`Intern tab ${name} ${width}`);
      }
    }
    await page.setViewportSize({ width: 360, height: 740 });
    await page
      .getByRole("button", { name: "Approve correction", exact: true })
      .click();
    await page.getByText("Correction approved", { exact: true }).waitFor();
    await page.getByText("approved", { exact: true }).waitFor();
    await page
      .getByRole("heading", {
        name: "Clock-out correction review",
        exact: true,
      })
      .scrollIntoViewIfNeeded();
    await page.screenshot({
      path: "docs/screenshots/account-correction-supervisor-mobile.png",
    });
    console.log(
      "PASS student request and assigned-supervisor approval through actual UI; intern tabs 320–768px",
    );
    await login("coordinator");
    await navigate("User Management", "User Management");
    await page
      .getByPlaceholder("Search name, email, ID…")
      .fill("student1@example.test");
    await page
      .locator("main")
      .getByRole("button", { name: "User actions", exact: true })
      .click();
    await page
      .getByRole("menuitem", { name: "Reset access…", exact: true })
      .click();
    await page
      .getByRole("heading", { name: "Reset account access?", exact: true })
      .waitFor();
    await page.getByRole("dialog").evaluate(async (dialog) => {
      await Promise.all(
        dialog.getAnimations({ subtree: true }).map((animation) =>
          animation.finished.catch(() => {}),
        ),
      );
    });
    const confirmBounds = await page.getByRole("dialog").boundingBox();
    assert(confirmBounds && confirmBounds.y >= 0);
    assert(confirmBounds.y + confirmBounds.height <= page.viewportSize().height + 1);
    await page.screenshot({
      path: "docs/screenshots/account-reset-confirmation-mobile.png",
    });
    let releaseReset;
    const holdReset = new Promise((resolve) => (releaseReset = resolve));
    let resetRequests = 0;
    await page.route("**/api/portal", async (route) => {
      if (
        route.request().method() === "POST" &&
        route.request().postDataJSON().action === "resetAccountCredentials"
      ) {
        resetRequests++;
        await holdReset;
      }
      await route.continue();
    });
    await page
      .getByRole("button", { name: "Reset access", exact: true })
      .click();
    const resetSaving = page.getByRole("button", {
      name: "Saving…",
      exact: true,
    });
    await resetSaving.waitFor();
    assert.equal(await resetSaving.isDisabled(), true);
    assert.equal(
      await page
        .getByRole("heading", {
          name: "Access reset — copy credentials",
          exact: true,
        })
        .count(),
      0,
    );
    releaseReset();
    await page
      .getByRole("heading", {
        name: "Access reset — copy credentials",
        exact: true,
      })
      .waitFor();
    assert.equal(resetRequests, 1);
    await page.unroute("**/api/portal");
    await noOverflow("Reset credentials mobile");
    await page.getByRole("button", { name: "Done", exact: true }).click();
    console.log(
      "PASS mobile account actions, confirmation pending lock and one-time credentials after server-confirmed reset",
    );
    assert.deepEqual(errors, []);
    console.log("All account/clock browser checks passed.");
  } finally {
    await browser.close();
    await app.stop();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
