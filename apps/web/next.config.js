/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: [
    "@multibotagents/types",
    "@multibotagents/core",
  ],
};

module.exports = nextConfig;

