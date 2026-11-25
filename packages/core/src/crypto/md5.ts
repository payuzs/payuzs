/**
 * Zero-dependency pure TypeScript implementation of RFC 1321 (MD5 Message-Digest Algorithm).
 * Suitable for all JavaScript/TypeScript runtimes (Node.js, Bun, Deno, Browsers, Cloudflare Workers).
 */

function safeAdd(x: number, y: number): number {
  const lsw = (x & 0xffff) + (y & 0xffff);
  const msw = (x >> 16) + (y >> 16) + (lsw >> 16);
  return (msw << 16) | (lsw & 0xffff);
}

function bitRotateLeft(num: number, cnt: number): number {
  return (num << cnt) | (num >>> (32 - cnt));
}

function md5cmn(q: number, a: number, b: number, x: number, s: number, t: number): number {
  return safeAdd(bitRotateLeft(safeAdd(safeAdd(a, q), safeAdd(x, t)), s), b);
}

function md5ff(
  a: number,
  b: number,
  c: number,
  d: number,
  x: number,
  s: number,
  t: number,
): number {
  return md5cmn((b & c) | (~b & d), a, b, x, s, t);
}

function md5gg(
  a: number,
  b: number,
  c: number,
  d: number,
  x: number,
  s: number,
  t: number,
): number {
  return md5cmn((b & d) | (c & ~d), a, b, x, s, t);
}

function md5hh(
  a: number,
  b: number,
  c: number,
  d: number,
  x: number,
  s: number,
  t: number,
): number {
  return md5cmn(b ^ c ^ d, a, b, x, s, t);
}

function md5ii(
  a: number,
  b: number,
  c: number,
  d: number,
  x: number,
  s: number,
  t: number,
): number {
  return md5cmn(c ^ (b | ~d), a, b, x, s, t);
}

function binlMD5(x: number[], len: number): number[] {
  x[len >> 5] = (x[len >> 5] ?? 0) | (0x80 << (len % 32));
  x[(((len + 64) >>> 9) << 4) + 14] = len;

  let a = 1732584193;
  let b = -271733879;
  let c = -1732584194;
  let d = 271733878;

  for (let i = 0; i < x.length; i += 16) {
    const olda = a;
    const oldb = b;
    const oldc = c;
    const oldd = d;

    const x0 = x[i] ?? 0;
    const x1 = x[i + 1] ?? 0;
    const x2 = x[i + 2] ?? 0;
    const x3 = x[i + 3] ?? 0;
    const x4 = x[i + 4] ?? 0;
    const x5 = x[i + 5] ?? 0;
    const x6 = x[i + 6] ?? 0;
    const x7 = x[i + 7] ?? 0;
    const x8 = x[i + 8] ?? 0;
    const x9 = x[i + 9] ?? 0;
    const x10 = x[i + 10] ?? 0;
    const x11 = x[i + 11] ?? 0;
    const x12 = x[i + 12] ?? 0;
    const x13 = x[i + 13] ?? 0;
    const x14 = x[i + 14] ?? 0;
    const x15 = x[i + 15] ?? 0;

    a = md5ff(a, b, c, d, x0, 7, -680876936);
    d = md5ff(d, a, b, c, x1, 12, -389564586);
    c = md5ff(c, d, a, b, x2, 17, 606105819);
    b = md5ff(b, c, d, a, x3, 22, -1044525330);
    a = md5ff(a, b, c, d, x4, 7, -176418897);
    d = md5ff(d, a, b, c, x5, 12, 1200080426);
    c = md5ff(c, d, a, b, x6, 17, -1473231341);
    b = md5ff(b, c, d, a, x7, 22, -45705983);
    a = md5ff(a, b, c, d, x8, 7, 1770035416);
    d = md5ff(d, a, b, c, x9, 12, -1958414417);
    c = md5ff(c, d, a, b, x10, 17, -42063);
    b = md5ff(b, c, d, a, x11, 22, -1990404162);
    a = md5ff(a, b, c, d, x12, 7, 1804603682);
    d = md5ff(d, a, b, c, x13, 12, -40341101);
    c = md5ff(c, d, a, b, x14, 17, -1502002290);
    b = md5ff(b, c, d, a, x15, 22, 1236535329);

    a = md5gg(a, b, c, d, x1, 5, -165796510);
    d = md5gg(d, a, b, c, x6, 9, -1069501632);
    c = md5gg(c, d, a, b, x11, 14, 643717713);
    b = md5gg(b, c, d, a, x0, 20, -373897302);
    a = md5gg(a, b, c, d, x5, 5, -701558691);
    d = md5gg(d, a, b, c, x10, 9, 38016083);
    c = md5gg(c, d, a, b, x15, 14, -660478335);
    b = md5gg(b, c, d, a, x4, 20, -405537848);
    a = md5gg(a, b, c, d, x9, 5, 568446438);
    d = md5gg(d, a, b, c, x14, 9, -1019803690);
    c = md5gg(c, d, a, b, x3, 14, -187363961);
    b = md5gg(b, c, d, a, x8, 20, 1163531501);
    a = md5gg(a, b, c, d, x13, 5, -1444681467);
    d = md5gg(d, a, b, c, x2, 9, -51403784);
    c = md5gg(c, d, a, b, x7, 14, 1735328473);
    b = md5gg(b, c, d, a, x12, 20, -1926607734);

    a = md5hh(a, b, c, d, x5, 4, -378558);
    d = md5hh(d, a, b, c, x8, 11, -2022574463);
    c = md5hh(c, d, a, b, x11, 16, 1839030562);
    b = md5hh(b, c, d, a, x14, 23, -35309556);
    a = md5hh(a, b, c, d, x1, 4, -1530992060);
    d = md5hh(d, a, b, c, x4, 11, 1272893353);
    c = md5hh(c, d, a, b, x7, 16, -155497632);
    b = md5hh(b, c, d, a, x10, 23, -1094730640);
    a = md5hh(a, b, c, d, x13, 4, 681279174);
    d = md5hh(d, a, b, c, x0, 11, -358537222);
    c = md5hh(c, d, a, b, x3, 16, -722521979);
    b = md5hh(b, c, d, a, x6, 23, 76029189);
    a = md5hh(a, b, c, d, x9, 4, -640364487);
    d = md5hh(d, a, b, c, x12, 11, -421815835);
    c = md5hh(c, d, a, b, x15, 16, 530742520);
    b = md5hh(b, c, d, a, x2, 23, -995338651);

    a = md5ii(a, b, c, d, x0, 6, -198630844);
    d = md5ii(d, a, b, c, x7, 10, 1126891415);
    c = md5ii(c, d, a, b, x14, 15, -1416354905);
    b = md5ii(b, c, d, a, x5, 21, -57434055);
    a = md5ii(a, b, c, d, x12, 6, 1700485571);
    d = md5ii(d, a, b, c, x3, 10, -1894986606);
    c = md5ii(c, d, a, b, x10, 15, -1051523);
    b = md5ii(b, c, d, a, x1, 21, -2054922799);
    a = md5ii(a, b, c, d, x8, 6, 1873313359);
    d = md5ii(d, a, b, c, x15, 10, -30611744);
    c = md5ii(c, d, a, b, x6, 15, -1560198380);
    b = md5ii(b, c, d, a, x13, 21, 1309151649);
    a = md5ii(a, b, c, d, x4, 6, -145523070);
    d = md5ii(d, a, b, c, x11, 10, -1120210379);
    c = md5ii(c, d, a, b, x2, 15, 718787259);
    b = md5ii(b, c, d, a, x9, 21, -343485551);

    a = safeAdd(a, olda);
    b = safeAdd(b, oldb);
    c = safeAdd(c, oldc);
    d = safeAdd(d, oldd);
  }

  return [a, b, c, d];
}

function rhex(n: number): string {
  let s = "";
  for (let j = 0; j <= 3; j++) {
    s += ((n >> (j * 8 + 4)) & 0x0f).toString(16) + ((n >> (j * 8)) & 0x0f).toString(16);
  }
  return s;
}

function stringToUtf8Bytes(str: string): Uint8Array {
  return new TextEncoder().encode(str);
}

function bytesToWords(bytes: Uint8Array): number[] {
  const words: number[] = [];
  for (let i = 0; i < bytes.length; i++) {
    words[i >> 2] = (words[i >> 2] ?? 0) | (bytes[i]! << ((i % 4) * 8));
  }
  return words;
}

/**
 * Computes the MD5 hash of a UTF-8 string or byte array, returning a 32-character lowercase hex string.
 */
export function md5(data: string | Uint8Array): string {
  const bytes = typeof data === "string" ? stringToUtf8Bytes(data) : data;
  const words = bytesToWords(bytes);
  const hashWords = binlMD5(words, bytes.length * 8);
  return rhex(hashWords[0]!) + rhex(hashWords[1]!) + rhex(hashWords[2]!) + rhex(hashWords[3]!);
}
