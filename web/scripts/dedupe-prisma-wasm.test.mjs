import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const scriptPath = fileURLToPath(new URL("./dedupe-prisma-wasm.mjs", import.meta.url));

function makeFixture() {
  const root = mkdtempSync(path.join(tmpdir(), "cardevent-prisma-wasm-"));
  const bundleRoot = path.join(root, ".open-next", "server-functions", "default");
  const chunkDir = path.join(bundleRoot, ".next", "server", "chunks");
  const sourceDir = path.join(bundleRoot, "src", "generated", "prisma", "internal");

  mkdirSync(chunkDir, { recursive: true });
  mkdirSync(sourceDir, { recursive: true });

  const chunkWasm = path.join(chunkDir, "src_generated_prisma_internal_query_compiler_fast_bg_0athij3.wasm");
  const sourceWasm = path.join(sourceDir, "query_compiler_fast_bg.wasm");
  const handlerPath = path.join(bundleRoot, "handler.mjs");
  const metaPath = path.join(bundleRoot, "handler.mjs.meta.json");

  writeFileSync(chunkWasm, "same wasm bytes");
  writeFileSync(sourceWasm, "same wasm bytes");
  writeFileSync(
    handlerPath,
    `case "${sourceWasm}":return(await import("${sourceWasm}")).default;case "${chunkWasm}":return(await import("${chunkWasm}")).default;`,
  );
  writeFileSync(
    metaPath,
    JSON.stringify({
      outputs: {
        "handler.mjs": {
          imports: [{ path: sourceWasm }, { path: chunkWasm }],
        },
      },
    }),
  );

  return { root, handlerPath, metaPath, sourceWasm, chunkWasm };
}

function runDedupe(root) {
  return spawnSync(process.execPath, [scriptPath], {
    env: { ...process.env, CARD_EVENT_ROOT: root },
    encoding: "utf8",
  });
}

test("aliases Prisma source WASM imports to the OpenNext chunk WASM", () => {
  const { root, handlerPath, metaPath, sourceWasm, chunkWasm } = makeFixture();

  const result = runDedupe(root);

  assert.equal(result.status, 0, result.stderr);
  assert.equal(readFileSync(handlerPath, "utf8").includes(sourceWasm), false);
  assert.equal(readFileSync(metaPath, "utf8").includes(sourceWasm), false);
  assert.match(readFileSync(handlerPath, "utf8"), new RegExp(chunkWasm.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.match(readFileSync(metaPath, "utf8"), new RegExp(chunkWasm.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
});
