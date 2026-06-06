import type { BilingualCopy } from "@/lib/i18n/bilingual";

type BilingualTextProps = BilingualCopy & {
  className?: string;
  enClassName?: string;
  zhClassName?: string;
};

export function BilingualText({ className, en, enClassName, zh, zhClassName }: BilingualTextProps) {
  return (
    <span className={className}>
      <span className={enClassName}>{en}</span>
      <span aria-hidden="true"> / </span>
      <span className={zhClassName} lang="zh-HK">
        {zh}
      </span>
    </span>
  );
}
