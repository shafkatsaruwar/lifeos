import { withReticle } from '@reticlehq/next';
import type { NextConfig } from "next";

/** Firebase Auth host for /__/auth rewrites (Google sign-in on custom domains). Set via env — no project baked in. */
const firebaseAuthHost = (process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "").trim().replace(/^https?:\/\//, "");

const nextConfig: NextConfig = {
  reactStrictMode: true,
  outputFileTracingRoot: process.cwd(),
  async rewrites() {
    if (!firebaseAuthHost) return [];
    return [
      {
        source: "/__/auth/:path*",
        destination: `https://${firebaseAuthHost}/__/auth/:path*`,
      },
      {
        source: "/__/firebase/:path*",
        destination: `https://${firebaseAuthHost}/__/firebase/:path*`,
      },
    ];
  },
};

export default withReticle(nextConfig);
