import type { ReactNode } from "react";

type FormFieldRenderProps = {
  id: string;
  describedBy?: string;
  invalid: boolean;
};

export function FormField({
  id,
  label,
  hint,
  error,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  children: (field: FormFieldRenderProps) => ReactNode;
}) {
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;
  const invalid = Boolean(error);

  return (
    <div className="grid gap-1.5 text-sm font-bold text-[var(--ink)]">
      <label htmlFor={id}>{label}</label>
      {children({ id, describedBy, invalid })}
      {hint ? (
        <span id={hintId} className="text-xs font-medium leading-5 text-[var(--ink-muted)]">
          {hint}
        </span>
      ) : null}
      {error ? (
        <span id={errorId} className="text-xs font-normal text-red-600">
          {error}
        </span>
      ) : null}
    </div>
  );
}
