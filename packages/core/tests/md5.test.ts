import { describe, expect, it } from "vite-plus/test";
import { md5 } from "../src/crypto/md5.js";

describe("md5", () => {
  it("hashes empty string correctly", () => {
    expect(md5("")).toBe("d41d8cd98f00b204e9800998ecf8427e");
  });

  it('hashes "a" correctly', () => {
    expect(md5("a")).toBe("0cc175b9c0f1b6a831c399e269772661");
  });

  it('hashes "abc" correctly', () => {
    expect(md5("abc")).toBe("900150983cd24fb0d6963f7d28e17f72");
  });

  it('hashes "message digest" correctly', () => {
    expect(md5("message digest")).toBe("f96b697d7cb7938d525a2f31aaf161d0");
  });

  it("hashes Click payment sample payload correctly", () => {
    const sample =
      "12345" + "100" + "secretKey" + "order_99" + "50000" + "0" + "2026-11-25 12:00:00";
    const hash = md5(sample);
    expect(hash).toHaveLength(32);
    expect(hash).toMatch(/^[0-9a-f]{32}$/u);
  });
});
