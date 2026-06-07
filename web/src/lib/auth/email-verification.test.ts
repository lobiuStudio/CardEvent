import { describe, expect, it, vi } from "vitest";
import { consumeEmailVerificationToken, hashEmailVerificationToken } from "./email-verification";

function createVerificationStore({
  expiresAt,
  rawToken = "raw-token",
  usedAt = null,
}: {
  expiresAt: Date;
  rawToken?: string;
  usedAt?: Date | null;
}) {
  let tokenRecord = {
    id: "token_1",
    userId: "user_1",
    tokenHash: hashEmailVerificationToken(rawToken),
    expiresAt,
    usedAt,
  };

  const store = {
    emailVerificationToken: {
      findUnique: vi.fn(async () => tokenRecord),
      updateMany: vi.fn(async ({ data, where }) => {
        if (
          tokenRecord.tokenHash === where.tokenHash &&
          tokenRecord.usedAt === null &&
          tokenRecord.expiresAt > where.expiresAt.gt
        ) {
          tokenRecord = {
            ...tokenRecord,
            usedAt: data.usedAt,
          };
          return { count: 1 };
        }

        return { count: 0 };
      }),
    },
    user: {
      update: vi.fn(async () => ({})),
    },
  };

  return {
    store,
  };
}

describe("email verification helpers", () => {
  it("consumes a verification token only once", async () => {
    const now = new Date("2026-06-06T10:00:00.000Z");
    const { store } = createVerificationStore({
      expiresAt: new Date("2026-06-06T11:00:00.000Z"),
    });

    await expect(consumeEmailVerificationToken("raw-token", store, now)).resolves.toMatchObject({
      status: "success",
    });
    await expect(consumeEmailVerificationToken("raw-token", store, now)).resolves.toMatchObject({
      status: "error",
      title: "Verification link already used",
    });
    expect(store.user.update).toHaveBeenCalledTimes(1);
  });

  it("does not consume or verify an expired token", async () => {
    const now = new Date("2026-06-06T10:00:00.000Z");
    const { store } = createVerificationStore({
      expiresAt: new Date("2026-06-06T09:59:59.000Z"),
    });

    await expect(consumeEmailVerificationToken("raw-token", store, now)).resolves.toMatchObject({
      status: "error",
      title: "Verification link expired",
    });
    expect(store.emailVerificationToken.updateMany).toHaveBeenCalledTimes(1);
    expect(store.user.update).not.toHaveBeenCalled();
  });
});
