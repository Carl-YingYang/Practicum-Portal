const assert = require("node:assert/strict");
const { chromium } = require("playwright");
const { startServer } = require("./server-harness.cjs");
(async () => {
  const app = await startServer(3139),
    browser = await chromium.launch({ headless: true, args: ["--no-sandbox"] }),
    page = await browser.newPage({
      viewport: { width: 320, height: 700 },
      timezoneId: "Asia/Manila",
    }),
    errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.setDefaultTimeout(25000);
  async function login(role) {
    await page.evaluate(async (role) => {
      const session = await (await fetch("/api/auth/session")).json(),
        u = session.demoAccounts.find(
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
    if (page.viewportSize().width < 1024) {
      await page
        .getByRole("button", { name: "Open navigation", exact: true })
        .click();
      await page
        .getByRole("dialog")
        .getByRole("button", {
          name: new RegExp("^" + label.replace("&", "&") + "(?: |$)"),
        })
        .click();
    } else
      await page
        .locator("aside")
        .getByRole("button", { name: new RegExp("^" + label + "(?: |$)") })
        .click();
  }
  async function api(url, method = "GET", data) {
    return page.evaluate(
      async ({ url, method, data }) => {
        const res = await fetch(url, {
          method,
          headers: data ? { "Content-Type": "application/json" } : undefined,
          body: data ? JSON.stringify(data) : undefined,
        });
        const body = await res.json();
        if (!res.ok) throw new Error(JSON.stringify(body));
        return body;
      },
      { url, method, data },
    );
  }
  async function overflow() {
    const result = await page.evaluate(() => ({
      w: innerWidth,
      scroll: document.documentElement.scrollWidth,
      offenders: [...document.querySelectorAll("main *")]
        .filter((e) => e.getBoundingClientRect().right > innerWidth + 1)
        .slice(0, 15)
        .map((e) => ({
          tag: e.tagName,
          text: e.textContent.slice(0, 70),
          class: e.className,
          right: e.getBoundingClientRect().right,
        })),
    }));
    assert.ok(result.scroll <= result.w + 1, JSON.stringify(result));
  }
  try {
    await page.goto(app.baseURL);
    await page.getByRole("heading", { name: "Welcome back." }).waitFor();
    await login("coordinator");
    await nav("Templates & Assignments");
    await page
      .getByRole("button", { name: "New template from pilot", exact: true })
      .click();
    await page
      .getByLabel("Template name", { exact: true })
      .fill("Browser Official Format");
    await page
      .getByRole("button", { name: "Add custom section", exact: true })
      .click();
    await page
      .getByLabel("Section title", { exact: true })
      .last()
      .fill("Custom student narrative");
    await page.getByRole("button", { name: "Save draft", exact: true }).click();
    await page.getByText("Draft saved.", { exact: true }).waitFor();
    await overflow();
    const list = await api("/api/templates"),
      id = list.templates[0].id,
      path = `/api/templates/${id}`;
    let t = await api(path);
    assert.equal(t.content.sections.at(-1).title, "Custom student narrative");
    await page
      .getByRole("button", { name: "← Templates", exact: true })
      .click();
    const custom = t.content.sections.at(-1);
    let config = {
      ...t.content,
      allowStudentExtras: true,
      sections: [
        t.content.sections.find((s) => s.key === "reflection"),
        custom,
        {
          key: "program",
          title: "Program evaluation",
          instructions: "Fill the linked program evaluation.",
          kind: "forms",
          required: true,
          respondent: "student",
          pageBreak: true,
          formIds: ["form-4"],
        },
        {key:"mentor_form",title:"Supervisor weekly form",instructions:"Complete for this intern.",kind:"forms",required:false,respondent:"supervisor",pageBreak:true,formIds:["form-1"]},
        {
          key: "mentor_note",
          title: "Mentor feedback",
          instructions: "Written by supervisor.",
          kind: "narrative",
          required: false,
          respondent: "supervisor",
          pageBreak: true,
          formIds: [],
        },
      ],
    };
    t = await api(path, "PUT", { revision: t.revision, content: config });
    await page
      .getByRole("button")
      .filter({
        has: page.getByRole("heading", {
          name: "Browser Official Format",
          exact: true,
        }),
      })
      .click();
    await page
      .getByRole("button", {
        name: "Sync Word sections",
        exact: true,
      })
      .click();
    await page
      .getByText(
        "Word section placeholders updated. Download and inspect the format before publishing.",
        { exact: true },
      )
      .waitFor();
    await page
      .getByRole("button", { name: "Publish new version", exact: true })
      .click();
    await page
      .getByText(
        "Published version 1. Existing assignments stay on their version.",
        { exact: true },
      )
      .waitFor();
    await page.getByLabel("Sample Student 1 ·", { exact: false }).check();
    await page
      .getByRole("button", { name: "Assign reports", exact: true })
      .click();
    await page
      .getByText(
        "1 report assignment(s) ready. Open Submission Reviews to inspect them.",
        { exact: true },
      )
      .waitFor();
    await overflow();
    await page.screenshot({
      path: "docs/screenshots/templates-mobile.png",
      fullPage: true,
    });
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.getByLabel("Template name", { exact: true }).waitFor();
    await overflow();
    await page.screenshot({
      path: "docs/screenshots/templates-desktop.png",
      fullPage: true,
    });
    await login("student");
    await nav("My Practicum Report");
    await page.getByRole("button", { name: /Browser Official Format/ }).click();
    await page
      .getByLabel("Section content", { exact: true })
      .fill("Student narrative from the browser, retained in Word.");
    await page.getByRole("button", { name: "Save now", exact: true }).click();
    assert.equal(
      await page.getByLabel("Report title", { exact: true }).isDisabled(),
      true,
    );
    assert.equal(
      await page.getByLabel("Section title", { exact: true }).isDisabled(),
      true,
    );
    await page.setViewportSize({ width: 320, height: 700 });
    await overflow();
    await page
      .getByLabel("Custom section title", { exact: true })
      .fill("My optional extra");
    await page
      .getByRole("button", { name: "Add section", exact: true })
      .click();
    await page
      .getByLabel("Section content", { exact: true })
      .fill("Optional answer remains separate from core format.");
    await page.getByRole("button", { name: "Save now", exact: true }).click();
    await page
      .getByRole("button", { name: "Preview report", exact: true })
      .click();
    await page
      .getByText("Optional answer remains separate from core format.", {
        exact: true,
      })
      .waitFor();
    await overflow();
    await page.screenshot({
      path: "docs/screenshots/assigned-report-mobile.png",
      fullPage: true,
    });
    await page
      .getByRole("button", { name: "Close report preview", exact: true })
      .click();
    await page
      .getByLabel("Current section", { exact: true })
      .selectOption({ label: "Sample Student 1 — Program evaluation" });
    await page
      .getByRole("button", { name: /^Open Practicum Program Evaluation/ })
      .click();
    await page
      .getByRole("heading", {
        name: "Practicum Program Evaluation",
        exact: true,
      })
      .first()
      .waitFor();
    assert.equal(
      await page
        .getByRole("button", { name: /Rate "1\. MARKET ONESELF EFFECTIVELY/ })
        .count(),
      0,
    );
    assert.equal(
      await page
        .getByRole("button", { name: /Rate "2\. WORK WITH OTHERS/ })
        .count(),
      0,
    );
    const ratings = page.getByRole("button", {
      name: /^Rate .* as Good \(3\)$/,
    });
    for (let i = 0; i < (await ratings.count()); i++)
      await ratings.nth(i).click();
    await page
      .getByLabel("Strengths of the program", { exact: true })
      .fill("Meaningful work and mentorship.");
    await page
      .getByLabel("Areas for improvement", { exact: true })
      .fill("Improve planning and documentation.");
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
    await overflow();
    await page.getByRole("dialog").waitFor({ state: "hidden" });
    const portal = await api("/api/portal"),
      sub = portal.data.formSubmissions.find(
        (s) => s.formId === "form-4" && s.userId === portal.currentUser.id,
      );
    assert.equal(sub.status, "submitted");
    assert.equal(sub.values.b7.o1a, "3");
    assert.equal(sub.values.b7.o1g, undefined);
    await login("supervisor");
    await nav("My Interns");
    await page
      .getByRole("button")
      .filter({ has: page.getByText("Sample Student 1", { exact: true }) })
      .click();
    await page
      .getByRole("button", { name: "Review practicum report", exact: true })
      .click();
    await page.getByRole("button", { name: /Browser Official Format/ }).click();
    await page
      .getByLabel("Current section", { exact: true })
      .selectOption({ label: "Sample Student 1 — Mentor feedback" });
    await page
      .getByLabel("Section content", { exact: true })
      .fill("Mentor feedback from the actual supervisor UI.");
    await page.getByRole("button", { name: "Save now", exact: true }).click();
    await overflow();
    await page.getByLabel("Current section", { exact: true }).selectOption({
      label: "Sample Student 1 — Reflection and Self-Assessment",
    });
    assert.equal(
      await page.getByLabel("Section content", { exact: true }).count(),
      0,
    );
    assert.equal(
      await page
        .getByRole("button", { name: "Build full Word report", exact: true })
        .count(),
      0,
    );
    await login("coordinator");
    const published=await api(path),school=await api("/api/portal"),targetIntern=school.data.students.find(s=>s.name==="Sample Student 5");
    await api(path,"POST",{action:"assign",versionId:published.versions[0].id,studentIds:[targetIntern.id],dueDate:null});
    await login("supervisor");await nav("My Interns");
    await page.getByRole("button").filter({has:page.getByText("Sample Student 5",{exact:true})}).click();await page.getByRole("button",{name:"Review practicum report",exact:true}).click();await page.getByRole("button",{name:/Browser Official Format/}).click();
    await page.getByLabel("Current section",{exact:true}).selectOption({label:"Sample Student 5 — Supervisor weekly form"});await page.getByRole("button",{name:/^Open Practicum Weekly Journal/}).click();
    await page.getByRole("heading",{name:"Select intern to evaluate",exact:true}).waitFor();
    assert.equal(await page.getByRole("button",{name:/Sample Student 5/}).getAttribute("aria-pressed"),"true");
    await page.waitForFunction(async(id)=>{const portal=await(await fetch("/api/portal")).json();return portal.data.formSubmissions.some(s=>s.formId==="form-1" && s.targetStudentId===id);},targetIntern.id);
    await overflow();
    assert.deepEqual(errors, []);
    console.log(
      "Template browser passed: professor custom sections/publish/assign, 320px/desktop layout, student read-only format/custom answers/preview, real numeric ratings without scored headings, linked submission, and supervisor-owned feedback. Zero page errors.",
    );
  } finally {
    await browser.close();
    await app.stop();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
