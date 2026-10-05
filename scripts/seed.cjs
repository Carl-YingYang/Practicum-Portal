const fs = require("node:fs");
const { load } = require("./load-ts.cjs");
// Next loads .env automatically; standalone database scripts need the same env.
require("@next/env").loadEnvConfig(process.cwd());
const { seedPortal } = load("src/server/seed.ts");
seedPortal(process.argv.includes("--reset"))
  .then(async (rows) => {
    if (rows.length) {
      fs.writeFileSync(
        ".seed-credentials.json",
        JSON.stringify(rows, null, 2),
        { mode: 0o600 },
      );
      console.log(
        `Seeded ${rows.length} fictional test accounts. Private credentials: .seed-credentials.json (git ignored).`,
      );
    } else console.log("Database already seeded; existing data preserved.");
    await load("src/server/database.ts").db.$disconnect();
  })
  .catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
