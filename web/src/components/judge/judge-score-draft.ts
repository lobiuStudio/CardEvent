export type JudgeScoreDraft = {
  comment?: string;
  scores?: Record<string, number>;
};

export const judgeScoreDraftChangedEvent = "cardevent:judge-score-draft-change";

function isValidScore(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= 10;
}

export function readJudgeScoreDraft(storageKey: string): JudgeScoreDraft {
  try {
    const raw = window.localStorage.getItem(storageKey);
    const parsed: unknown = raw ? JSON.parse(raw) : {};

    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {};
    }

    const draft = parsed as JudgeScoreDraft;
    const scores = draft.scores && typeof draft.scores === "object" && !Array.isArray(draft.scores) ? draft.scores : {};

    return {
      comment: typeof draft.comment === "string" ? draft.comment : undefined,
      scores: Object.fromEntries(Object.entries(scores).filter(([, value]) => isValidScore(value))),
    };
  } catch {
    return {};
  }
}

export function writeJudgeScoreDraft(storageKey: string, draft: JudgeScoreDraft) {
  window.localStorage.setItem(storageKey, JSON.stringify(draft));
  window.dispatchEvent(new CustomEvent(judgeScoreDraftChangedEvent, { detail: { storageKey } }));
}

export function updateJudgeScoreDraft(storageKey: string, update: JudgeScoreDraft) {
  const currentDraft = readJudgeScoreDraft(storageKey);

  writeJudgeScoreDraft(storageKey, {
    ...currentDraft,
    ...update,
    scores: {
      ...(currentDraft.scores ?? {}),
      ...(update.scores ?? {}),
    },
  });
}
