import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Workspace-Root für Turbopack (vermeidet Warnung bei mehreren lockfiles)
  turbopack: { root: process.cwd() },
  // Zugriff vom Handy/Tablet im LAN (Cross-Origin-Warnung vermeiden)
  allowedDevOrigins: ['192.168.188.61'],
};

export default nextConfig;
