import "dotenv/config";
import { defineConfig } from "prisma/config";
import { resolveSqliteUrl } from "./src/lib/db/database-provider";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: resolveSqliteUrl(process.env.DATABASE_URL || "file:./dev.db"),
  },
});
