import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const scriptPath = fileURLToPath(new URL("./guard-cloudflare-deploy-env.mjs", import.meta.url));

function makeRoot() {
  return mkdtempSync(path.join(tmpdir(), "cardevent-cloudflare-guard-"));
}

function runGuard(root) {
  return spawnSync(process.execPath, [scriptPath], {
    env: { ...process.env, CLOUDFLARE_DEPLOY_ENV_ROOT: root },
    encoding: "utf8",
  });
}

test("passes for a clean directory", () => {
  const root = makeRoot();
  const result = runGuard(root);

  assert.equal(result.status, 0, result.stderr);
});

test("passes for .env.example", () => {
  const root = makeRoot();
  writeFileSync(path.join(root, ".env.example"), "");

  const result = runGuard(root);

  assert.equal(result.status, 0, result.stderr);
});

const blockedCases = [
  {
    name: "blocks .env",
    expectedPath: ".env",
    setup(root) {
      writeFileSync(path.join(root, ".env"), "");
    },
  },
  {
    name: "blocks .envrc",
    expectedPath: ".envrc",
    setup(root) {
      writeFileSync(path.join(root, ".envrc"), "");
    },
  },
  {
    name: "blocks root PEM files",
    expectedPath: "local.pem",
    setup(root) {
      writeFileSync(path.join(root, "local.pem"), "");
    },
  },
  {
    name: "blocks root uploads directory",
    expectedPath: "uploads/",
    setup(root) {
      mkdirSync(path.join(root, "uploads"));
    },
  },
  {
    name: "blocks Prisma SQLite database",
    expectedPath: "prisma/dev.db",
    setup(root) {
      mkdirSync(path.join(root, "prisma"));
      writeFileSync(path.join(root, "prisma", "dev.db"), "");
    },
  },
  {
    name: "blocks Prisma SQLite WAL",
    expectedPath: "prisma/dev.db-wal",
    setup(root) {
      mkdirSync(path.join(root, "prisma"));
      writeFileSync(path.join(root, "prisma", "dev.db-wal"), "");
    },
  },
  {
    name: "blocks Prisma SQLite journal",
    expectedPath: "prisma/dev.db-journal",
    setup(root) {
      mkdirSync(path.join(root, "prisma"));
      writeFileSync(path.join(root, "prisma", "dev.db-journal"), "");
    },
  },
  {
    name: "blocks Prisma SQLite SHM",
    expectedPath: "prisma/dev.db-shm",
    setup(root) {
      mkdirSync(path.join(root, "prisma"));
      writeFileSync(path.join(root, "prisma", "dev.db-shm"), "");
    },
  },
];

for (const { name, expectedPath, setup } of blockedCases) {
  test(name, () => {
    const root = makeRoot();
    setup(root);

    const result = runGuard(root);

    assert.equal(result.status, 1, result.stderr);
    assert.match(result.stderr, new RegExp(expectedPath.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  });
}
