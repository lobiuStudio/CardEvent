import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { ScoreButtonGroup } from "./score-button-group";

describe("ScoreButtonGroup", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("lets judges pick an integer score with one-tap buttons", async () => {
    const user = userEvent.setup();

    render(
      <ScoreButtonGroup
        criterionId="creativity"
        description="Originality and visual idea."
        initialValue={4}
        name="Creativity"
      />,
    );

    expect(screen.getByDisplayValue("creativity")).toHaveAttribute("name", "criterionId");
    expect(screen.getByDisplayValue("4")).toHaveAttribute("name", "value");
    expect(screen.getAllByRole("button")).toHaveLength(11);
    expect(screen.getByRole("button", { name: "4" })).toHaveAttribute("aria-pressed", "true");

    await user.click(screen.getByRole("button", { name: "8" }));

    expect(screen.getByDisplayValue("8")).toHaveAttribute("name", "value");
    expect(screen.getByRole("button", { name: "4" })).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByRole("button", { name: "8" })).toHaveAttribute("aria-pressed", "true");
  });

  it("does not default an unscored criterion to zero", () => {
    render(<ScoreButtonGroup criterionId="creativity" name="Creativity" />);

    expect(screen.getByText("Not scored yet")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "0" })).toHaveAttribute("aria-pressed", "false");
    expect(screen.queryByDisplayValue("creativity")).not.toBeInTheDocument();
    expect(screen.queryByDisplayValue("0")).not.toBeInTheDocument();
  });

  it("restores and saves local score drafts", async () => {
    const user = userEvent.setup();
    localStorage.setItem("cardevent:judge-score:submission-1", JSON.stringify({ scores: { creativity: 6 } }));

    render(<ScoreButtonGroup criterionId="creativity" draftStorageKey="cardevent:judge-score:submission-1" name="Creativity" />);

    await waitFor(() => expect(screen.getByRole("button", { name: "6" })).toHaveAttribute("aria-pressed", "true"));
    expect(screen.getByDisplayValue("6")).toHaveAttribute("name", "value");

    await user.click(screen.getByRole("button", { name: "9" }));

    expect(JSON.parse(localStorage.getItem("cardevent:judge-score:submission-1") ?? "{}")).toMatchObject({
      scores: { creativity: 9 },
    });
  });
});
