import { NextResponse } from "next/server";

const allowedFetchSites = new Set(["same-origin", "none"]);

function getAllowedRequestOrigins(request: Request): Set<string> {
  const origins = new Set<string>();

  try {
    const requestUrl = new URL(request.url);
    origins.add(requestUrl.origin);

    const forwardedHost = request.headers.get("x-forwarded-host");
    const host = forwardedHost ?? request.headers.get("host");

    if (host) {
      const forwardedProto = request.headers.get("x-forwarded-proto");
      const protocol = forwardedProto ? `${forwardedProto}:` : requestUrl.protocol;
      origins.add(`${protocol}//${host}`);
    }
  } catch {
    return origins;
  }

  return origins;
}

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
    return getAllowedRequestOrigins(request).has(new URL(origin).origin);
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
