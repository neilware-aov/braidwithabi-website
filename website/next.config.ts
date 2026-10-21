import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Node-only packages (crypto, database drivers); keep them out of the bundler.
  serverExternalPackages: ["web-push", "postgres", "@electric-sql/pglite"],
  // Lets phones on the same home Wi-Fi open the local dev server (development only).
  allowedDevOrigins: ["192.168.*.*", "10.*.*.*"],

  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
        ],
      },
      {
        // A client's private "manage my booking" link: never pass it on to
        // other sites (chat links) and keep it out of search engines.
        source: "/booking/:token",
        headers: [
          { key: "Referrer-Policy", value: "no-referrer" },
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
        ],
      },
    ];
  },
};

export default nextConfig;
