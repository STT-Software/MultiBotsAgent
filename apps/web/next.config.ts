import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: [
    "@multibotagents/types",
    "@multibotagents/core",
  ],
  async rewrites() {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
    return [
      {
        source: "/auth/:path*",
        destination: `${apiUrl}/auth/:path*`,
      },
      {
        source: "/api/:path*",
        destination: `${apiUrl}/api/:path*`,
      },
      {
        source: "/company-profile",
        destination: `${apiUrl}/company-profile`,
      },
      {
        source: "/company-profile/:slug*",
        destination: `${apiUrl}/company-profile/:slug*`,
      },
    ];
  },
};

export default nextConfig;
