import { afterEach, describe, expect, it } from "vitest";
import { getDatabaseProvider, resolveSqliteUrl } from "./database-provider";

describe("database provider helpers", () => {
  afterEach(() => {
    delete process.env.DATABASE_PROVIDER;
  });

  it("defaults to sqlite", () => {
    expect(getDatabaseProvider()).toBe("sqlite");
  });

  it("selects D1 when explicitly configured", () => {
    process.env.DATABASE_PROVIDER = "d1";

    expect(getDatabaseProvider()).toBe("d1");
  });

  it("rejects unsupported database providers", () => {
    process.env.DATABASE_PROVIDER = "postgres";

    expect(() => getDatabaseProvider()).toThrow(
      "DATABASE_PROVIDER must be sqlite or d1.",
    );
  });

  it("keeps existing sqlite path normalization", () => {
    expect(resolveSqliteUrl("file:./dev.db")).toBe("file:./prisma/dev.db");
    expect(resolveSqliteUrl("file:./prisma/dev.db")).toBe("file:./prisma/dev.db");
  });
});
