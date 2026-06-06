import { afterEach, describe, expect, it } from "vitest";
import { googleDriveStorage } from "./google-drive-storage";
import { localFileStorage } from "./local-file-storage";
import { getFileStorage } from "./storage-provider";

describe("getFileStorage", () => {
  afterEach(() => {
    delete process.env.FILE_STORAGE_PROVIDER;
  });

  it("defaults to local file storage", () => {
    delete process.env.FILE_STORAGE_PROVIDER;

    expect(getFileStorage()).toBe(localFileStorage);
  });

  it("uses Google Drive storage when configured", () => {
    process.env.FILE_STORAGE_PROVIDER = "google_drive";

    expect(getFileStorage()).toBe(googleDriveStorage);
  });
});
