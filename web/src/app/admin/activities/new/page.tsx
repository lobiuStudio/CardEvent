import { requireRole } from "@/lib/auth/rbac";
import { NewActivityForm } from "./new-activity-form";

export const runtime = "nodejs";

export default async function NewActivityPage() {
  await requireRole("admin");

  return <NewActivityForm />;
}
