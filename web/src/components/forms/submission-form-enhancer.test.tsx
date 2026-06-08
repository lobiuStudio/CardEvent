import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { SubmissionFormEnhancer } from "./submission-form-enhancer";

describe("SubmissionFormEnhancer", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("restores saved draft fields and previews selected image names", async () => {
    const user = userEvent.setup();
    localStorage.setItem("cardevent:submission:summer-cards", JSON.stringify({ cardName: "Saved Card" }));

    render(
      <>
        <form id="submission-form">
          <input name="cardName" />
          <input name="images" type="file" multiple />
        </form>
        <SubmissionFormEnhancer formId="submission-form" storageKey="cardevent:submission:summer-cards" />
      </>,
    );

    await waitFor(() => expect(screen.getByDisplayValue("Saved Card")).toBeInTheDocument());

    await user.clear(screen.getByDisplayValue("Saved Card"));
    await user.type(screen.getByRole("textbox"), "Updated Card");

    expect(JSON.parse(localStorage.getItem("cardevent:submission:summer-cards") ?? "{}")).toMatchObject({
      cardName: "Updated Card",
    });

    await user.upload(
      document.querySelector('input[type="file"]') as HTMLInputElement,
      new File(["image"], "front.png", { type: "image/png" }),
    );

    expect(screen.getByText("front.png")).toBeInTheDocument();
  });
});
