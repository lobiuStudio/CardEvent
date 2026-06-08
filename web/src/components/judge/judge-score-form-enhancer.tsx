"use client";

import { useEffect } from "react";
import { judgeScoreDraftChangedEvent, readJudgeScoreDraft, updateJudgeScoreDraft } from "./judge-score-draft";

type JudgeScoreFormEnhancerProps = {
  clearStorageKey?: string;
  formId: string;
  saved: boolean;
  storageKey: string;
};

const leaveWarning = "You have unsaved scores. Leave this page?";

function isLocalNavigationLink(target: EventTarget | null): target is HTMLAnchorElement {
  return target instanceof Element && Boolean(target.closest("a[href]"));
}

export function JudgeScoreFormEnhancer({ clearStorageKey, formId, saved, storageKey }: JudgeScoreFormEnhancerProps) {
  useEffect(() => {
    const form = document.getElementById(formId);

    if (!(form instanceof HTMLFormElement)) {
      return;
    }

    const dirtyRef = { current: false };
    const storageKeyToClear = clearStorageKey ?? (saved ? storageKey : undefined);

    if (storageKeyToClear) {
      window.localStorage.removeItem(storageKeyToClear);
    }

    if (storageKeyToClear !== storageKey) {
      const draft = readJudgeScoreDraft(storageKey);
      const comment = form.elements.namedItem("comment");

      if (comment instanceof HTMLTextAreaElement && draft.comment) {
        comment.value = draft.comment;
        dirtyRef.current = true;
      }

      if (draft.scores && Object.keys(draft.scores).length > 0) {
        dirtyRef.current = true;
      }
    }

    function markDirty() {
      dirtyRef.current = true;
    }

    function handleInput(event: Event) {
      const target = event.target;

      if (target instanceof HTMLTextAreaElement && target.name === "comment") {
        updateJudgeScoreDraft(storageKey, { comment: target.value });
        markDirty();
      }
    }

    function handleDraftChange(event: Event) {
      if (event instanceof CustomEvent && event.detail?.storageKey === storageKey) {
        markDirty();
      }
    }

    function handleSubmit() {
      dirtyRef.current = false;
    }

    function handleBeforeUnload(event: BeforeUnloadEvent) {
      if (!dirtyRef.current) {
        return;
      }

      event.preventDefault();
    }

    function handleDocumentClick(event: MouseEvent) {
      if (!dirtyRef.current || !isLocalNavigationLink(event.target)) {
        return;
      }

      const link = event.target.closest("a[href]");

      if (!(link instanceof HTMLAnchorElement) || link.target || link.href === window.location.href) {
        return;
      }

      if (!window.confirm(leaveWarning)) {
        event.preventDefault();
      }
    }

    form.addEventListener("input", handleInput);
    form.addEventListener("submit", handleSubmit);
    window.addEventListener(judgeScoreDraftChangedEvent, handleDraftChange);
    window.addEventListener("beforeunload", handleBeforeUnload);
    document.addEventListener("click", handleDocumentClick, true);

    return () => {
      form.removeEventListener("input", handleInput);
      form.removeEventListener("submit", handleSubmit);
      window.removeEventListener(judgeScoreDraftChangedEvent, handleDraftChange);
      window.removeEventListener("beforeunload", handleBeforeUnload);
      document.removeEventListener("click", handleDocumentClick, true);
    };
  }, [clearStorageKey, formId, saved, storageKey]);

  return (
    <p className="text-xs font-bold leading-5 text-[var(--ink-muted)]">
      Drafts are saved on this device until you save scores. / 分數草稿會暫存在此裝置，直到你儲存分數。
    </p>
  );
}
