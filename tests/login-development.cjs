const assert = require("node:assert/strict");
const { startServer } = require("./server-harness.cjs");
(async () => {
  for (const enabled of ["", "false"]) {
    const app = await startServer(
      3112,
      {
        APP_ENV: "",
        ENABLE_DEMO_LOGIN: enabled,
        NODE_ENV: "development",
      },
      "dev",
    );
    try {
      const session = await (
        await fetch(app.baseURL + "/api/auth/session")
      ).json();
      assert.equal(
        session.testMode,
        false,
        "local demo access must not enable destructive reset",
      );
      assert.equal(session.demoAccounts.length > 0, enabled !== "false");
      for (const role of ["student", "supervisor", "coordinator"]) {
        const user = session.demoAccounts.find(
          (account) => account.role === role,
        );
        const response = await fetch(app.baseURL + "/api/auth/demo", {
          method: "POST",
          headers: { Origin: app.baseURL, "Content-Type": "application/json" },
          body: JSON.stringify({ userId: user?.id ?? "u-student" }),
        });
        assert.equal(response.status, enabled === "false" ? 404 : 200);
        if (response.ok) {
          const signedIn = await (
            await fetch(app.baseURL + "/api/auth/session", {
              headers: {
                Cookie: response.headers.get("set-cookie").split(";")[0],
              },
            })
          ).json();
          assert.equal(signedIn.currentUser.role, role);
        }
      }
      const reset = await fetch(app.baseURL + "/api/test/reset", {
        method: "POST",
        headers: { Origin: app.baseURL, "Content-Type": "application/json" },
        body: "{}",
      });
      assert.equal(reset.status, 404);
      console.log(
        enabled === "false"
          ? "PASS explicit local demo opt-out"
          : "PASS all three local testing accounts with older environment setup; reset stays disabled",
      );
    } finally {
      await app.stop();
    }
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
