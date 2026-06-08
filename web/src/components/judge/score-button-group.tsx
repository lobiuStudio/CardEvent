"use client";

import { useState, useSyncExternalStore } from "react";
import { judgeScoreDraftChangedEvent, readJudgeScoreDraft, updateJudgeScoreDraft } from "./judge-score-draft";

type ScoreButtonGroupProps = {
  criterionId: string;
  description?: string | null;
  draftStorageKey?: string;
  initialValue?: number;
  name: string;
};

const scoreOptions = Array.from({ length: 11 }, (_, index) => index);

function normalizeScore(value: number | undefined): number | undefined {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return undefined;
  }

  return Math.min(10, Math.max(0, Math.round(value)));
}

function subscribeToDraft(callback: () => void) {
  window.addEventListener(judgeScoreDraftChangedEvent, callback);
  return () => window.removeEventListener(judgeScoreDraftChangedEvent, callback);
}

export function ScoreButtonGroup({ criterionId, description, draftStorageKey, initialValue, name }: ScoreButtonGroupProps) {
  const [selectedScore, setSelectedScore] = useState(() => normalizeScore(initialValue));
  const draftScore = useSyncExternalStore(
    subscribeToDraft,
    () => (draftStorageKey ? normalizeScore(readJudgeScoreDraft(draftStorageKey).scores?.[criterionId]) : undefined),
    () => undefined,
  );
  const score = draftScore ?? selectedScore;

  function selectScore(value: number) {
    setSelectedScore(value);

    if (draftStorageKey) {
      updateJudgeScoreDraft(draftStorageKey, { scores: { [criterionId]: value } });
    }
  }

  return (
    <div className="grid gap-3 rounded-md border-2 border-[var(--line)] bg-white p-3">
      {score !== undefined ? (
        <>
          <input name="criterionId" type="hidden" value={criterionId} />
          <input name="value" type="hidden" value={score} />
        </>
      ) : null}
      <div className="grid gap-1">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-base font-black text-[var(--ink)]">{name}</p>
          {score === undefined ? (
            <span className="rounded-full border-2 border-[var(--line)] bg-white px-2.5 py-1 text-xs font-black text-[var(--ink-muted)]">
              Not scored yet
            </span>
          ) : (
            <span className="rounded-full border-2 border-[var(--line)] bg-[var(--sun)] px-2.5 py-1 text-xs font-black text-[var(--ink)]">
              {score}/10
            </span>
          )}
        </div>
        {description ? <p className="text-sm font-medium leading-6 text-[var(--ink-muted)]">{description}</p> : null}
      </div>
      <div className="grid grid-cols-6 gap-2 sm:grid-cols-11" role="group" aria-label={`${name} score`}>
        {scoreOptions.map((value) => {
          const selected = score === value;

          return (
            <button
              aria-pressed={selected}
              className={`min-h-11 rounded-md border-2 px-2 text-sm font-black transition ${
                selected
                  ? "border-[var(--ink)] bg-[var(--sun)] text-[var(--ink)]"
                  : "border-[var(--line)] bg-white text-[var(--ink-muted)] hover:bg-zinc-50 hover:text-[var(--ink)]"
              }`}
              key={value}
              onClick={() => selectScore(value)}
              type="button"
            >
              {value}
            </button>
          );
        })}
      </div>
    </div>
  );
}
