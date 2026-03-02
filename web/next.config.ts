import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["../src"],
  serverExternalPackages: ["better-sqlite3"],
};

export default nextConfig;
