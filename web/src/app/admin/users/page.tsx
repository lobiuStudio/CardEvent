import { requireRole } from "@/lib/auth/rbac";
import { prisma } from "@/lib/db/prisma";

export const runtime = "nodejs";

type AdminUsersPageProps = {
  searchParams: Promise<{
    created?: string | string[];
    error?: string | string[];
  }>;
};

function readParam(value: string | string[] | undefined): string {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }

  return value ?? "";
}

const inputClassName =
  "min-h-11 w-full rounded-md border border-zinc-300 bg-white px-3 text-base text-zinc-950 outline-none transition focus:border-zinc-900 focus:ring-2 focus:ring-zinc-200";

export default async function AdminUsersPage({ searchParams }: AdminUsersPageProps) {
  await requireRole("admin");

  const params = await searchParams;
  const error = readParam(params.error);
  const created = readParam(params.created);
  const users = await prisma.user.findMany({
    include: {
      roles: {
        orderBy: { role: "asc" },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return (
    <main className="min-h-dvh flex-1 bg-zinc-50 px-4 py-8">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-8">
        <header className="flex flex-col gap-2">
          <h1 className="text-3xl font-semibold tracking-normal text-zinc-950">Users</h1>
          <p className="text-base text-zinc-600">Create admin and participant accounts.</p>
        </header>

        <section className="rounded-md border border-zinc-200 bg-white p-5 shadow-sm">
          <h2 className="text-xl font-semibold text-zinc-950">Create user</h2>
          <form className="mt-5 grid gap-5 md:grid-cols-2" action="/api/admin/users" method="post">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-zinc-900" htmlFor="displayName">
                Display name
              </label>
              <input
                className={inputClassName}
                id="displayName"
                name="displayName"
                autoComplete="name"
                required
                maxLength={80}
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-zinc-900" htmlFor="email">
                Email
              </label>
              <input className={inputClassName} id="email" name="email" type="email" autoComplete="email" required />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-zinc-900" htmlFor="password">
                Password
              </label>
              <input
                className={inputClassName}
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                minLength={8}
                required
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-zinc-900" htmlFor="role">
                Role
              </label>
              <select className={inputClassName} id="role" name="role" defaultValue="participant" required>
                <option value="participant">Participant</option>
                <option value="admin">Admin</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <p className="min-h-6 text-sm text-red-700" role="alert" aria-live="polite">
                {error}
              </p>
              {created ? <p className="min-h-6 text-sm text-green-700">User created.</p> : null}
              <button
                className="mt-3 min-h-11 w-full rounded-md bg-zinc-950 px-4 text-base font-semibold text-white transition hover:bg-zinc-800"
                type="submit"
              >
                Create user
              </button>
            </div>
          </form>
        </section>

        <section className="rounded-md border border-zinc-200 bg-white shadow-sm">
          <div className="border-b border-zinc-200 p-5">
            <h2 className="text-xl font-semibold text-zinc-950">Recent users</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse text-left text-sm">
              <thead className="bg-zinc-100 text-zinc-700">
                <tr>
                  <th className="px-5 py-3 font-semibold">Name</th>
                  <th className="px-5 py-3 font-semibold">Email</th>
                  <th className="px-5 py-3 font-semibold">Roles</th>
                  <th className="px-5 py-3 font-semibold">Verified</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200">
                {users.map((user) => (
                  <tr key={user.id}>
                    <td className="px-5 py-4 text-zinc-950">{user.displayName}</td>
                    <td className="px-5 py-4 text-zinc-700">{user.email}</td>
                    <td className="px-5 py-4 text-zinc-700">
                      {user.roles.map(({ role }) => role).join(", ") || "none"}
                    </td>
                    <td className="px-5 py-4 text-zinc-700">{user.emailVerifiedAt ? "Yes" : "No"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}
