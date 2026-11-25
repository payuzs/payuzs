import { defineConfig } from "vite-plus";

export default defineConfig({
  staged: {
    "*": "vp check --fix",
  },
  fmt: {},
  lint: {
    categories: {
      correctness: "error",
      pedantic: "error",
      perf: "error",
    },
    plugins: ["typescript", "node", "import", "promise", "oxc", "unicorn", "vitest", "eslint"],
    jsPlugins: [{ name: "vite-plus", specifier: "vite-plus/oxlint-plugin" }],
    rules: {
      "vite-plus/prefer-vite-plus-imports": "error",
      "typescript/prefer-readonly-parameter-types": "off",
      "max-lines-per-function": "off",
      "no-inline-comments": "off",
    },
    options: { typeAware: true, typeCheck: true },
  },
  run: {
    cache: true,
  },
});
