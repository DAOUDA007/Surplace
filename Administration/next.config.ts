import type { NextConfig } from "next";

// Adresse du serveur API (dossier Backend).
const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:4000";

const nextConfig: NextConfig = {
  outputFileTracingRoot: __dirname,
  // Le navigateur appelle /api/* sur le même domaine ; Next.js relaie vers le backend.
  // Ainsi le cookie de session reste sur le domaine du site.
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${BACKEND_URL}/api/:path*` }];
  },
};

export default nextConfig;
