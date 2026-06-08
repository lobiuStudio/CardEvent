"use client";

import { useState } from "react";

type ScoreButtonGroupProps = {
  criterionId: string;
  description?: string | null;
  initialValue?: number;
  name: string;
};

const scoreOptions = Array.from({ length: 11 }, (_, index) => index);

function normalizeScore(value: number | undefined): number {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return 0;
  }

  return Math.min(10, Math.max(0, Math.round(value)));
}

export function ScoreButtonGroup({ criterionId, description, initialValue, name }: ScoreButtonGroupProps) {
  const [score, setScore] = useState(() => normalizeScore(initialValue));

  return (
    <div className="grid gap-3 rounded-md border-2 border-[var(--line)] bg-white p-3">
      <input name="criterionId" type="hidden" value={criterionId} />
      <input name="value" type="hidden" value={score} />
      <div className="grid gap-1">
        <p className="text-base font-black text-[var(--ink)]">{name}</p>
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
              onClick={() => setScore(value)}
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
