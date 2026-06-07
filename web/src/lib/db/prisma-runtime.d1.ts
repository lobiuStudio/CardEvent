import { PrismaD1 } from "@prisma/adapter-d1";
import { getRequiredD1Database } from "@/lib/cloudflare/bindings";
import type { PrismaClient as NodePrismaClient } from "@prisma/client";
import { PrismaClient as CloudflarePrismaClient } from "../../generated/prisma/client";

export type PrismaClientInstance = NodePrismaClient;

export function getPrismaCacheKey(): string {
  return "d1";
}

export function createPrismaClient(): PrismaClientInstance {
  const adapter = new PrismaD1(getRequiredD1Database());

  return new CloudflarePrismaClient({ adapter }) as unknown as PrismaClientInstance;
}
