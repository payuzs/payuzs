import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vite-plus/test";

describe("@payuzs tree-shaking configuration", () => {
  it("ensures all packages declare sideEffects: false", () => {
    const packages = ["core", "click", "sdk"];

    for (const pkg of packages) {
      const pkgJsonPath = resolve(process.cwd(), `packages/${pkg}/package.json`);
      const pkgJson = JSON.parse(readFileSync(pkgJsonPath, "utf-8")) as { sideEffects?: boolean };
      expect(pkgJson.sideEffects).toBe(false);
    }
  });

  it("ensures subpath exports are properly defined in @payuzs/sdk package.json", () => {
    const pkgJsonPath = resolve(process.cwd(), "packages/sdk/package.json");
    const pkgJson = JSON.parse(readFileSync(pkgJsonPath, "utf-8")) as {
      exports?: Record<string, unknown>;
    };

    expect(pkgJson.exports).toBeDefined();
    expect(pkgJson.exports?.["."]).toBeDefined();
    expect(pkgJson.exports?.["./click"]).toBeDefined();
    expect(pkgJson.exports?.["./core"]).toBeDefined();
  });
});
