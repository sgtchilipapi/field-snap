import type { NextConfig } from "next";

function getAllowedOrigins() {
  const defaults = [
    "localhost:3000",
    "*.app.github.dev",
    "*.github.dev",
    "*.githubpreview.dev"
  ];
  const origins = new Set(defaults);
  const appBaseUrl = process.env.APP_BASE_URL;

  if (appBaseUrl) {
    try {
      origins.add(new URL(appBaseUrl).host);
    } catch {
      // Ignore invalid APP_BASE_URL here; runtime env validation handles the failure path.
    }
  }

  const tunnelUrl = process.env.CLOUDFLARE_TUNNEL_URL;

  if (tunnelUrl) {
    try {
      origins.add(new URL(tunnelUrl).host);
    } catch {
      // Ignore invalid tunnel URL here; the startup script validates it before use.
    }
  }

  return [...origins];
}

const nextConfig: NextConfig = {
  reactStrictMode: true,
  experimental: {
    serverActions: {
      allowedOrigins: getAllowedOrigins()
    }
  }
};

export default nextConfig;
