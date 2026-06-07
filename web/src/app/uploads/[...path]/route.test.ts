import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";

const readFile = vi.fn();

vi.mock("@/lib/files/storage-provider", () => ({
  getFileStorage: () => ({
    readFile,
  }),
}));

describe("uploads route", () => {
  beforeEach(() => {
    readFile.mockReset();
  });

  it("serves upload files through the configured storage provider", async () => {
    readFile.mockResolvedValue({
      body: "image-bytes",
      mimeType: "image/png",
      fileSize: 11,
    });

    const response = await GET(new Request("http://example.test/uploads/submissions/card.png"), {
      params: Promise.resolve({ path: ["submissions", "card.png"] }),
    });

    expect(readFile).toHaveBeenCalledWith("submissions/card.png");
    expect(response.status).toBe(200);
    await expect(response.text()).resolves.toBe("image-bytes");
    expect(response.headers.get("Cache-Control")).toBe("public, max-age=31536000, immutable");
    expect(response.headers.get("Content-Type")).toBe("image/png");
    expect(response.headers.get("Content-Length")).toBe("11");
  });

  it("returns not found when storage provider has no file", async () => {
    readFile.mockResolvedValue(null);

    const response = await GET(new Request("http://example.test/uploads/missing.png"), {
      params: Promise.resolve({ path: ["missing.png"] }),
    });

    expect(readFile).toHaveBeenCalledWith("missing.png");
    expect(response.status).toBe(404);
    await expect(response.text()).resolves.toBe("Not found");
  });
});
