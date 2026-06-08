import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";

const root = process.env.CARD_EVENT_ROOT ?? process.cwd();
const bundleRoot = join(root, ".open-next", "server-functions", "default");
const sourceWasm = join(bundleRoot, "src", "generated", "prisma", "internal", "query_compiler_fast_bg.wasm");
const handlerPath = join(bundleRoot, "handler.mjs");
const metadataPath = join(bundleRoot, "handler.mjs.meta.json");

if (!existsSync(bundleRoot)) {
  throw new Error("OpenNext server function bundle is missing. Run opennextjs-cloudflare build first.");
}

if (!existsSync(sourceWasm)) {
  console.log("Prisma source WASM not found; skipping dedupe.");
  process.exit(0);
}

const chunkWasm = findChunkWasm(bundleRoot);

if (!chunkWasm) {
  throw new Error("Prisma Turbopack WASM chunk is missing; cannot dedupe Cloudflare bundle.");
}

let replacementCount = 0;

for (const filePath of [handlerPath, metadataPath]) {
  if (!existsSync(filePath)) {
    continue;
  }

  const original = readFileSync(filePath, "utf8");
  const updated = original.split(sourceWasm).join(chunkWasm);

  if (updated !== original) {
    replacementCount += original.split(sourceWasm).length - 1;
    writeFileSync(filePath, updated);
  }
}

console.log(
  `Prisma WASM dedupe complete: ${replacementCount} reference(s) now use ${relative(root, chunkWasm)}.`,
);

function findChunkWasm(rootDir) {
  const chunksDir = join(rootDir, ".next", "server", "chunks");
  const wasmFilePattern = /^src_generated_prisma_internal_query_compiler_fast_bg_.*\.wasm$/;

  if (!existsSync(chunksDir)) {
    return null;
  }

  const directMatch = readdirSync(chunksDir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && wasmFilePattern.test(entry.name))
    .map((entry) => join(chunksDir, entry.name))
    .sort()[0];

  if (directMatch) {
    return directMatch;
  }

  return findRecursive(chunksDir, wasmFilePattern).sort()[0] ?? null;
}

function findRecursive(rootDir, filePattern) {
  const matches = [];
  const stack = [rootDir];

  while (stack.length > 0) {
    const current = stack.pop();

    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const entryPath = join(current, entry.name);

      if (entry.isDirectory()) {
        stack.push(entryPath);
      } else if (entry.isFile() && filePattern.test(entry.name)) {
        matches.push(entryPath);
      }
    }
  }

  return matches;
}
