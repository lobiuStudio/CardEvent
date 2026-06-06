import { describe, expect, it } from "vitest";
import { maxSubmissionImageBytes, readValidatedImageFile, submissionInputSchema, validateImageFile } from "./submission";

const validImageBytes = {
  jpeg: new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01]),
  png: new Uint8Array(
    Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=",
      "base64",
    ),
  ),
  webp: new Uint8Array([
    0x52, 0x49, 0x46, 0x46, 0x08, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50, 0x56, 0x50, 0x38, 0x20,
  ]),
};

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
  it.each([
    { bytes: validImageBytes.jpeg, extension: "jpg", mimeType: "image/jpeg" },
    { bytes: validImageBytes.png, extension: "png", mimeType: "image/png" },
    { bytes: validImageBytes.webp, extension: "webp", mimeType: "image/webp" },
  ] as const)("accepts detected $mimeType images", async ({ bytes, extension, mimeType }) => {
    await expect(validateImageFile(new File([bytes], "card", { type: "application/octet-stream" }))).resolves.toBe(
      undefined,
    );

    await expect(readValidatedImageFile(new File([bytes], "card", { type: "application/octet-stream" }))).resolves
      .toMatchObject({
        extension,
        mimeType,
      });
  });

  it("rejects unsupported file types", async () => {
    await expect(validateImageFile(new File(["pdf"], "card.pdf", { type: "application/pdf" }))).rejects.toThrow(
      "Upload JPG, PNG, or WebP images only.",
    );
  });

  it("rejects fake image MIME types with arbitrary bytes", async () => {
    await expect(validateImageFile(new File(["not a real png"], "card.png", { type: "image/png" }))).rejects.toThrow(
      "Upload JPG, PNG, or WebP images only.",
    );
  });

  it("rejects empty image files", async () => {
    await expect(validateImageFile(new File([], "empty.png", { type: "image/png" }))).rejects.toThrow(
      "Image files cannot be empty.",
    );
  });

  it("rejects images larger than 10 MB", async () => {
    const file = new File([new Uint8Array(maxSubmissionImageBytes + 1)], "card.png", { type: "image/png" });

    await expect(validateImageFile(file)).rejects.toThrow("Each image must be 10 MB or smaller.");
  });
});
