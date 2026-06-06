import { describe, expect, it } from "vitest";
import { createSameOriginUrl, getSafeReturnPath } from "./redirect";

describe("getSafeReturnPath", () => {
  it("accepts internal absolute paths", () => {
    expect(getSafeReturnPath("/judge/invite/raw-token")).toBe("/judge/invite/raw-token");
    expect(getSafeReturnPath("/judge/invite/raw-token?from=login")).toBe("/judge/invite/raw-token?from=login");
  });

  it("rejects external, protocol-relative, blank, and non-string values", () => {
    expect(getSafeReturnPath("https://example.com")).toBeNull();
    expect(getSafeReturnPath("//example.com/path")).toBeNull();
    expect(getSafeReturnPath("")).toBeNull();
    expect(getSafeReturnPath(null)).toBeNull();
  });
});

describe("createSameOriginUrl", () => {
  it("uses the request Host header when it differs from request.url", () => {
    const request = new Request("http://localhost:3000/api/judge/scores", {
      headers: {
        host: "127.0.0.1:3000",
      },
    });

    expect(createSameOriginUrl(request, "/judge?saved=1").toString()).toBe("http://127.0.0.1:3000/judge?saved=1");
  });
});
