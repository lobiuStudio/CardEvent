// @vitest-environment node

import { jwtVerify } from "jose";
import { beforeEach, describe, expect, it } from "vitest";
import { hasRole } from "./rbac";
import { createSessionToken, resolveSessionUser } from "./session";

const sessionSecret = "test-session-secret-with-at-least-32-chars";

describe("session helpers", () => {
  beforeEach(() => {
    process.env.SESSION_SECRET = sessionSecret;
  });

  it("stores only a stable user id in the session token", async () => {
    const token = await createSessionToken("user_1");
    const verified = await jwtVerify(token, new TextEncoder().encode(sessionSecret));

    expect(verified.payload.sub).toBe("user_1");
    expect(verified.payload).not.toHaveProperty("email");
    expect(verified.payload).not.toHaveProperty("displayName");
    expect(verified.payload).not.toHaveProperty("roles");
  });

  it("loads current roles from the database before authorizing admin access", async () => {
    const token = await createSessionToken("user_1");
    const user = await resolveSessionUser(token, async () => ({
      id: "user_1",
      email: "admin@example.com",
      displayName: "Former Admin",
      roles: [{ role: "participant" }],
    }));

    expect(user?.roles).toEqual(["participant"]);
    expect(hasRole(user, "admin")).toBe(false);
  });

  it("does not authorize a session when the user has been deleted", async () => {
    const token = await createSessionToken("deleted_user");
    const user = await resolveSessionUser(token, async () => null);

    expect(user).toBeNull();
    expect(hasRole(user, "admin")).toBe(false);
  });
});
