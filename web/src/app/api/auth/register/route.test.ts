// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

const mocks = vi.hoisted(() => ({
  emailVerificationTokenCreate: vi.fn(),
  getCrossSiteRequestResponse: vi.fn(),
  hashEmailVerificationToken: vi.fn(),
  hashPassword: vi.fn(),
  sendEmail: vi.fn(),
  setSessionCookie: vi.fn(),
  transaction: vi.fn(),
  userCreate: vi.fn(),
  userDelete: vi.fn(),
  userFindUnique: vi.fn(),
  userRoleCreate: vi.fn(),
}));

vi.mock("@/lib/auth/email-verification", () => ({
  hashEmailVerificationToken: mocks.hashEmailVerificationToken,
}));

vi.mock("@/lib/auth/password", () => ({
  hashPassword: mocks.hashPassword,
}));

vi.mock("@/lib/auth/request-security", () => ({
  getCrossSiteRequestResponse: mocks.getCrossSiteRequestResponse,
}));

vi.mock("@/lib/auth/session", () => ({
  setSessionCookie: mocks.setSessionCookie,
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    $transaction: mocks.transaction,
    emailVerificationToken: {
      create: mocks.emailVerificationTokenCreate,
    },
    user: {
      create: mocks.userCreate,
      delete: mocks.userDelete,
      findUnique: mocks.userFindUnique,
    },
    userRole: {
      create: mocks.userRoleCreate,
    },
  },
}));

vi.mock("@/lib/email/email-service", () => ({
  sendEmail: mocks.sendEmail,
}));

vi.mock("@/lib/email/messages", () => ({
  registrationVerificationEmail: vi.fn(() => ({ to: "new@example.test" })),
}));

function createRegisterRequest(): Request {
  return new Request("https://cardevent.test/api/auth/register", {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      origin: "https://cardevent.test",
    },
    body: JSON.stringify({
      email: "NEW@example.test",
      password: "password123",
      displayName: "New User",
    }),
  });
}

describe("registration route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCrossSiteRequestResponse.mockReturnValue(null);
    mocks.hashEmailVerificationToken.mockReturnValue("token-hash");
    mocks.hashPassword.mockResolvedValue("password-hash");
    mocks.userFindUnique.mockResolvedValue(null);
    mocks.userCreate.mockResolvedValue({ id: "user-1" });
    mocks.userRoleCreate.mockResolvedValue({});
    mocks.userDelete.mockResolvedValue({});
    mocks.transaction.mockImplementation(async (callback) =>
      callback({
        emailVerificationToken: {
          create: mocks.emailVerificationTokenCreate,
        },
        user: {
          create: mocks.userCreate,
        },
        userRole: {
          create: mocks.userRoleCreate,
        },
      }),
    );
  });

  it("cleans up a partially created user without relying on a transaction", async () => {
    mocks.emailVerificationTokenCreate.mockRejectedValue(new Error("token failed"));

    await expect(POST(createRegisterRequest())).rejects.toThrow("token failed");

    expect(mocks.transaction).not.toHaveBeenCalled();
    expect(mocks.userDelete).toHaveBeenCalledWith({ where: { id: "user-1" } });
    expect(mocks.setSessionCookie).not.toHaveBeenCalled();
    expect(mocks.sendEmail).not.toHaveBeenCalled();
  });
});
