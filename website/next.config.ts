import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Node-only packages (crypto, database drivers); keep them out of the bundler.
  serverExternalPackages: ["web-push", "postgres", "@electric-sql/pglite"],
  // Lets phones on the same Wi-Fi open the local dev server (development only).
  allowedDevOrigins: ["192.168.1.46", "192.168.*.*"],
};

export default nextConfig;
