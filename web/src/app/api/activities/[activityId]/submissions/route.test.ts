// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";
import type { StoredFile } from "@/lib/files/file-storage";
import { POST } from "./route";

const mocks = vi.hoisted(() => {
  class SubmissionLimitReachedError extends Error {}
  class SubmissionSlotConflictError extends Error {}

  return {
    countParticipantSubmissions: vi.fn(),
    createSubmissionWithImages: vi.fn(),
    deleteFile: vi.fn(),
    findActivity: vi.fn(),
    getCrossSiteRequestResponse: vi.fn(),
    requireUser: vi.fn(),
    saveSubmissionImage: vi.fn(),
    sendEmail: vi.fn(),
    readValidatedImageFile: vi.fn(),
    SubmissionLimitReachedError,
    SubmissionSlotConflictError,
  };
});

vi.mock("@/lib/auth/rbac", () => ({
  requireUser: mocks.requireUser,
}));

vi.mock("@/lib/auth/request-security", () => ({
  getCrossSiteRequestResponse: mocks.getCrossSiteRequestResponse,
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    activity: {
      findUnique: mocks.findActivity,
    },
  },
}));

vi.mock("@/lib/db/submission-repository", () => ({
  countParticipantSubmissions: mocks.countParticipantSubmissions,
  createSubmissionWithImages: mocks.createSubmissionWithImages,
  SubmissionLimitReachedError: mocks.SubmissionLimitReachedError,
  SubmissionSlotConflictError: mocks.SubmissionSlotConflictError,
}));

vi.mock("@/lib/email/email-service", () => ({
  sendEmail: mocks.sendEmail,
}));

vi.mock("@/lib/email/messages", () => ({
  submissionReceivedEmail: vi.fn(() => ({ to: "participant@example.test" })),
}));

vi.mock("@/lib/files/storage-provider", () => ({
  getFileStorage: () => ({
    deleteFile: mocks.deleteFile,
    saveSubmissionImage: mocks.saveSubmissionImage,
  }),
}));

vi.mock("@/lib/validation/submission", async () => {
  const actual = await vi.importActual<typeof import("@/lib/validation/submission")>("@/lib/validation/submission");

  return {
    ...actual,
    readValidatedImageFile: mocks.readValidatedImageFile,
  };
});

function createSubmissionRequest(): Request {
  const formData = new FormData();
  formData.set("cardName", "Blue Dragon");
  formData.set("images", new File(["image"], "card.png", { type: "image/png" }));

  return new Request("https://cardevent.test/api/activities/activity-1/submissions", {
    method: "POST",
    headers: {
      accept: "application/json",
      origin: "https://cardevent.test",
    },
    body: formData,
  });
}

describe("submission upload route", () => {
  const storedFile: StoredFile = {
    provider: "r2",
    fileId: "submissions/summer/submission-1/card.png",
    publicUrl: "/uploads/submissions/summer/submission-1/card.png",
    originalName: "card.png",
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
      title: "Summer Cards",
      submissionStartAt: new Date(Date.now() - 60_000),
      submissionDeadlineAt: new Date(Date.now() + 60_000),
      perParticipantSubmissionLimit: 3,
      maxImagesPerSubmission: 1,
      reviewRequired: false,
      paymentRequired: false,
      groups: [],
    });
    mocks.countParticipantSubmissions.mockResolvedValue(0);
    mocks.readValidatedImageFile.mockResolvedValue({
      bytes: new Uint8Array([1, 2, 3]),
      extension: "png",
      mimeType: "image/png",
      fileSize: 3,
    });
    mocks.saveSubmissionImage.mockResolvedValue(storedFile);
  });

  it("cleans staged files with the configured storage provider when record creation fails", async () => {
    mocks.createSubmissionWithImages.mockRejectedValue(new Error("database failed"));

    const response = await POST(createSubmissionRequest(), {
      params: Promise.resolve({ activityId: "activity-1" }),
    });

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "Submission could not be saved. No submission was created.",
    });
    expect(mocks.deleteFile).toHaveBeenCalledWith(storedFile);
  });
});
