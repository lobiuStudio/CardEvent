import { describe, expect, it } from "vitest";
import { maxSubmissionImageBytes, submissionInputSchema, validateImageFile } from "./submission";

describe("submissionInputSchema", () => {
  it("trims submitted text fields and converts empty optional fields to undefined", () => {
    const parsed = submissionInputSchema.parse({
      cardName: "  Moonlit Knight  ",
      gameOrSeries: "  Card Quest  ",
      characterOrType: "   ",
      description: "",
      authorDisplayName: "  Lau  ",
      groupId: "  group-1  ",
    });

    expect(parsed).toEqual({
      cardName: "Moonlit Knight",
      gameOrSeries: "Card Quest",
      characterOrType: undefined,
      description: undefined,
      authorDisplayName: "Lau",
      groupId: "group-1",
    });
  });

  it("rejects an empty trimmed card name", () => {
    const parsed = submissionInputSchema.safeParse({
      cardName: "   ",
    });

    expect(parsed.success).toBe(false);
    expect(parsed.error?.issues[0]?.message).toBe("Card name is required.");
  });
});

describe("validateImageFile", () => {
  it.each(["image/jpeg", "image/png", "image/webp"])("accepts %s images", (type) => {
    expect(() => validateImageFile(new File(["image"], "card", { type }))).not.toThrow();
  });

  it("rejects unsupported file types", () => {
    expect(() => validateImageFile(new File(["pdf"], "card.pdf", { type: "application/pdf" }))).toThrow(
      "Upload JPG, PNG, or WebP images only.",
    );
  });

  it("rejects images larger than 10 MB", () => {
    const file = new File([new Uint8Array(maxSubmissionImageBytes + 1)], "card.png", { type: "image/png" });

    expect(() => validateImageFile(file)).toThrow("Each image must be 10 MB or smaller.");
  });
});
