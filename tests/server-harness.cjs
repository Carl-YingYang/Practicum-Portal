const { spawn, spawnSync } = require("node:child_process");
const { mkdtempSync, rmSync, writeFileSync } = require("node:fs");
const { tmpdir } = require("node:os");
const { join } = require("node:path");
async function startServer(port = 3102, extraEnv = {}, command = "start") {
  const folder = mkdtempSync(join(tmpdir(), "practo-test-"));
  const env = {
    ...process.env,
    DATABASE_URL: `file:${join(folder, "portal.db")}`,
    APP_ENV: "testing",
    ENABLE_DEMO_LOGIN: "true",
    COOKIE_SECURE: "false",
    ...extraEnv,
  };
  Object.assign(process.env, env);
  writeFileSync(join(folder, "portal.db"), "");
  const migration = spawnSync(
    "node",
    ["node_modules/prisma/build/index.js", "migrate", "deploy"],
    { env, encoding: "utf8" },
  );
  if (migration.status !== 0)
    throw new Error(migration.stderr + migration.stdout);
  const { load } = require("./load-ts.cjs");
  const credentials = await load("src/server/seed.ts").seedPortal();
  await load("src/server/database.ts").db.$disconnect();
  const server = spawn(
    "node",
    [
      "node_modules/next/dist/bin/next",
      command,
      ...(command === "dev" ? ["--webpack"] : []),
      "--hostname",
      "127.0.0.1",
      "--port",
      String(port),
    ],
    { env, stdio: ["ignore", "pipe", "pipe"] },
  );
  let output = "";
  server.stdout.on("data", (chunk) => {
    output += chunk;
  });
  server.stderr.on("data", (chunk) => {
    output += chunk;
  });
  const baseURL = `http://127.0.0.1:${port}`;
  for (let i = 0; i < 80; i++) {
    try {
      // Wait for this child, rather than accidentally using an older server
      // already occupying the requested port.
      if (
        output.includes("Ready in") &&
        (await fetch(baseURL + "/api/health")).ok
      )
        break;
    } catch {
      /* starting */
    }
    if (server.exitCode !== null) throw new Error(output);
    if (i === 79) throw new Error("Server did not start: " + output);
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  return {
    baseURL,
    credentials,
    env,
    async stop() {
      server.kill();
      await new Promise((resolve) => server.once("exit", resolve));
      rmSync(folder, { recursive: true, force: true });
    },
    serverOutput: () => output,
  };
}
module.exports = { startServer };
