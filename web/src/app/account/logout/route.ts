import { clearSessionCookie } from "@/lib/auth/session";
import { createSameOriginUrl } from "@/lib/auth/redirect";
import { getCrossSiteRequestResponse } from "@/lib/auth/request-security";
import { NextResponse } from "next/server";

export async function GET(request: Request): Promise<NextResponse> {
  await clearSessionCookie();
  return NextResponse.redirect(createSameOriginUrl(request, "/account/login"), { status: 303 });
}

export async function POST(request: Request): Promise<NextResponse> {
  const crossSiteResponse = getCrossSiteRequestResponse(request);

  if (crossSiteResponse) {
    return crossSiteResponse;
  }

  await clearSessionCookie();
  return NextResponse.redirect(createSameOriginUrl(request, "/account/login"), { status: 303 });
}
