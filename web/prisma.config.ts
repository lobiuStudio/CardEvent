import "dotenv/config";
import { defineConfig } from "prisma/config";

function resolveSqliteUrl(url: string) {
  if (url.startsWith("file:./") && !url.startsWith("file:./prisma/")) {
    return `file:./prisma/${url.slice("file:./".length)}`;
  }

  return url;
}

export default defineConfig({
  datasource: {
    url: resolveSqliteUrl(process.env.DATABASE_URL || "file:./dev.db"),
  },
});
