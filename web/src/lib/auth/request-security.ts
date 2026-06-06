import { NextResponse } from "next/server";

const allowedFetchSites = new Set(["same-origin", "none"]);

export function isSameOriginRequest(request: Request): boolean {
  const fetchSite = request.headers.get("sec-fetch-site");

  if (fetchSite && !allowedFetchSites.has(fetchSite)) {
    return false;
  }

  const origin = request.headers.get("origin");

  if (!origin) {
    return true;
  }

  try {
    return new URL(origin).origin === new URL(request.url).origin;
  } catch {
    return false;
  }
}

export function getCrossSiteRequestResponse(request: Request): NextResponse | null {
  if (isSameOriginRequest(request)) {
    return null;
  }

  return NextResponse.json({ error: "Cross-site requests are not allowed." }, { status: 403 });
}
