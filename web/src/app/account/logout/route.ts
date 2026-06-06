import { clearSessionCookie } from "@/lib/auth/session";
import { getCrossSiteRequestResponse } from "@/lib/auth/request-security";
import { NextResponse } from "next/server";

export function GET(): NextResponse {
  return NextResponse.json(
    { error: "Method not allowed." },
    {
      status: 405,
      headers: {
        Allow: "POST",
      },
    },
  );
}

export async function POST(request: Request): Promise<NextResponse> {
  const crossSiteResponse = getCrossSiteRequestResponse(request);

  if (crossSiteResponse) {
    return crossSiteResponse;
  }

  await clearSessionCookie();
  return NextResponse.redirect(new URL("/account/login", request.url), { status: 303 });
}
