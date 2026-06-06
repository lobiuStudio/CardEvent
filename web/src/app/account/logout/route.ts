import { clearSessionCookie } from "@/lib/auth/session";
import { NextResponse } from "next/server";

export async function GET(request: Request): Promise<NextResponse> {
  await clearSessionCookie();
  return NextResponse.redirect(new URL("/account/login", request.url), { status: 303 });
}

export async function POST(request: Request): Promise<NextResponse> {
  return GET(request);
}
