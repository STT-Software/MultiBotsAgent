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
    ];
  },
};

export default nextConfig;
