export type DatabaseProvider = "sqlite" | "d1";

export function getDatabaseProvider(): DatabaseProvider {
  const provider = process.env.DATABASE_PROVIDER ?? "sqlite";

  if (provider === "sqlite" || provider === "d1") {
    return provider;
  }

  throw new Error("DATABASE_PROVIDER must be sqlite or d1.");
}

export function resolveSqliteUrl(url: string): string {
  if (url.startsWith("file:./") && !url.startsWith("file:./prisma/")) {
    return `file:./prisma/${url.slice("file:./".length)}`;
  }

  return url;
}
