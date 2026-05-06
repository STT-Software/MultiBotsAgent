import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: [
    "@multibotagents/types",
    "@multibotagents/core",
  ],
};

export default nextConfig;
