import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@unforgit/core", "@unforgit/shared", "@unforgit/db"],
  serverExternalPackages: ["better-sqlite3"],
};

export default nextConfig;
