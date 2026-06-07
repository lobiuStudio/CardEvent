import { existsSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

const projectRoot = path.resolve(process.env.CLOUDFLARE_DEPLOY_ENV_ROOT ?? process.cwd());
const blockedPaths = [];

for (const fileName of readdirSync(projectRoot)) {
  const fullPath = path.join(projectRoot, fileName);
  const stat = statSync(fullPath);

  if (fileName.startsWith(".env") && fileName !== ".env.example") {
    blockedPaths.push(fileName);
    continue;
  }

  if (stat.isFile() && fileName.endsWith(".pem")) {
    blockedPaths.push(fileName);
    continue;
  }

  if (stat.isDirectory() && fileName === "uploads") {
    blockedPaths.push(`${fileName}/`);
  }
}

const prismaDir = path.join(projectRoot, "prisma");
if (existsSync(prismaDir)) {
  for (const fileName of readdirSync(prismaDir)) {
    if (/\.db(?:-(?:journal|wal|shm))?$/.test(fileName)) {
      blockedPaths.push(`prisma/${fileName}`);
    }
  }
}

blockedPaths.sort();

if (blockedPaths.length > 0) {
  console.error(
    `Refusing Cloudflare deploy/upload with local runtime artifact(s): ${blockedPaths.join(", ")}.`,
  );
  console.error(
    "OpenNext can trace ignored local files into the Worker bundle. Move local env files, SQLite databases, uploads, and private keys out of web/ before deploying, and configure production values in Cloudflare Pages bindings/secrets.",
  );
  process.exit(1);
}
