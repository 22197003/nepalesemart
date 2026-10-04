import { spawnSync } from "node:child_process";
const url = process.env.TEST_DATABASE_URL;
if (!url)
  throw new Error(
    "Set TEST_DATABASE_URL to a separate migrated and seeded test database (never production).",
  );
const result = spawnSync(
  process.execPath,
  ["node_modules/vitest/vitest.mjs", "run"],
  {
    stdio: "inherit",
    env: { ...process.env, DATABASE_URL: url, DIRECT_URL: url },
  },
);
process.exit(result.status ?? 1);
