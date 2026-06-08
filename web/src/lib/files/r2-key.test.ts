import { describe, expect, it } from "vitest";
import { buildR2ObjectKey, toPublicUploadUrl } from "./r2-key";

describe("R2 object keys", () => {
  it("builds submission keys with safe path segments", () => {
    expect(
      buildR2ObjectKey({
        kind: "submission",
        activitySlug: "Summer Cards 2026",
        ownerId: "submission-1",
        fileName: "Blue Dragon!!.PNG",
        id: "file-1",
      }),
    ).toBe("submissions/summer-cards-2026/submission-1/file-1-blue-dragon.png");
  });

  it("builds payment proof keys", () => {
    expect(
      buildR2ObjectKey({
        kind: "payment-proof",
        activitySlug: "paid event",
        ownerId: "user/123",
        fileName: "receipt webp",
        id: "proof-1",
      }),
    ).toBe("payment-proofs/paid-event/user-123/proof-1-receipt-webp");
  });

  it("builds activity cover keys without an owner segment", () => {
    expect(
      buildR2ObjectKey({
        kind: "activity-cover",
        activitySlug: "Poster Event",
        fileName: "Cover Art!!.jpg",
        id: "cover-1",
      }),
    ).toBe("activity-covers/poster-event/cover-1-cover-art.jpg");
  });

  it("keeps upload URLs app-proxied", () => {
    expect(toPublicUploadUrl("submissions/a/b/file.png")).toBe("/uploads/submissions/a/b/file.png");
  });

  it("encodes upload URL segments without encoding path separators", () => {
    expect(toPublicUploadUrl("submissions/a b/file#1?.png")).toBe("/uploads/submissions/a%20b/file%231%3F.png");
  });

  it("rejects unsafe upload URL segments", () => {
    expect(() => toPublicUploadUrl("../admin")).toThrow("Upload file id contains an unsafe path segment.");
    expect(() => toPublicUploadUrl("submissions//file.png")).toThrow("Upload file id contains an unsafe path segment.");
    expect(() => toPublicUploadUrl("submissions/./file.png")).toThrow("Upload file id contains an unsafe path segment.");
  });
});
