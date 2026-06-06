import { SignJWT, jwtVerify, type JWTPayload } from "jose";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db/prisma";

const cookieName = "cardevent_session";

export type SessionUser = {
  id: string;
  email: string;
  displayName: string;
  roles: string[];
};

export type SessionUserRecord = {
  id: string;
  email: string;
  displayName: string;
  roles: {
    role: string;
  }[];
};

export type SessionUserLookup = (userId: string) => Promise<SessionUserRecord | null>;

function getSecret(): Uint8Array {
  const secret = process.env.SESSION_SECRET;

  if (!secret || secret.length < 32) {
    throw new Error("SESSION_SECRET must be at least 32 characters");
  }

  return new TextEncoder().encode(secret);
}

function readUserIdFromPayload(payload: JWTPayload): string | null {
  if (typeof payload.sub === "string" && payload.sub) {
    return payload.sub;
  }

  if (typeof payload.id === "string" && payload.id) {
    return payload.id;
  }

  return null;
}

async function findSessionUser(userId: string): Promise<SessionUserRecord | null> {
  return prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      displayName: true,
      roles: {
        select: {
          role: true,
        },
      },
    },
  });
}

function toSessionUser(user: SessionUserRecord): SessionUser {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    roles: user.roles.map(({ role }) => role),
  };
}

export async function createSessionToken(userId: string): Promise<string> {
  return new SignJWT({ userId })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(getSecret());
}

export async function resolveSessionUser(
  token: string | undefined,
  lookup: SessionUserLookup = findSessionUser,
): Promise<SessionUser | null> {
  if (!token) {
    return null;
  }

  try {
    const verified = await jwtVerify(token, getSecret());
    const userId = readUserIdFromPayload(verified.payload);

    if (!userId) {
      return null;
    }

    const user = await lookup(userId);

    if (!user) {
      return null;
    }

    return toSessionUser(user);
  } catch {
    return null;
  }
}

export async function readSessionUser(): Promise<SessionUser | null> {
  const token = (await cookies()).get(cookieName)?.value;
  return resolveSessionUser(token);
}

export async function setSessionCookie(userId: string): Promise<void> {
  const token = await createSessionToken(userId);

  (await cookies()).set(cookieName, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });
}

export async function clearSessionCookie(): Promise<void> {
  (await cookies()).delete(cookieName);
}
