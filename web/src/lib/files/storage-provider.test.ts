import { afterEach, describe, expect, it } from "vitest";
import { localFileStorage } from "./local-file-storage";
import { r2FileStorage } from "./r2-storage";
import { getFileStorage } from "./storage-provider";

describe("getFileStorage", () => {
  afterEach(() => {
    delete process.env.FILE_STORAGE_PROVIDER;
  });

  it("defaults to local file storage", () => {
    delete process.env.FILE_STORAGE_PROVIDER;

    expect(getFileStorage()).toBe(localFileStorage);
  });

  it("uses R2 storage when configured", () => {
    process.env.FILE_STORAGE_PROVIDER = "r2";

    expect(getFileStorage()).toBe(r2FileStorage);
  });

  it("rejects unsupported storage providers", () => {
    process.env.FILE_STORAGE_PROVIDER = "unsupported_remote";

    expect(() => getFileStorage()).toThrow("FILE_STORAGE_PROVIDER must be local or r2.");
  });
});
