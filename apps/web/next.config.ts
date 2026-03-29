import type { NextConfig } from "next";

function getAllowedOrigins() {
  const configuredBaseUrl = process.env.NEXT_PUBLIC_BASE_URL;

  let configuredHost: string | null = null;

  if (configuredBaseUrl) {
    try {
      configuredHost = new URL(configuredBaseUrl).hostname;
    } catch {
      configuredHost = null;
    }
  }

  return Array.from(
    new Set([
      "localhost",
      "127.0.0.1",
      "*.devtunnels.ms",
      "*.*.devtunnels.ms",
      "*.ngrok-free.app",
      "*.ngrok-free.dev",
      ...(configuredHost ? [configuredHost] : []),
    ]),
  );
}

const nextConfig: NextConfig = {
  allowedDevOrigins: getAllowedOrigins(),
  experimental: {
    serverActions: {
      allowedOrigins: getAllowedOrigins(),
    },
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
      {
        protocol: "http",
        hostname: "**",
      },
    ],
  },
} as NextConfig;

export default nextConfig;
