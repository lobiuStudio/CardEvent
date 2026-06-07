import type { NextConfig } from "next";
import { join } from "node:path";

const databaseProvider = process.env.DATABASE_PROVIDER === "d1" ? "d1" : "sqlite";
const prismaRuntimeModule =
  databaseProvider === "d1" ? "./src/lib/db/prisma-runtime.d1.ts" : "./src/lib/db/prisma-runtime.ts";
const prismaRuntimePath = join(process.cwd(), prismaRuntimeModule);

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1"],
  turbopack: {
    resolveAlias: {
      "@/lib/db/prisma-runtime": prismaRuntimeModule,
    },
  },
  webpack(config) {
    config.resolve.alias["@/lib/db/prisma-runtime"] = prismaRuntimePath;

    return config;
  },
};

export default nextConfig;
