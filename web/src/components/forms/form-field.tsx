import type { ReactNode } from "react";

export function FormField({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <label className="grid gap-1.5 text-sm font-medium text-zinc-900">
      <span>{label}</span>
      {children}
      {hint ? <span className="text-xs font-normal text-zinc-500">{hint}</span> : null}
      {error ? <span className="text-xs font-normal text-red-600">{error}</span> : null}
    </label>
  );
}
