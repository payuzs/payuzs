import { describe, expect, it } from "vite-plus/test";
import { hmacSha256, sha1, sha256 } from "../src/crypto/hmac.js";

describe("crypto helpers (sha1, sha256, hmacSha256)", () => {
  it("sha1 hashes correctly", async () => {
    expect(await sha1("")).toBe("da39a3ee5e6b4b0d3255bfef95601890afd80709");
    expect(await sha1("abc")).toBe("a9993e364706816aba3e25717850c26c9cd0d89d");
  });

  it("sha256 hashes correctly", async () => {
    expect(await sha256("")).toBe(
      "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    );
    expect(await sha256("abc")).toBe(
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    );
  });

  it("hmacSha256 produces valid HMAC", async () => {
    const hash = await hmacSha256("key", "The quick brown fox jumps over the lazy dog");
    expect(hash).toBe("f7bc83f430538424b13298e6aa6fb143ef4d59a14946175997479dbc2d1a3cd8");
  });
});
