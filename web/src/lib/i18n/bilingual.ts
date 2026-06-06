export type BilingualCopy = {
  en: string;
  zh: string;
};

export function bilingualLabel(copy: BilingualCopy): string {
  return `${copy.en} / ${copy.zh}`;
}

export function formatBilingualDate(date: Date, style: "medium" | "full" = "medium"): string {
  const options: Intl.DateTimeFormatOptions =
    style === "full" ? { dateStyle: "full", timeStyle: "short" } : { dateStyle: "medium", timeStyle: "short" };

  const english = new Intl.DateTimeFormat("en-HK", options).format(date);
  const chinese = new Intl.DateTimeFormat("zh-HK", options).format(date);

  return `${english} / ${chinese}`;
}
