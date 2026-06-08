// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

const mocks = vi.hoisted(() => ({
  findSubmission: vi.fn(),
  getCrossSiteRequestResponse: vi.fn(),
  hasRole: vi.fn(),
  readSessionUser: vi.fn(),
  upsertJudgeScores: vi.fn(),
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

vi.mock("@/lib/db/judge-repository", () => ({
  JudgeMembershipRequiredError: class JudgeMembershipRequiredError extends Error {},
  JudgeScoreCriteriaMismatchError: class JudgeScoreCriteriaMismatchError extends Error {},
  JudgeSubmissionNotFoundError: class JudgeSubmissionNotFoundError extends Error {},
  upsertJudgeScores: mocks.upsertJudgeScores,
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    submission: {
      findUnique: mocks.findSubmission,
    },
  },
}));

function scoreRequest() {
  const formData = new FormData();
  formData.append("criterionId", "creativity");
  formData.append("value", "9");
  formData.append("criterionId", "finish");
  formData.append("value", "8");
  formData.append("comment", "Strong work.");
  formData.append("nextSubmissionId", "submission-2");

  return new Request("https://cardevent.test/api/judge/submissions/submission-1/scores?activityId=activity-1", {
    body: formData,
    headers: {
      origin: "https://cardevent.test",
    },
    method: "POST",
  });
}

describe("judge score route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCrossSiteRequestResponse.mockReturnValue(null);
    mocks.hasRole.mockReturnValue(true);
    mocks.readSessionUser.mockResolvedValue({ id: "judge-1", email: "judge@example.test", roles: ["judge"] });
    mocks.findSubmission.mockResolvedValue({
      id: "submission-1",
      activity: {
        criteria: [{ id: "creativity" }, { id: "finish" }],
      },
    });
  });

  it("redirects to the next submission after save-and-next", async () => {
    const response = await POST(scoreRequest(), {
      params: Promise.resolve({ submissionId: "submission-1" }),
    });

    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe(
      "https://cardevent.test/judge/activities/activity-1/submissions/submission-2?saved=1&savedSubmissionId=submission-1",
    );
    expect(mocks.upsertJudgeScores).toHaveBeenCalledWith({
      judgeId: "judge-1",
      submissionId: "submission-1",
      scores: [
        { criterionId: "creativity", value: 9 },
        { criterionId: "finish", value: 8 },
      ],
      comment: "Strong work.",
    });
  });
});
