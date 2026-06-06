import { afterEach, describe, expect, it, vi } from "vitest";
import { sendEmail, type EmailMessage } from "./email-service";

const message: EmailMessage = {
  to: "participant@example.com",
  subject: "Subject",
  text: "Body",
};

describe("sendEmail", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns false and logs when delivery fails", async () => {
    const error = new Error("SMTP unavailable");
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(
      sendEmail(message, {
        async send() {
          throw error;
        },
      }),
    ).resolves.toBe(false);
    expect(consoleError).toHaveBeenCalledWith("Failed to send email", error);
  });
});
