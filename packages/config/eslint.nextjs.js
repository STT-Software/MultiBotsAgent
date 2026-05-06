/** @type {import("eslint").Linter.Config} */
module.exports = {
  extends: [
    require.resolve("./eslint.base.js"),
    "next/core-web-vitals",
  ],
  env: {
    browser: true,
    node: true,
    es2017: true,
  },
};
