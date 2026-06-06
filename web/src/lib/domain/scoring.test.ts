import { describe, expect, it } from "vitest";
import {
  calculateFinalScore,
  rankCompetitionResults,
  roundToNearestHalf,
  validateHalfPointScore,
} from "./scoring";

describe("validateHalfPointScore", () => {
  it("accepts scores from 0 to 10 in 0.5 increments", () => {
    expect(validateHalfPointScore(0)).toBe(0);
    expect(validateHalfPointScore(7.5)).toBe(7.5);
    expect(validateHalfPointScore(10)).toBe(10);
  });

  it("rejects scores outside range or outside 0.5 increments", () => {
    expect(() => validateHalfPointScore(-0.5)).toThrow("Score must be between 0 and 10");
    expect(() => validateHalfPointScore(10.5)).toThrow("Score must be between 0 and 10");
    expect(() => validateHalfPointScore(7.25)).toThrow("Score must use 0.5 increments");
  });
});

describe("roundToNearestHalf", () => {
  it("rounds values to the nearest half point", () => {
    expect(roundToNearestHalf(8.24)).toBe(8);
    expect(roundToNearestHalf(8.25)).toBe(8.5);
    expect(roundToNearestHalf(8.74)).toBe(8.5);
    expect(roundToNearestHalf(8.75)).toBe(9);
  });
});

describe("calculateFinalScore", () => {
  it("averages all judge criterion scores and rounds to nearest 0.5", () => {
    expect(
      calculateFinalScore([
        { judgeId: "judge-1", criterionId: "creativity", score: 8 },
        { judgeId: "judge-1", criterionId: "finish", score: 8.5 },
        { judgeId: "judge-2", criterionId: "creativity", score: 9 },
        { judgeId: "judge-2", criterionId: "finish", score: 8 },
      ]),
    ).toEqual({
      rawAverage: 8.375,
      finalScore: 8.5,
      criterionAverages: [
        { criterionId: "creativity", average: 8.5 },
        { criterionId: "finish", average: 8.25 },
      ],
    });
  });

  it("rejects empty score lists", () => {
    expect(() => calculateFinalScore([])).toThrow("At least one score is required");
  });
});

describe("rankCompetitionResults", () => {
  it("uses shared ranks for ties and skips the next rank", () => {
    expect(
      rankCompetitionResults([
        { submissionId: "card-a", groupId: "open", finalScore: 9 },
        { submissionId: "card-b", groupId: "open", finalScore: 9 },
        { submissionId: "card-c", groupId: "open", finalScore: 8.5 },
        { submissionId: "card-d", groupId: "junior", finalScore: 7 },
      ]),
    ).toEqual([
      { submissionId: "card-a", groupId: "open", finalScore: 9, rank: 1 },
      { submissionId: "card-b", groupId: "open", finalScore: 9, rank: 1 },
      { submissionId: "card-c", groupId: "open", finalScore: 8.5, rank: 3 },
      { submissionId: "card-d", groupId: "junior", finalScore: 7, rank: 1 },
    ]);
  });
});
