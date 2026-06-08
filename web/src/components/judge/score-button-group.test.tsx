import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { ScoreButtonGroup } from "./score-button-group";

describe("ScoreButtonGroup", () => {
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
});
