/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: [
    "@todo-list-poc/types",
    "@todo-list-poc/core",
  ],
};

module.exports = nextConfig;
