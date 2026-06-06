import { redirect } from "next/navigation";
import { readSessionUser, type SessionUser } from "./session";

export function hasRole(user: SessionUser | null, role: string): boolean {
  return Boolean(user?.roles.includes(role));
}

export async function requireUser(): Promise<SessionUser> {
  const user = await readSessionUser();

  if (!user) {
    redirect("/account/login");
  }

  return user;
}

export async function requireRole(role: string): Promise<SessionUser> {
  const user = await requireUser();

  if (!hasRole(user, role)) {
    redirect("/");
  }

  return user;
}
