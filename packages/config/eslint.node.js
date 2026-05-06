/** @type {import("eslint").Linter.Config} */
module.exports = {
  extends: [require.resolve("./eslint.base.js")],
  env: {
    node: true,
    es2022: true,
  },
};
