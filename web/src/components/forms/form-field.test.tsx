import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { FormField } from "./form-field";

describe("FormField", () => {
  it("links label, hint, and error ids through render props", () => {
    render(
      <FormField id="card-name" label="Card name" hint="Use the printed name" error="Name is required">
        {({ id, describedBy, invalid }) => (
          <input id={id} aria-describedby={describedBy} aria-invalid={invalid} />
        )}
      </FormField>,
    );

    const input = screen.getByLabelText("Card name");

    expect(input).toHaveAttribute("id", "card-name");
    expect(input).toHaveAttribute("aria-describedby", "card-name-hint card-name-error");
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByText("Use the printed name")).toHaveAttribute("id", "card-name-hint");
    expect(screen.getByText("Name is required")).toHaveAttribute("id", "card-name-error");
  });
});
