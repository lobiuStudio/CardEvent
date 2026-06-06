import type { ReactNode } from "react";

export function BottomActionBar({ children }: { children: ReactNode }) {
  return (
    <div className="safe-bottom sticky bottom-0 z-20 border-t border-zinc-200 bg-white/95 px-4 pt-3 backdrop-blur">
      <div className="mx-auto flex max-w-xl gap-2">{children}</div>
    </div>
  );
}
