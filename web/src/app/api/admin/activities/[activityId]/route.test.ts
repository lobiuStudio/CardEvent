// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

const mocks = vi.hoisted(() => ({
  activityDelete: vi.fn(),
  activityFindUnique: vi.fn(),
  deleteFile: vi.fn(),
  getCrossSiteRequestResponse: vi.fn(),
  hasRole: vi.fn(),
  readSessionUser: vi.fn(),
}));

vi.mock("@/lib/auth/rbac", () => ({
  hasRole: mocks.hasRole,
}));

vi.mock("@/lib/auth/request-security", () => ({
  getCrossSiteRequestResponse: mocks.getCrossSiteRequestResponse,
}));

vi.mock("@/lib/auth/session", () => ({
  readSessionUser: mocks.readSessionUser,
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    activity: {
      delete: mocks.activityDelete,
      findUnique: mocks.activityFindUnique,
    },
  },
}));

vi.mock("@/lib/files/storage-provider", () => ({
  getFileStorage: () => ({
    deleteFile: mocks.deleteFile,
  }),
}));

describe("admin activity item route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCrossSiteRequestResponse.mockReturnValue(null);
    mocks.hasRole.mockReturnValue(true);
    mocks.readSessionUser.mockResolvedValue({ id: "admin-1", roles: ["admin"] });
    mocks.activityFindUnique.mockResolvedValue({
      id: "activity-1",
      slug: "summer-cards",
      coverImageStorageProvider: "r2",
      coverImageStorageFileId: "activity-covers/summer-cards/cover.png",
      coverImagePublicUrl: "/uploads/activity-covers/summer-cards/cover.png",
      coverImageOriginalName: "cover.png",
      coverImageMimeType: "image/png",
      coverImageFileSize: 3,
      submissions: [
        {
          images: [
            {
              storageProvider: "r2",
              storageFileId: "submissions/summer-cards/submission-1/card.png",
              publicUrl: "/uploads/submissions/summer-cards/submission-1/card.png",
              originalName: "card.png",
              mimeType: "image/png",
              fileSize: 3,
            },
          ],
        },
      ],
      paymentProofs: [
        {
          storageProvider: "r2",
          storageFileId: "payment-proofs/summer-cards/user-1/proof.png",
          publicUrl: "/uploads/payment-proofs/summer-cards/user-1/proof.png",
          originalName: "proof.png",
          mimeType: "image/png",
          fileSize: 3,
        },
      ],
    });
    mocks.activityDelete.mockResolvedValue({ id: "activity-1", slug: "summer-cards" });
    mocks.deleteFile.mockResolvedValue(undefined);
  });

  it("deletes an activity and cleans related stored files", async () => {
    const response = await POST(
      new Request("https://cardevent.test/api/admin/activities/activity-1", {
        method: "POST",
        headers: {
          origin: "https://cardevent.test",
        },
      }),
      {
        params: Promise.resolve({ activityId: "activity-1" }),
      },
    );

    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("https://cardevent.test/admin?deleted=summer-cards");
    expect(mocks.activityDelete).toHaveBeenCalledWith({ where: { id: "activity-1" } });
    expect(mocks.deleteFile).toHaveBeenCalledTimes(3);
    expect(mocks.deleteFile).toHaveBeenCalledWith(
      expect.objectContaining({ fileId: "activity-covers/summer-cards/cover.png" }),
    );
  });
});
