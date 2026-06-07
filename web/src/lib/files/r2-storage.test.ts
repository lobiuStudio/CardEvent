import { afterEach, describe, expect, it, vi } from "vitest";

const bucket = {
  put: vi.fn(),
  get: vi.fn(),
  delete: vi.fn(),
};

vi.mock("@/lib/cloudflare/bindings", () => ({
  getRequiredCloudflareEnv: () => ({
    CARD_EVENT_UPLOADS: bucket,
    DB: { prepare: vi.fn() },
  }),
}));

describe("r2FileStorage", () => {
  afterEach(() => {
    bucket.put.mockReset();
    bucket.get.mockReset();
    bucket.delete.mockReset();
  });

  it("saves submission image metadata and writes bytes to R2", async () => {
    const { r2FileStorage } = await import("./r2-storage");
    const file = new File(["image-bytes"], "Card Art.png", { type: "image/png" });

    const stored = await r2FileStorage.saveSubmissionImage({
      activitySlug: "Summer Cards",
      submissionId: "sub-1",
      file,
      validatedImage: {
        bytes: new Uint8Array([1, 2, 3]),
        extension: "png",
        mimeType: "image/png",
      },
    });

    expect(stored.provider).toBe("r2");
    expect(stored.fileId).toContain("submissions/summer-cards/sub-1/");
    expect(stored.publicUrl).toBe(`/uploads/${stored.fileId}`);
    expect(stored.originalName).toBe("Card Art.png");
    expect(stored.mimeType).toBe("image/png");
    expect(stored.fileSize).toBe(3);
    expect(bucket.put).toHaveBeenCalledWith(
      stored.fileId,
      new Uint8Array([1, 2, 3]),
      {
        httpMetadata: {
          contentType: "image/png",
        },
      },
    );
  });

  it("returns null when reading a missing object", async () => {
    const { r2FileStorage } = await import("./r2-storage");
    bucket.get.mockResolvedValue(null);

    await expect(r2FileStorage.readFile("missing.png")).resolves.toBeNull();
  });

  it("deletes R2 files and ignores local files", async () => {
    const { r2FileStorage } = await import("./r2-storage");

    await r2FileStorage.deleteFile({
      provider: "r2",
      fileId: "submissions/a/b/file.png",
      publicUrl: "/uploads/submissions/a/b/file.png",
      originalName: "file.png",
      mimeType: "image/png",
      fileSize: 1,
    });

    await r2FileStorage.deleteFile({
      provider: "local",
      fileId: "local.png",
      publicUrl: "/uploads/local.png",
      originalName: "local.png",
      mimeType: "image/png",
      fileSize: 1,
    });

    expect(bucket.delete).toHaveBeenCalledTimes(1);
    expect(bucket.delete).toHaveBeenCalledWith("submissions/a/b/file.png");
  });
});
