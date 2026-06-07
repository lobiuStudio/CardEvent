import { createPrismaClient, getPrismaCacheKey, type PrismaClientInstance } from "@/lib/db/prisma-runtime";

type CachedPrismaClient = {
  key: string;
  client: PrismaClientInstance;
};

const globalForPrisma = globalThis as unknown as {
  prisma: CachedPrismaClient | undefined;
};

export function getPrisma(): PrismaClientInstance {
  const key = getPrismaCacheKey();

  if (!globalForPrisma.prisma || globalForPrisma.prisma.key !== key) {
    globalForPrisma.prisma = {
      key,
      client: createPrismaClient(),
    };
  }

  return globalForPrisma.prisma.client;
}

export const prisma = new Proxy({} as PrismaClientInstance, {
  get(_target, prop, receiver) {
    const client = getPrisma();
    const value = Reflect.get(client, prop, receiver);

    return typeof value === "function" ? value.bind(client) : value;
  },
});
