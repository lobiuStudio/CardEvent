import { describe, expect, it } from "vitest";
import { judgeScoreSubmissionSchema } from "./scoring";

describe("judgeScoreSubmissionSchema", () => {
  it("accepts criterion scores in half-point increments with an optional trimmed comment", () => {
    const parsed = judgeScoreSubmissionSchema.parse({
      scores: [
        { criterionId: "creativity", value: 8 },
        { criterionId: "finish", value: 7.5 },
      ],
      comment: "  Strong composition.  ",
    });

    expect(parsed).toEqual({
      scores: [
        { criterionId: "creativity", value: 8 },
        { criterionId: "finish", value: 7.5 },
      ],
      comment: "Strong composition.",
    });
  });

  it("rejects empty score lists, out-of-range values, and non-half-point values", () => {
    expect(judgeScoreSubmissionSchema.safeParse({ scores: [] }).success).toBe(false);
    expect(judgeScoreSubmissionSchema.safeParse({ scores: [{ criterionId: "art", value: -0.5 }] }).success).toBe(false);
    expect(judgeScoreSubmissionSchema.safeParse({ scores: [{ criterionId: "art", value: 10.5 }] }).success).toBe(false);
    expect(judgeScoreSubmissionSchema.safeParse({ scores: [{ criterionId: "art", value: 7.25 }] }).success).toBe(false);
  });

  it("converts an empty optional comment to undefined and rejects long comments", () => {
    expect(
      judgeScoreSubmissionSchema.parse({
        scores: [{ criterionId: "art", value: 9 }],
        comment: "   ",
      }),
    ).toEqual({
      scores: [{ criterionId: "art", value: 9 }],
      comment: undefined,
    });

    expect(
      judgeScoreSubmissionSchema.safeParse({
        scores: [{ criterionId: "art", value: 9 }],
        comment: "x".repeat(2001),
      }).success,
    ).toBe(false);
  });
});
