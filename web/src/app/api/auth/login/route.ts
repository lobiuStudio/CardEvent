import { NextResponse } from "next/server";
import { z } from "zod";
import { verifyPassword } from "@/lib/auth/password";
import { createSameOriginUrl, getSafeReturnPath } from "@/lib/auth/redirect";
import { getCrossSiteRequestResponse } from "@/lib/auth/request-security";
import { setSessionCookie } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";

export const runtime = "nodejs";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
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

function errorResponse(error: string, status: number): NextResponse {
  return NextResponse.json({ error }, { status });
}

function redirectResponse(request: Request, path: string): NextResponse {
  if (wantsJson(request)) {
    return NextResponse.json({ redirectTo: path });
  }

  return NextResponse.redirect(createSameOriginUrl(request, path), { status: 303 });
}

function getLoginRedirectPath(roles: string[]): string {
  if (roles.includes("admin")) {
    return "/admin";
  }

  if (roles.includes("judge")) {
    return "/judge";
  }

  return "/activities";
}

export async function POST(request: Request): Promise<NextResponse> {
  const crossSiteResponse = getCrossSiteRequestResponse(request);

  if (crossSiteResponse) {
    return crossSiteResponse;
  }

  const parsed = loginSchema.safeParse(await readRequestBody(request).catch(() => null));

  if (!parsed.success) {
    return errorResponse("Enter a valid email and password.", 400);
  }

  const user = await prisma.user.findUnique({
    where: { email: parsed.data.email.toLowerCase() },
    include: { roles: true },
  });

  if (!user) {
    return errorResponse("Invalid email or password.", 401);
  }

  const passwordIsValid = await verifyPassword(parsed.data.password, user.passwordHash);

  if (!passwordIsValid) {
    return errorResponse("Invalid email or password.", 401);
  }

  const roles = user.roles.map(({ role }) => role);

  await setSessionCookie(user.id);

  return redirectResponse(request, getSafeReturnPath(parsed.data.returnTo) ?? getLoginRedirectPath(roles));
}
