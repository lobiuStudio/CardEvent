// @vitest-environment node

import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const state = {
    nodeClients: [] as Array<Record<string, unknown>>,
    sqliteAdapters: [] as Array<Record<string, unknown>>,
  };

  return {
    ...state,
    reset() {
      state.nodeClients.length = 0;
      state.sqliteAdapters.length = 0;
    },
  };
});

vi.mock("@prisma/adapter-better-sqlite3", () => ({
  PrismaBetterSqlite3: vi.fn(function PrismaBetterSqlite3(this: Record<string, unknown>, options) {
    this.options = options;
    mocks.sqliteAdapters.push(this);
  }),
}));

vi.mock("@prisma/client", () => ({
  PrismaClient: vi.fn(function PrismaClient(this: Record<string, unknown>, options) {
    this.options = options;
    mocks.nodeClients.push(this);
  }),
}));

describe("SQLite Prisma runtime", () => {
  afterEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
    mocks.reset();
  });

  it("uses a normalized fallback sqlite URL", async () => {
    vi.stubEnv("DATABASE_URL", undefined);

    const { createPrismaClient, getPrismaCacheKey } = await import("./prisma-runtime");

    createPrismaClient();

    expect(getPrismaCacheKey()).toBe("sqlite:file:./prisma/dev.db");
    expect(mocks.sqliteAdapters).toHaveLength(1);
    expect(mocks.sqliteAdapters[0]).toMatchObject({
      options: { url: "file:./prisma/dev.db" },
    });
    expect(mocks.nodeClients).toHaveLength(1);
  });

  it("keys sqlite clients by normalized database URL", async () => {
    vi.stubEnv("DATABASE_URL", "file:./other.db");

    const { createPrismaClient, getPrismaCacheKey } = await import("./prisma-runtime");

    createPrismaClient();

    expect(getPrismaCacheKey()).toBe("sqlite:file:./prisma/other.db");
    expect(mocks.sqliteAdapters[0]).toMatchObject({
      options: { url: "file:./prisma/other.db" },
    });
  });
});
