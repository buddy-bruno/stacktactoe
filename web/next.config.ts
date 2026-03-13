import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Workspace-Root für Turbopack (vermeidet Warnung bei mehreren lockfiles)
  turbopack: { root: process.cwd() },
};

export default nextConfig;
