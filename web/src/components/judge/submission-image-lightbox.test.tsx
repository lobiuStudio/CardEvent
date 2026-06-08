import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { SubmissionImageLightbox } from "./submission-image-lightbox";

describe("SubmissionImageLightbox", () => {
  it("opens submission images in a dismissible popup instead of navigating away", async () => {
    const user = userEvent.setup();

    const { container } = render(
      <SubmissionImageLightbox
        images={[
          {
            id: "image-1",
            originalName: "front.png",
            publicUrl: "/uploads/front.png",
          },
        ]}
      />,
    );

    expect(container.querySelector('a[href="/uploads/front.png"]')).toBeNull();

    await user.click(screen.getByRole("button", { name: /Open front.png/ }));

    const dialog = screen.getByRole("dialog", { name: "front.png" });

    expect(dialog).toBeInTheDocument();
    expect(within(dialog).getByRole("img", { name: "front.png" })).toHaveAttribute("src", "/uploads/front.png");

    await user.click(screen.getByRole("button", { name: "Close image" }));

    expect(screen.queryByRole("dialog", { name: "front.png" })).not.toBeInTheDocument();
  });
});
