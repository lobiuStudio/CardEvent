// @vitest-environment node

import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const state = {
    cloudflareClients: [] as Array<Record<string, unknown>>,
    d1Adapters: [] as Array<Record<string, unknown>>,
    getRequiredD1Database: vi.fn(),
  };

  return {
    ...state,
    reset() {
      state.cloudflareClients.length = 0;
      state.d1Adapters.length = 0;
      state.getRequiredD1Database.mockReset();
    },
  };
});

vi.mock("@prisma/adapter-d1", () => ({
  PrismaD1: vi.fn(function PrismaD1(this: Record<string, unknown>, db) {
    this.db = db;
    mocks.d1Adapters.push(this);
  }),
}));

vi.mock("@/lib/cloudflare/bindings", () => ({
  getRequiredD1Database: mocks.getRequiredD1Database,
}));

vi.mock("../../generated/prisma/client", () => ({
  PrismaClient: vi.fn(function PrismaClient(this: Record<string, unknown>, options) {
    this.options = options;
    mocks.cloudflareClients.push(this);
  }),
}));

describe("D1 Prisma runtime", () => {
  afterEach(() => {
    vi.resetModules();
    mocks.reset();
  });

  it("uses the DB binding and D1 cache key", async () => {
    const db = { prepare: vi.fn() };
    mocks.getRequiredD1Database.mockReturnValue(db);

    const { createPrismaClient, getPrismaCacheKey } = await import("./prisma-runtime.d1");

    createPrismaClient();

    expect(getPrismaCacheKey()).toBe("d1");
    expect(mocks.getRequiredD1Database).toHaveBeenCalledOnce();
    expect(mocks.d1Adapters).toHaveLength(1);
    expect(mocks.d1Adapters[0]).toMatchObject({ db });
    expect(mocks.cloudflareClients).toHaveLength(1);
  });
});
