// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

const mocks = vi.hoisted(() => ({
  getCrossSiteRequestResponse: vi.fn(),
  hashPassword: vi.fn(),
  hasRole: vi.fn(),
  readSessionUser: vi.fn(),
  transaction: vi.fn(),
  userCreate: vi.fn(),
  userDelete: vi.fn(),
  userFindUnique: vi.fn(),
  userRoleCreate: vi.fn(),
}));

vi.mock("@/lib/auth/password", () => ({
  hashPassword: mocks.hashPassword,
}));

vi.mock("@/lib/auth/rbac", () => ({
  hasRole: mocks.hasRole,
}));

vi.mock("@/lib/auth/request-security", () => ({
  getCrossSiteRequestResponse: mocks.getCrossSiteRequestResponse,
}));

vi.mock("@/lib/auth/session", () => ({
  readSessionUser: mocks.readSessionUser,
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    $transaction: mocks.transaction,
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

function createAdminUserRequest(): Request {
  return new Request("https://cardevent.test/api/admin/users", {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      origin: "https://cardevent.test",
    },
    body: JSON.stringify({
      email: "ADMIN-CREATED@example.test",
      password: "password123",
      displayName: "Created User",
      role: "participant",
    }),
  });
}

describe("admin user route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCrossSiteRequestResponse.mockReturnValue(null);
    mocks.hashPassword.mockResolvedValue("password-hash");
    mocks.hasRole.mockReturnValue(true);
    mocks.readSessionUser.mockResolvedValue({ id: "admin-1", roles: ["admin"] });
    mocks.userFindUnique.mockResolvedValue(null);
    mocks.userCreate.mockResolvedValue({ id: "user-1" });
    mocks.userDelete.mockResolvedValue({});
    mocks.transaction.mockImplementation(async (callback) =>
      callback({
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
    mocks.userRoleCreate.mockRejectedValue(new Error("role failed"));

    await expect(POST(createAdminUserRequest())).rejects.toThrow("role failed");

    expect(mocks.transaction).not.toHaveBeenCalled();
    expect(mocks.userDelete).toHaveBeenCalledWith({ where: { id: "user-1" } });
  });
});
