export function StatusBadge({
  label,
  tone = "neutral",
}: {
  label: string;
  tone?: "neutral" | "success" | "warning" | "danger";
}) {
  const tones = {
    neutral: "bg-white text-[var(--ink)]",
    success: "bg-[var(--mint)] text-[var(--ink)]",
    warning: "bg-[var(--sun)] text-[var(--ink)]",
    danger: "bg-[var(--coral)] text-[var(--ink)]",
  };

  return (
    <span
      className={`inline-flex rounded-full border-2 border-[var(--line)] px-2.5 py-1 text-xs font-black ${tones[tone]}`}
    >
      {label}
    </span>
  );
}
