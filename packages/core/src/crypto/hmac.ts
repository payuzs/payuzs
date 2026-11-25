/**
 * Pure Web Crypto API based cryptographic hash and HMAC helpers.
 * Zero external dependencies; works universally across Node.js 18+, Bun, Deno, browsers, and edge workers.
 */

function toHex(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let hex = "";
  for (let i = 0; i < bytes.length; i++) {
    hex += bytes[i]!.toString(16).padStart(2, "0");
  }
  return hex;
}

function toBytes(data: string | Uint8Array): Uint8Array {
  return typeof data === "string" ? new TextEncoder().encode(data) : data;
}

/**
 * Computes SHA-1 hash using Web Crypto API.
 */
export async function sha1(data: string | Uint8Array): Promise<string> {
  const bytes = toBytes(data);
  const hash = await globalThis.crypto.subtle.digest("SHA-1", bytes as BufferSource);
  return toHex(hash);
}

/**
 * Computes SHA-256 hash using Web Crypto API.
 */
export async function sha256(data: string | Uint8Array): Promise<string> {
  const bytes = toBytes(data);
  const hash = await globalThis.crypto.subtle.digest("SHA-256", bytes as BufferSource);
  return toHex(hash);
}

/**
 * Computes HMAC-SHA256 signature using Web Crypto API.
 */
export async function hmacSha256(
  key: string | Uint8Array,
  message: string | Uint8Array,
): Promise<string> {
  const keyBytes = toBytes(key);
  const messageBytes = toBytes(message);

  const cryptoKey = await globalThis.crypto.subtle.importKey(
    "raw",
    keyBytes as BufferSource,
    { name: "HMAC", hash: { name: "SHA-256" } },
    false,
    ["sign"],
  );

  const signature = await globalThis.crypto.subtle.sign(
    "HMAC",
    cryptoKey,
    messageBytes as BufferSource,
  );
  return toHex(signature);
}
