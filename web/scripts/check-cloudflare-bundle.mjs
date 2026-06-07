import { existsSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";

const bundleRoot = join(process.cwd(), ".open-next", "server-functions", "default");

if (!existsSync(bundleRoot)) {
  throw new Error("Cloudflare bundle is missing. Run npm run build:cloudflare before checking the bundle.");
}

const forbiddenDirectories = [
  join(bundleRoot, "node_modules", "better-sqlite3"),
  join(bundleRoot, "node_modules", "@prisma", "adapter-better-sqlite3"),
  join(bundleRoot, ".next", "node_modules", "better-sqlite3"),
  join(bundleRoot, ".next", "node_modules", "@prisma", "adapter-better-sqlite3"),
];

const forbiddenPaths = [
  ...forbiddenDirectories.filter(existsSync),
  ...findNativeBinaries(bundleRoot),
];

if (forbiddenPaths.length > 0) {
  const formatted = forbiddenPaths.map((path) => `- ${relative(process.cwd(), path)}`).join("\n");
  throw new Error(`Cloudflare bundle contains Node-only SQLite artifacts:\n${formatted}`);
}

console.log("Cloudflare bundle check passed.");

function findNativeBinaries(root) {
  const matches = [];
  const stack = [root];

  while (stack.length > 0) {
    const current = stack.pop();

    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const entryPath = join(current, entry.name);

      if (entry.isDirectory()) {
        stack.push(entryPath);
      } else if (entry.isFile() && entry.name.endsWith(".node")) {
        matches.push(entryPath);
      }
    }
  }

  return matches;
}
