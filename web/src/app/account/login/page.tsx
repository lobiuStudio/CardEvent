import { readSessionUser } from "@/lib/auth/session";
import { LoginForm } from "./login-form";

export const runtime = "nodejs";

export default async function LoginPage() {
  const currentUser = await readSessionUser();

  return <LoginForm currentUser={currentUser} />;
}
