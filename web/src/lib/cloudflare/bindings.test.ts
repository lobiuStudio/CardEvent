import { afterEach, describe, expect, it, vi } from "vitest";

const getCloudflareContext = vi.fn();

vi.mock("@opennextjs/cloudflare", () => ({
  getCloudflareContext,
}));

describe("Cloudflare binding helpers", () => {
  afterEach(() => {
    vi.resetModules();
    getCloudflareContext.mockReset();
  });

  it("returns required DB and R2 bindings", async () => {
    const db = { prepare: vi.fn() };
    const bucket = { put: vi.fn(), get: vi.fn(), delete: vi.fn() };
    getCloudflareContext.mockReturnValue({
      env: {
        DB: db,
        CARD_EVENT_UPLOADS: bucket,
      },
    });

    const { getRequiredCloudflareEnv } = await import("./bindings");

    expect(getRequiredCloudflareEnv()).toEqual({
      DB: db,
      CARD_EVENT_UPLOADS: bucket,
    });
  });

  it("returns D1 binding without requiring R2", async () => {
    const db = { prepare: vi.fn() };
    getCloudflareContext.mockReturnValue({
      env: {
        DB: db,
      },
    });

    const { getRequiredD1Database } = await import("./bindings");

    expect(getRequiredD1Database()).toBe(db);
  });

  it("throws an actionable error when DB is missing", async () => {
    getCloudflareContext.mockReturnValue({
      env: {
        CARD_EVENT_UPLOADS: { put: vi.fn() },
      },
    });

    const { getRequiredCloudflareEnv } = await import("./bindings");

    expect(() => getRequiredCloudflareEnv()).toThrow(
      "Cloudflare D1 binding DB is missing. Configure a D1 binding named DB on the Cloudflare Pages project.",
    );
  });

  it("throws an actionable error when R2 is missing", async () => {
    getCloudflareContext.mockReturnValue({
      env: {
        DB: { prepare: vi.fn() },
      },
    });

    const { getRequiredCloudflareEnv } = await import("./bindings");

    expect(() => getRequiredCloudflareEnv()).toThrow(
      "Cloudflare R2 binding CARD_EVENT_UPLOADS is missing. Configure an R2 binding named CARD_EVENT_UPLOADS on the Cloudflare Pages project.",
    );
  });
});
