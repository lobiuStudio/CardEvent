import { randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { hashEmailVerificationToken } from "@/lib/auth/email-verification";
import { hashPassword } from "@/lib/auth/password";
import { createSameOriginUrl, getSafeReturnPath } from "@/lib/auth/redirect";
import { getCrossSiteRequestResponse } from "@/lib/auth/request-security";
import { setSessionCookie } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { sendEmail } from "@/lib/email/email-service";
import { registrationVerificationEmail } from "@/lib/email/messages";

export const runtime = "nodejs";

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  displayName: z.string().min(1).max(80),
  returnTo: z.string().optional(),
});

async function readRequestBody(request: Request): Promise<unknown> {
  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    return request.json();
  }

  return Object.fromEntries((await request.formData()).entries());
}

function wantsJson(request: Request): boolean {
  return request.headers.get("accept")?.includes("application/json") ?? false;
}

function errorResponse(request: Request, error: string, status: number): NextResponse {
  return NextResponse.json({ error }, { status });
}

function redirectResponse(request: Request, path: string): NextResponse {
  if (wantsJson(request)) {
    return NextResponse.json({ redirectTo: path });
  }

  return NextResponse.redirect(createSameOriginUrl(request, path), { status: 303 });
}

function isUniqueConstraintError(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "P2002";
}

export async function POST(request: Request): Promise<NextResponse> {
  const crossSiteResponse = getCrossSiteRequestResponse(request);

  if (crossSiteResponse) {
    return crossSiteResponse;
  }

  const parsed = registerSchema.safeParse(await readRequestBody(request).catch(() => null));

  if (!parsed.success) {
    return errorResponse(
      request,
      "Enter a valid email, display name, and password with at least 8 characters.",
      400,
    );
  }

  const email = parsed.data.email.toLowerCase();
  const displayName = parsed.data.displayName.trim();

  if (!displayName) {
    return errorResponse(request, "Display name is required.", 400);
  }

  const duplicateUser = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });

  if (duplicateUser) {
    return errorResponse(request, "An account with this email already exists.", 409);
  }

  const passwordHash = await hashPassword(parsed.data.password);
  const rawToken = randomBytes(32).toString("base64url");
  const tokenHash = hashEmailVerificationToken(rawToken);
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

  try {
    const user = await prisma.$transaction(async (tx) => {
      const createdUser = await tx.user.create({
        data: {
          email,
          passwordHash,
          displayName,
        },
      });

      await tx.userRole.create({
        data: {
          userId: createdUser.id,
          role: "participant",
        },
      });

      await tx.emailVerificationToken.create({
        data: {
          userId: createdUser.id,
          tokenHash,
          expiresAt,
        },
      });

      return createdUser;
    });

    const verificationUrl = createSameOriginUrl(request, `/account/verify-email/${rawToken}`).toString();
    await sendEmail(registrationVerificationEmail({ to: email, verifyUrl: verificationUrl }));

    await setSessionCookie(user.id);

    return redirectResponse(request, getSafeReturnPath(parsed.data.returnTo) ?? "/activities");
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return errorResponse(request, "An account with this email already exists.", 409);
    }

    throw error;
  }
}
