// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";
import type { StoredFile } from "@/lib/files/file-storage";
import { POST } from "./route";

const mocks = vi.hoisted(() => ({
  createPaymentProof: vi.fn(),
  deleteFile: vi.fn(),
  findActivity: vi.fn(),
  findSubmissions: vi.fn(),
  getCrossSiteRequestResponse: vi.fn(),
  requireUser: vi.fn(),
  savePaymentProof: vi.fn(),
  readValidatedImageFile: vi.fn(),
}));

vi.mock("@/lib/auth/rbac", () => ({
  requireUser: mocks.requireUser,
}));

vi.mock("@/lib/auth/request-security", () => ({
  getCrossSiteRequestResponse: mocks.getCrossSiteRequestResponse,
}));

vi.mock("@/lib/db/payment-repository", () => ({
  createPaymentProof: mocks.createPaymentProof,
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    activity: {
      findUnique: mocks.findActivity,
    },
    submission: {
      findMany: mocks.findSubmissions,
    },
  },
}));

vi.mock("@/lib/files/storage-provider", () => ({
  getFileStorage: () => ({
    deleteFile: mocks.deleteFile,
    savePaymentProof: mocks.savePaymentProof,
  }),
}));

vi.mock("@/lib/validation/submission", async () => {
  const actual = await vi.importActual<typeof import("@/lib/validation/submission")>("@/lib/validation/submission");

  return {
    ...actual,
    readValidatedImageFile: mocks.readValidatedImageFile,
  };
});

function createPaymentProofRequest(): Request {
  const formData = new FormData();
  formData.set("proof", new File(["proof"], "proof.png", { type: "image/png" }));

  return new Request("https://cardevent.test/api/activities/activity-1/payment-proof", {
    method: "POST",
    headers: {
      accept: "application/json",
      origin: "https://cardevent.test",
    },
    body: formData,
  });
}

describe("payment proof upload route", () => {
  const storedFile: StoredFile = {
    provider: "r2",
    fileId: "payment-proofs/summer/user-1/proof.png",
    publicUrl: "/uploads/payment-proofs/summer/user-1/proof.png",
    originalName: "proof.png",
    mimeType: "image/png",
    fileSize: 5,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCrossSiteRequestResponse.mockReturnValue(null);
    mocks.requireUser.mockResolvedValue({ id: "user-1", email: "participant@example.test" });
    mocks.findActivity.mockResolvedValue({
      id: "activity-1",
      slug: "summer",
      paymentRequired: true,
      paymentChargingMode: "per_participant",
    });
    mocks.findSubmissions.mockResolvedValue([{ id: "submission-1", paymentStatus: "pending" }]);
    mocks.readValidatedImageFile.mockResolvedValue({
      bytes: new Uint8Array([1, 2, 3]),
      extension: "png",
      mimeType: "image/png",
      fileSize: 3,
    });
    mocks.savePaymentProof.mockResolvedValue(storedFile);
  });

  it("cleans staged files with the configured storage provider when record creation fails", async () => {
    mocks.createPaymentProof.mockRejectedValue(new Error("database failed"));

    const response = await POST(createPaymentProofRequest(), {
      params: Promise.resolve({ activityId: "activity-1" }),
    });

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ error: "Payment proof could not be saved." });
    expect(mocks.deleteFile).toHaveBeenCalledWith(storedFile);
  });
});
