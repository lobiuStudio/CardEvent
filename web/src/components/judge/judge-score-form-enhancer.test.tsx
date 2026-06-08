import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { JudgeScoreFormEnhancer } from "./judge-score-form-enhancer";

describe("JudgeScoreFormEnhancer", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it("restores comment drafts and warns before leaving with unsaved changes", async () => {
    const user = userEvent.setup();
    localStorage.setItem("cardevent:judge-score:submission-1", JSON.stringify({ comment: "Saved draft" }));
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);

    render(
      <>
        <form id="score-form">
          <textarea aria-label="Overall comment" name="comment" />
        </form>
        <a href="/judge">Back to judge dashboard</a>
        <JudgeScoreFormEnhancer formId="score-form" saved={false} storageKey="cardevent:judge-score:submission-1" />
      </>,
    );

    await waitFor(() => expect(screen.getByLabelText("Overall comment")).toHaveValue("Saved draft"));

    await user.clear(screen.getByLabelText("Overall comment"));
    await user.type(screen.getByLabelText("Overall comment"), "Updated draft");

    expect(JSON.parse(localStorage.getItem("cardevent:judge-score:submission-1") ?? "{}")).toMatchObject({
      comment: "Updated draft",
    });

    const beforeUnloadEvent = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(beforeUnloadEvent);

    expect(beforeUnloadEvent.defaultPrevented).toBe(true);
    expect(fireEvent.click(screen.getByRole("link", { name: "Back to judge dashboard" }))).toBe(false);
    expect(confirm).toHaveBeenCalledWith("You have unsaved scores. Leave this page?");
  });

  it("clears saved drafts after scores are saved", () => {
    localStorage.setItem("cardevent:judge-score:submission-1", JSON.stringify({ comment: "Saved draft" }));

    render(
      <>
        <form id="score-form" />
        <JudgeScoreFormEnhancer formId="score-form" saved storageKey="cardevent:judge-score:submission-1" />
      </>,
    );

    expect(localStorage.getItem("cardevent:judge-score:submission-1")).toBeNull();
  });
});
