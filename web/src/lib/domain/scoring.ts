export type ScoreInput = {
  judgeId: string;
  criterionId: string;
  score: number;
};

export type CriterionAverage = {
  criterionId: string;
  average: number;
};

export type FinalScoreResult = {
  rawAverage: number;
  finalScore: number;
  criterionAverages: CriterionAverage[];
};

export type CompetitionResultInput = {
  submissionId: string;
  groupId: string;
  finalScore: number;
};

export type RankedCompetitionResult = CompetitionResultInput & {
  rank: number;
};

export function validateHalfPointScore(score: number): number {
  if (score < 0 || score > 10) {
    throw new Error("Score must be between 0 and 10");
  }

  if (Math.round(score * 2) !== score * 2) {
    throw new Error("Score must use 0.5 increments");
  }

  return score;
}

export function roundToNearestHalf(value: number): number {
  return Math.round(value * 2) / 2;
}

export function calculateFinalScore(scores: ScoreInput[]): FinalScoreResult {
  if (scores.length === 0) {
    throw new Error("At least one score is required");
  }

  for (const score of scores) {
    validateHalfPointScore(score.score);
  }

  const rawAverage = scores.reduce((sum, score) => sum + score.score, 0) / scores.length;
  const criterionIds = [...new Set(scores.map((score) => score.criterionId))];

  const criterionAverages = criterionIds.map((criterionId) => {
    const criterionScores = scores.filter((score) => score.criterionId === criterionId);
    return {
      criterionId,
      average: criterionScores.reduce((sum, score) => sum + score.score, 0) / criterionScores.length,
    };
  });

  return {
    rawAverage,
    finalScore: roundToNearestHalf(rawAverage),
    criterionAverages,
  };
}

export function rankCompetitionResults(results: CompetitionResultInput[]): RankedCompetitionResult[] {
  const grouped = new Map<string, CompetitionResultInput[]>();

  for (const result of results) {
    grouped.set(result.groupId, [...(grouped.get(result.groupId) ?? []), result]);
  }

  return [...grouped.values()].flatMap((groupResults) => {
    const sorted = [...groupResults].sort((a, b) => {
      if (b.finalScore !== a.finalScore) {
        return b.finalScore - a.finalScore;
      }
      return a.submissionId.localeCompare(b.submissionId);
    });

    let previousScore: number | null = null;
    let previousRank = 0;

    return sorted.map((result, index) => {
      const rank = previousScore === result.finalScore ? previousRank : index + 1;
      previousScore = result.finalScore;
      previousRank = rank;
      return { ...result, rank };
    });
  });
}
