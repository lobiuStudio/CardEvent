// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";
import type { StoredFile } from "@/lib/files/file-storage";
import { POST } from "./route";

const mocks = vi.hoisted(() => ({
  createActivity: vi.fn(),
  deleteFile: vi.fn(),
  getCrossSiteRequestResponse: vi.fn(),
  hasRole: vi.fn(),
  readSessionUser: vi.fn(),
  saveActivityCover: vi.fn(),
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

vi.mock("@/lib/db/activity-repository", () => ({
  createActivity: mocks.createActivity,
}));

vi.mock("@/lib/files/storage-provider", () => ({
  getFileStorage: () => ({
    deleteFile: mocks.deleteFile,
    saveActivityCover: mocks.saveActivityCover,
  }),
}));

function validActivityBody(overrides: Record<string, unknown> = {}) {
  return {
    slug: "spring-card-cup",
    title: "Spring Card Cup",
    description: "A seasonal card grading activity.",
    mode: "grading",
    rulesMarkdown: "## Rules\n\nSubmit original card images.",
    submissionStartAt: "2026-07-01T00:00:00.000Z",
    submissionDeadlineAt: "2026-07-10T00:00:00.000Z",
    judgingDeadlineAt: "2026-07-20T00:00:00.000Z",
    expectedResultAnnouncementAt: "2026-07-25T00:00:00.000Z",
    perParticipantSubmissionLimit: "3",
    maxImagesPerSubmission: "4",
    reviewRequired: true,
    anonymousJudging: false,
    paymentRequired: false,
    paymentChargingMode: "per_card",
    groups: [{ name: "Open", displayOrder: 0 }],
    criteria: [{ name: "Artwork", description: undefined, displayOrder: 0 }],
    ...overrides,
  };
}

function createJsonRequest(body: unknown): Request {
  return new Request("https://cardevent.test/api/admin/activities", {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      origin: "https://cardevent.test",
    },
    body: JSON.stringify(body),
  });
}

function createMultipartRequest(): Request {
  const formData = new FormData();
  const body = validActivityBody();
  const { criteria, groups, ...scalarFields } = body;

  for (const [key, value] of Object.entries(scalarFields)) {
    formData.set(key, String(value));
  }

  groups.forEach((group) => formData.append("groupName", group.name));
  criteria.forEach((criterion) => {
    formData.append("criterionName", criterion.name);
    formData.append("criterionDescription", criterion.description ?? "");
  });

  formData.set("coverImage", new File(["cover-bytes"], "poster.png", { type: "image/png" }));

  return new Request("https://cardevent.test/api/admin/activities", {
    method: "POST",
    headers: {
      accept: "application/json",
      origin: "https://cardevent.test",
    },
    body: formData,
  });
}

describe("admin activity route", () => {
  const storedCover: StoredFile = {
    provider: "r2",
    fileId: "activity-covers/spring-card-cup/poster.png",
    publicUrl: "/uploads/activity-covers/spring-card-cup/poster.png",
    originalName: "poster.png",
    mimeType: "image/png",
    fileSize: 11,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.createActivity.mockResolvedValue({ id: "activity-1", slug: "spring-card-cup" });
    mocks.getCrossSiteRequestResponse.mockReturnValue(null);
    mocks.hasRole.mockReturnValue(true);
    mocks.readSessionUser.mockResolvedValue({ id: "admin-1", roles: ["admin"] });
    mocks.deleteFile.mockResolvedValue(undefined);
    mocks.saveActivityCover.mockResolvedValue(storedCover);
  });

  it("returns field errors and submitted values for JSON validation failures", async () => {
    const response = await POST(
      createJsonRequest(
        validActivityBody({
          title: "",
          groups: [],
        }),
      ),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: "Check the highlighted fields and try again.",
      fieldErrors: {
        title: "Enter an activity name.",
        groups: "Add at least one group.",
      },
      values: {
        slug: "spring-card-cup",
        description: "A seasonal card grading activity.",
      },
    });
    expect(mocks.createActivity).not.toHaveBeenCalled();
  });

  it("passes uploaded cover image metadata to activity creation", async () => {
    const response = await POST(createMultipartRequest());

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      activityId: "activity-1",
      slug: "spring-card-cup",
    });
    expect(mocks.saveActivityCover).toHaveBeenCalledWith({
      activitySlug: "spring-card-cup",
      file: expect.any(File),
    });
    expect(mocks.createActivity).toHaveBeenCalledWith(
      expect.objectContaining({
        coverImage: storedCover,
      }),
    );
  });

  it("deletes a staged cover image if activity creation fails", async () => {
    mocks.createActivity.mockRejectedValue(new Error("database failed"));

    await expect(POST(createMultipartRequest())).rejects.toThrow("database failed");

    expect(mocks.deleteFile).toHaveBeenCalledWith(storedCover);
  });
});
