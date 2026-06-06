import { NextResponse } from "next/server";
import { z } from "zod";
import { hashPassword } from "@/lib/auth/password";
import { createSameOriginUrl } from "@/lib/auth/redirect";
import { hasRole } from "@/lib/auth/rbac";
import { getCrossSiteRequestResponse } from "@/lib/auth/request-security";
import { readSessionUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";

export const runtime = "nodejs";

const adminUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  displayName: z.string().min(1).max(80),
  role: z.enum(["admin", "participant"]),
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

function redirectToUsers(request: Request, key: "created" | "error", value: string): NextResponse {
  const url = createSameOriginUrl(request, "/admin/users");
  url.searchParams.set(key, value);
  return NextResponse.redirect(url, { status: 303 });
}

function errorResponse(request: Request, error: string, status: number): NextResponse {
  if (wantsJson(request)) {
    return NextResponse.json({ error }, { status });
  }

  return redirectToUsers(request, "error", error);
}

function successResponse(request: Request, userId: string): NextResponse {
  if (wantsJson(request)) {
    return NextResponse.json({ userId });
  }

  return redirectToUsers(request, "created", "1");
}

function isUniqueConstraintError(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "P2002";
}

export async function POST(request: Request): Promise<NextResponse> {
  const crossSiteResponse = getCrossSiteRequestResponse(request);

  if (crossSiteResponse) {
    return crossSiteResponse;
  }

  const currentUser = await readSessionUser();

  if (!currentUser) {
    return errorResponse(request, "Sign in as an admin to create users.", 401);
  }

  if (!hasRole(currentUser, "admin")) {
    return errorResponse(request, "Admin access is required.", 403);
  }

  const parsed = adminUserSchema.safeParse(await readRequestBody(request).catch(() => null));

  if (!parsed.success) {
    return errorResponse(
      request,
      "Enter a valid email, display name, password with at least 8 characters, and role.",
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

  try {
    const user = await prisma.$transaction(async (tx) => {
      const createdUser = await tx.user.create({
        data: {
          email,
          passwordHash,
          displayName,
          emailVerifiedAt: new Date(),
        },
      });

      await tx.userRole.create({
        data: {
          userId: createdUser.id,
          role: parsed.data.role,
        },
      });

      return createdUser;
    });

    return successResponse(request, user.id);
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return errorResponse(request, "An account with this email already exists.", 409);
    }

    throw error;
  }
}
