// @vitest-environment node

import { describe, expect, it } from "vitest";
import { POST as createActivity } from "../admin/activities/route";
import { POST as createAdminUser } from "../admin/users/route";
import { POST as login } from "./login/route";
import { POST as register } from "./register/route";

function crossSitePost(path: string): Request {
  return new Request(`https://cardevent.test${path}`, {
    method: "POST",
    headers: {
      origin: "https://evil.example",
    },
  });
}

describe("auth route request security", () => {
  it.each([
    ["/api/auth/login", login],
    ["/api/auth/register", register],
    ["/api/admin/activities", createActivity],
    ["/api/admin/users", createAdminUser],
  ])("rejects cross-site POST requests to %s", async (path, handler) => {
    const response = await handler(crossSitePost(path));

    expect(response.status).toBe(403);
  });
});
