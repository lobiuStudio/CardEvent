// @vitest-environment node

import { clearSessionCookie } from "@/lib/auth/session";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET, POST } from "./route";

vi.mock("@/lib/auth/session", () => ({
  clearSessionCookie: vi.fn(),
}));

describe("logout route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("clears the session on GET for manual sign-out links", async () => {
    const response = await GET(new Request("https://cardevent.test/account/logout"));

    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("https://cardevent.test/account/login");
    expect(clearSessionCookie).toHaveBeenCalledOnce();
  });

  it("clears the session on POST", async () => {
    const response = await POST(
      new Request("https://cardevent.test/account/logout", {
        method: "POST",
        headers: {
          origin: "https://cardevent.test",
        },
      }),
    );

    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("https://cardevent.test/account/login");
    expect(clearSessionCookie).toHaveBeenCalledOnce();
  });

  it("rejects cross-site POST requests before clearing the session", async () => {
    const response = await POST(
      new Request("https://cardevent.test/account/logout", {
        method: "POST",
        headers: {
          origin: "https://evil.example",
        },
      }),
    );

    expect(response.status).toBe(403);
    expect(clearSessionCookie).not.toHaveBeenCalled();
  });
});
