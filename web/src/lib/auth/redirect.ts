export function getSafeReturnPath(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();

  if (!trimmed || !trimmed.startsWith("/") || trimmed.startsWith("//")) {
    return null;
  }

  return trimmed;
}

export function createSameOriginUrl(request: Request, path: string): URL {
  const requestUrl = new URL(request.url);
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");

  if (!host) {
    return new URL(path, requestUrl);
  }

  const forwardedProto = request.headers.get("x-forwarded-proto");
  const protocol = forwardedProto ? `${forwardedProto}:` : requestUrl.protocol;

  return new URL(path, `${protocol}//${host}`);
}
