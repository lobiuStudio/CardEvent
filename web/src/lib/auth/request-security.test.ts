import { describe, expect, it } from "vitest";
import { getCrossSiteRequestResponse, isSameOriginRequest } from "./request-security";

describe("request security helpers", () => {
  it("allows same-origin browser POST requests", () => {
    const request = new Request("https://cardevent.test/api/auth/login", {
      method: "POST",
      headers: {
        origin: "https://cardevent.test",
        "sec-fetch-site": "same-origin",
      },
    });

    expect(isSameOriginRequest(request)).toBe(true);
    expect(getCrossSiteRequestResponse(request)).toBeNull();
  });

  it("allows same-origin browser requests when the framework canonicalizes request.url differently from Host", () => {
    const request = new Request("http://localhost:3000/api/judge/scores", {
      method: "POST",
      headers: {
        host: "127.0.0.1:3000",
        origin: "http://127.0.0.1:3000",
      },
    });

    expect(isSameOriginRequest(request)).toBe(true);
    expect(getCrossSiteRequestResponse(request)).toBeNull();
  });

  it("allows server and test POST requests without browser origin headers", () => {
    const request = new Request("https://cardevent.test/api/auth/login", {
      method: "POST",
    });

    expect(isSameOriginRequest(request)).toBe(true);
    expect(getCrossSiteRequestResponse(request)).toBeNull();
  });

  it("rejects cross-site browser POST requests by origin", () => {
    const request = new Request("https://cardevent.test/api/auth/login", {
      method: "POST",
      headers: {
        origin: "https://evil.example",
      },
    });

    expect(isSameOriginRequest(request)).toBe(false);
    expect(getCrossSiteRequestResponse(request)?.status).toBe(403);
  });

  it("rejects cross-site browser POST requests by fetch metadata", () => {
    const request = new Request("https://cardevent.test/api/auth/login", {
      method: "POST",
      headers: {
        "sec-fetch-site": "cross-site",
      },
    });

    expect(isSameOriginRequest(request)).toBe(false);
    expect(getCrossSiteRequestResponse(request)?.status).toBe(403);
  });
});
