const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
require("@next/env").loadEnvConfig(process.cwd());
const url = process.env.DATABASE_URL;
if (!url?.startsWith("file:"))
  throw new Error(
    "This prototype uses SQLite. Set DATABASE_URL to a file: URL.",
  );
const databasePath = path.resolve("prisma", url.slice(5));
fs.mkdirSync(path.dirname(databasePath), { recursive: true });
if (!fs.existsSync(databasePath))
  fs.closeSync(fs.openSync(databasePath, "a", 0o600));
const result = spawnSync(
  process.execPath,
  ["node_modules/prisma/build/index.js", "migrate", "deploy"],
  { stdio: "inherit", env: process.env },
);
if (result.status !== 0) process.exit(result.status || 1);
require("./seed.cjs");
