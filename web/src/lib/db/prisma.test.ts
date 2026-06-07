// @vitest-environment node

import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const state = {
    cacheKey: "sqlite:file:./prisma/dev.db",
    clients: [] as Array<Record<string, unknown>>,
    createPrismaClient: vi.fn(() => {
      const client = {
        $disconnect: vi.fn(),
        user: { count: vi.fn() },
      };

      state.clients.push(client);

      return client;
    }),
    getPrismaCacheKey: vi.fn(() => state.cacheKey),
  };

  return {
    ...state,
    reset() {
      state.cacheKey = "sqlite:file:./prisma/dev.db";
      state.clients.length = 0;
      state.createPrismaClient.mockClear();
      state.getPrismaCacheKey.mockClear();
    },
    setCacheKey(cacheKey: string) {
      state.cacheKey = cacheKey;
    },
  };
});

vi.mock("@/lib/db/prisma-runtime", () => ({
  createPrismaClient: mocks.createPrismaClient,
  getPrismaCacheKey: mocks.getPrismaCacheKey,
}));

describe("Prisma singleton", () => {
  afterEach(() => {
    vi.resetModules();
    mocks.reset();
    delete (globalThis as { prisma?: unknown }).prisma;
  });

  it("does not create a Prisma client when the module is imported", async () => {
    await import("./prisma");

    expect(mocks.createPrismaClient).not.toHaveBeenCalled();
  });

  it("reuses the cached client for a stable cache key", async () => {
    const { getPrisma } = await import("./prisma");

    const firstClient = getPrisma();
    const secondClient = getPrisma();

    expect(secondClient).toBe(firstClient);
    expect(mocks.createPrismaClient).toHaveBeenCalledOnce();
  });

  it("replaces the cached client when the cache key changes", async () => {
    const { getPrisma } = await import("./prisma");

    const firstClient = getPrisma();
    mocks.setCacheKey("sqlite:file:./prisma/other.db");
    const secondClient = getPrisma();

    expect(secondClient).not.toBe(firstClient);
    expect(mocks.createPrismaClient).toHaveBeenCalledTimes(2);
  });

  it("reuses the cached client through proxy property access", async () => {
    const { prisma } = await import("./prisma");

    const firstDelegate = prisma.user;
    const secondDelegate = prisma.user;

    expect(secondDelegate).toBe(firstDelegate);
    expect(mocks.createPrismaClient).toHaveBeenCalledOnce();
  });
});
