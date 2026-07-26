import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  outputFileTracingRoot: process.cwd(),
  async rewrites() {
    return [
      {
        source: "/__/auth/:path*",
        destination: "https://lifeos-45586.firebaseapp.com/__/auth/:path*",
      },
      {
        source: "/__/firebase/:path*",
        destination: "https://lifeos-45586.firebaseapp.com/__/firebase/:path*",
      },
    ];
  },
};

export default nextConfig;
