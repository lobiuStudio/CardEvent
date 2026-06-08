import { createHash } from "crypto";
import { describe, expect, it, vi } from "vitest";
import {
  acceptJudgeInvitation,
  createJudgeInvitation,
  countCompletedJudgeSubmissionPairs,
  JudgeInvitationExpiredError,
  upsertJudgeScores,
} from "./judge-repository";

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

describe("judge invitation repository", () => {
  it("stores a hash for lookup and the raw token for admin resend", async () => {
    const create = vi.fn(async () => ({ id: "invitation-1" }));
    const store = {
      judgeInvitation: {
        create,
      },
    };

    await expect(
      createJudgeInvitation(
        {
          activityId: "activity-1",
          email: "judge@example.com",
          expiresAt: new Date("2026-07-01T00:00:00.000Z"),
        },
        { generateToken: () => "raw-token", store },
      ),
    ).resolves.toEqual({ invitationId: "invitation-1", rawToken: "raw-token" });

    expect(create).toHaveBeenCalledWith({
      data: {
        activityId: "activity-1",
        email: "judge@example.com",
        expiresAt: new Date("2026-07-01T00:00:00.000Z"),
        rawToken: "raw-token",
        tokenHash: sha256("raw-token"),
      },
      select: {
        id: true,
      },
    });
  });

  it("rejects expired invitation tokens without creating a membership", async () => {
    const store = {
      judgeInvitation: {
        findUnique: vi.fn(async () => ({
          id: "invitation-1",
          activityId: "activity-1",
          acceptedAt: null,
          expiresAt: new Date("2026-06-01T00:00:00.000Z"),
        })),
        updateMany: vi.fn(async () => ({ count: 1 })),
      },
      judgeMembership: {
        upsert: vi.fn(),
      },
      userRole: {
        upsert: vi.fn(),
      },
    };

    await expect(
      acceptJudgeInvitation(
        {
          rawToken: "raw-token",
          userId: "judge-1",
        },
        { now: () => new Date("2026-06-02T00:00:00.000Z"), store },
      ),
    ).rejects.toBeInstanceOf(JudgeInvitationExpiredError);

    expect(store.judgeMembership.upsert).not.toHaveBeenCalled();
    expect(store.judgeInvitation.updateMany).not.toHaveBeenCalled();
    expect(store.userRole.upsert).not.toHaveBeenCalled();
  });

  it("accepts a valid invitation by creating judge role and activity membership", async () => {
    const store = {
      judgeInvitation: {
        findUnique: vi.fn(async () => ({
          id: "invitation-1",
          activityId: "activity-1",
          acceptedAt: null,
          expiresAt: new Date("2026-06-03T00:00:00.000Z"),
        })),
        updateMany: vi.fn(async () => ({ count: 1 })),
      },
      judgeMembership: {
        upsert: vi.fn(async () => ({})),
      },
      userRole: {
        upsert: vi.fn(async () => ({})),
      },
    };

    await expect(
      acceptJudgeInvitation(
        {
          rawToken: "raw-token",
          userId: "judge-1",
        },
        { now: () => new Date("2026-06-02T00:00:00.000Z"), store },
      ),
    ).resolves.toEqual({ activityId: "activity-1" });

    expect(store.judgeInvitation.updateMany).toHaveBeenCalledWith({
      where: {
        id: "invitation-1",
        acceptedAt: null,
        expiresAt: {
          gt: new Date("2026-06-02T00:00:00.000Z"),
        },
      },
      data: {
        acceptedAt: new Date("2026-06-02T00:00:00.000Z"),
      },
    });
    expect(store.userRole.upsert).toHaveBeenCalledWith({
      where: {
        userId_role: {
          userId: "judge-1",
          role: "judge",
        },
      },
      create: {
        userId: "judge-1",
        role: "judge",
      },
      update: {},
    });
    expect(store.judgeMembership.upsert).toHaveBeenCalledWith({
      where: {
        activityId_userId: {
          activityId: "activity-1",
          userId: "judge-1",
        },
      },
      create: {
        activityId: "activity-1",
        userId: "judge-1",
      },
      update: {},
    });
  });
});

describe("judge scoring repository", () => {
  it("upserts criterion scores and one judge comment for an assigned judge", async () => {
    const store = {
      submission: {
        findUnique: vi.fn(async () => ({ id: "submission-1", activityId: "activity-1" })),
      },
      judgeMembership: {
        findUnique: vi.fn(async () => ({ id: "membership-1" })),
      },
      gradingCriterion: {
        findMany: vi.fn(async () => [{ id: "creativity" }, { id: "finish" }]),
      },
      score: {
        upsert: vi.fn(async () => ({})),
      },
      judgeComment: {
        upsert: vi.fn(async () => ({})),
      },
    };

    await upsertJudgeScores(
      {
        judgeId: "judge-1",
        submissionId: "submission-1",
        scores: [
          { criterionId: "creativity", value: 8.5 },
          { criterionId: "finish", value: 9 },
        ],
        comment: "Strong detail.",
      },
      { store },
    );

    expect(store.score.upsert).toHaveBeenCalledTimes(2);
    expect(store.score.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          judgeId_submissionId_criterionId: {
            judgeId: "judge-1",
            submissionId: "submission-1",
            criterionId: "creativity",
          },
        },
        create: expect.objectContaining({
          activityId: "activity-1",
          criterionId: "creativity",
          judgeId: "judge-1",
          submissionId: "submission-1",
          value: 8.5,
        }),
      }),
    );
    expect(store.judgeComment.upsert).toHaveBeenCalledWith({
      where: {
        judgeId_submissionId: {
          judgeId: "judge-1",
          submissionId: "submission-1",
        },
      },
      create: {
        judgeId: "judge-1",
        submissionId: "submission-1",
        comment: "Strong detail.",
      },
      update: {
        comment: "Strong detail.",
      },
    });
  });

  it("counts judge-submission pairs only when every activity criterion has a score", async () => {
    const store = {
      gradingCriterion: {
        findMany: vi.fn(async () => [{ id: "creativity" }, { id: "finish" }]),
      },
      judgeMembership: {
        findMany: vi.fn(async () => [{ userId: "judge-1" }, { userId: "judge-2" }]),
      },
      submission: {
        findMany: vi.fn(async () => [
          {
            id: "submission-1",
            deletedAt: null,
            reviewStatus: "approved",
            paymentStatus: "confirmed",
            activity: { reviewRequired: true, paymentRequired: true },
          },
          {
            id: "submission-2",
            deletedAt: null,
            reviewStatus: "approved",
            paymentStatus: "confirmed",
            activity: { reviewRequired: true, paymentRequired: true },
          },
        ]),
      },
      score: {
        findMany: vi.fn(async () => [
          { judgeId: "judge-1", submissionId: "submission-1", criterionId: "creativity" },
          { judgeId: "judge-1", submissionId: "submission-1", criterionId: "finish" },
          { judgeId: "judge-1", submissionId: "submission-2", criterionId: "creativity" },
          { judgeId: "judge-2", submissionId: "submission-1", criterionId: "creativity" },
          { judgeId: "judge-2", submissionId: "submission-1", criterionId: "finish" },
        ]),
      },
    };

    await expect(countCompletedJudgeSubmissionPairs("activity-1", { store })).resolves.toBe(2);
  });
});
