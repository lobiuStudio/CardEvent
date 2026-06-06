import { NextResponse } from "next/server";
import { hasRole } from "@/lib/auth/rbac";
import { getCrossSiteRequestResponse } from "@/lib/auth/request-security";
import { readSessionUser } from "@/lib/auth/session";
import { confirmPaymentProof, PaymentProofNotFoundError, rejectPaymentProof } from "@/lib/db/payment-repository";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    paymentProofId: string;
  }>;
};

function wantsJson(request: Request): boolean {
  return request.headers.get("accept")?.includes("application/json") ?? false;
}

function redirectToPayments(request: Request, key: "error" | "reviewed", value: string): NextResponse {
  const url = new URL("/admin/payments", request.url);
  url.searchParams.set(key, value);
  return NextResponse.redirect(url, { status: 303 });
}

function errorResponse(request: Request, error: string, status: number): NextResponse {
  if (wantsJson(request)) {
    return NextResponse.json({ error }, { status });
  }

  return redirectToPayments(request, "error", error);
}

function successResponse(request: Request, proof: { id: string; status: string }): NextResponse {
  if (wantsJson(request)) {
    return NextResponse.json({
      paymentProofId: proof.id,
      status: proof.status,
    });
  }

  return redirectToPayments(request, "reviewed", proof.status);
}

async function readRequestBody(request: Request): Promise<unknown> {
  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    return request.json();
  }

  return Object.fromEntries((await request.formData()).entries());
}

function stringValue(body: unknown, name: string): string {
  if (typeof body !== "object" || body === null || !(name in body)) {
    return "";
  }

  const value = (body as Record<string, unknown>)[name];
  return typeof value === "string" ? value.trim() : "";
}

export async function POST(request: Request, { params }: RouteContext): Promise<NextResponse> {
  const crossSiteResponse = getCrossSiteRequestResponse(request);

  if (crossSiteResponse) {
    return crossSiteResponse;
  }

  const currentUser = await readSessionUser();

  if (!currentUser) {
    return errorResponse(request, "Sign in as an admin to review payment proofs.", 401);
  }

  if (!hasRole(currentUser, "admin")) {
    return errorResponse(request, "Admin access is required.", 403);
  }

  const body = await readRequestBody(request).catch(() => null);
  const action = stringValue(body, "action");
  const { paymentProofId } = await params;

  if (action !== "confirm" && action !== "reject") {
    return errorResponse(request, "Choose whether to confirm or reject this payment proof.", 400);
  }

  try {
    const paymentProof =
      action === "confirm" ? await confirmPaymentProof(paymentProofId) : await rejectPaymentProof(paymentProofId);

    return successResponse(request, paymentProof);
  } catch (error) {
    if (error instanceof PaymentProofNotFoundError) {
      return errorResponse(request, "Payment proof not found.", 404);
    }

    throw error;
  }
}
