import { createHash } from "crypto";
import { prisma } from "@/lib/db/prisma";

export type EmailVerificationState =
  | {
      status: "success";
      title: string;
      message: string;
    }
  | {
      status: "error";
      title: string;
      message: string;
    };

export type EmailVerificationTokenRecord = {
  id: string;
  userId: string;
  expiresAt: Date;
  usedAt: Date | null;
};

export type EmailVerificationTransaction = {
  emailVerificationToken: {
    findUnique(args: {
      where: {
        tokenHash: string;
      };
      select: {
        id: true;
        userId: true;
        expiresAt: true;
        usedAt: true;
      };
    }): Promise<EmailVerificationTokenRecord | null>;
    updateMany(args: {
      where: {
        tokenHash: string;
        usedAt: null;
        expiresAt: {
          gt: Date;
        };
      };
      data: {
        usedAt: Date;
      };
    }): Promise<{
      count: number;
    }>;
  };
  user: {
    update(args: {
      where: {
        id: string;
      };
      data: {
        emailVerifiedAt: Date;
      };
    }): Promise<unknown>;
  };
};

export type EmailVerificationStore = EmailVerificationTransaction;

export function hashEmailVerificationToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function invalidState(): EmailVerificationState {
  return {
    status: "error",
    title: "Verification link invalid",
    message: "This verification link does not match an active account verification request.",
  };
}

function usedState(): EmailVerificationState {
  return {
    status: "error",
    title: "Verification link already used",
    message: "This email verification link has already been used.",
  };
}

function expiredState(): EmailVerificationState {
  return {
    status: "error",
    title: "Verification link expired",
    message: "This email verification link has expired.",
  };
}

function classifyFailedConsume(
  token: EmailVerificationTokenRecord | null,
  now: Date,
): EmailVerificationState {
  if (!token) {
    return invalidState();
  }

  if (token.usedAt) {
    return usedState();
  }

  if (token.expiresAt <= now) {
    return expiredState();
  }

  return usedState();
}

async function findToken(
  tokenHash: string,
  store: EmailVerificationTransaction,
): Promise<EmailVerificationTokenRecord | null> {
  return store.emailVerificationToken.findUnique({
    where: { tokenHash },
    select: {
      id: true,
      userId: true,
      expiresAt: true,
      usedAt: true,
    },
  });
}

export async function consumeEmailVerificationToken(
  rawToken: string | undefined,
  store: EmailVerificationStore = prisma,
  now = new Date(),
): Promise<EmailVerificationState> {
  if (!rawToken) {
    return {
      status: "error",
      title: "Verification token missing",
      message: "This verification link is missing a token.",
    };
  }

  const tokenHash = hashEmailVerificationToken(rawToken);
  const token = await findToken(tokenHash, store);

  if (!token) {
    return invalidState();
  }

  const consumed = await store.emailVerificationToken.updateMany({
    where: {
      tokenHash,
      usedAt: null,
      expiresAt: {
        gt: now,
      },
    },
    data: {
      usedAt: now,
    },
  });

  if (consumed.count !== 1) {
    const currentToken = await findToken(tokenHash, store);
    return classifyFailedConsume(currentToken, now);
  }

  await store.user.update({
    where: { id: token.userId },
    data: { emailVerifiedAt: now },
  });

  return {
    status: "success",
    title: "Email verified",
    message: "Your email address has been verified.",
  };
}
