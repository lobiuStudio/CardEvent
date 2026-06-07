import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "@prisma/client";
import { resolveSqliteUrl } from "./database-provider";

export type PrismaClientInstance = PrismaClient;

function getSqliteUrl(): string {
  return resolveSqliteUrl(process.env.DATABASE_URL || "file:./dev.db");
}

export function getPrismaCacheKey(): string {
  return `sqlite:${getSqliteUrl()}`;
}

export function createPrismaClient(): PrismaClientInstance {
  const adapter = new PrismaBetterSqlite3({
    url: getSqliteUrl(),
  });

  return new PrismaClient({ adapter }) as PrismaClientInstance;
}
