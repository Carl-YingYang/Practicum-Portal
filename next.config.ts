import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* Vercel-friendly config — no `output: "standalone"` (that was sandbox-only). */
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
};

export default nextConfig;