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
          {
            id: "image-2",
            originalName: "back.png",
            publicUrl: "/uploads/back.png",
          },
        ]}
      />,
    );

    expect(container.querySelector('a[href="/uploads/front.png"]')).toBeNull();

    await user.click(screen.getByRole("button", { name: /Open front.png/ }));

    const dialog = screen.getByRole("dialog", { name: "front.png" });

    expect(dialog).toBeInTheDocument();
    expect(within(dialog).getByRole("img", { name: "front.png" })).toHaveAttribute("src", "/uploads/front.png");
    expect(within(dialog).getByText("1 / 2")).toBeInTheDocument();

    await user.click(within(dialog).getByRole("button", { name: "Next image" }));

    expect(screen.getByRole("dialog", { name: "back.png" })).toBeInTheDocument();
    expect(screen.getByText("2 / 2")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Zoom in" }));

    expect(screen.getByText("125%")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Close image" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
