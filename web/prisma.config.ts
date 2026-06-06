import "dotenv/config";
import { defineConfig, env } from "prisma/config";

function resolveSqliteUrl(url: string) {
  if (url.startsWith("file:./") && !url.startsWith("file:./prisma/")) {
    return `file:./prisma/${url.slice("file:./".length)}`;
  }

  return url;
}

export default defineConfig({
  datasource: {
    url: resolveSqliteUrl(env("DATABASE_URL")),
  },
});
