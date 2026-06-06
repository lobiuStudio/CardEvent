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
  it("stores only a hash of the invitation token", async () => {
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
        tokenHash: sha256("raw-token"),
      },
      select: {
        id: true,
      },
    });
  });

  it("rejects expired invitation tokens without creating a membership", async () => {
    const tx = {
      judgeInvitation: {
        findUnique: vi.fn(async () => ({
          id: "invitation-1",
          activityId: "activity-1",
          expiresAt: new Date("2026-06-01T00:00:00.000Z"),
        })),
        update: vi.fn(),
      },
      judgeMembership: {
        upsert: vi.fn(),
      },
    };
    const store = {
      $transaction: vi.fn(async (callback) => callback(tx)),
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

    expect(tx.judgeMembership.upsert).not.toHaveBeenCalled();
    expect(tx.judgeInvitation.update).not.toHaveBeenCalled();
  });

  it("accepts a valid invitation by creating judge role and activity membership", async () => {
    const tx = {
      judgeInvitation: {
        findUnique: vi.fn(async () => ({
          id: "invitation-1",
          activityId: "activity-1",
          acceptedAt: null,
          expiresAt: new Date("2026-06-03T00:00:00.000Z"),
        })),
        update: vi.fn(async () => ({})),
      },
      judgeMembership: {
        upsert: vi.fn(async () => ({})),
      },
      userRole: {
        upsert: vi.fn(async () => ({})),
      },
    };
    const store = {
      $transaction: vi.fn(async (callback) => callback(tx)),
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

    expect(tx.userRole.upsert).toHaveBeenCalledWith({
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
    expect(tx.judgeMembership.upsert).toHaveBeenCalledWith({
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
    const tx = {
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
    const store = {
      $transaction: vi.fn(async (callback) => callback(tx)),
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

    expect(tx.score.upsert).toHaveBeenCalledTimes(2);
    expect(tx.score.upsert).toHaveBeenCalledWith(
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
    expect(tx.judgeComment.upsert).toHaveBeenCalledWith({
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
