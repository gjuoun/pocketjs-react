// Assets the build embedded in the bundle (tools/build.ts --asset name=file), as bytes.
// Base64 decoding is done here because QuickJS has no atob.
let table: Record<string, string> = {};
const cache = new Map<string, Uint8Array>();

export function installBundledAssets(assets: Record<string, string>): void {
  table = assets;
  cache.clear();
}

let baked: Set<number> | null = null;

/** Codepoints above ASCII the build baked into the body font slots (tools/build.ts --glyphs/--cjk). */
export function installBakedGlyphs(chars: string): void {
  baked = new Set(Array.from(chars, (ch) => ch.codePointAt(0)!));
}

/** The baked set, or null when the build did not record one. ASCII is always baked. */
export function bakedGlyphs(): ReadonlySet<number> | null {
  return baked;
}

export function bundledAssetNames(): string[] {
  return Object.keys(table).sort();
}

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
const DECODE = new Uint8Array(256);
for (let i = 0; i < 64; i++) DECODE[ALPHABET.charCodeAt(i)] = i;

export function base64ToBytes(s: string): Uint8Array {
  const clean = s.replace(/[^A-Za-z0-9+/]/g, "");
  const out = new Uint8Array(Math.floor((clean.length * 3) / 4));
  let o = 0;
  for (let i = 0; i < clean.length; i += 4) {
    const n = (DECODE[clean.charCodeAt(i)] << 18) | (DECODE[clean.charCodeAt(i + 1)] << 12) | (DECODE[clean.charCodeAt(i + 2)] << 6) | DECODE[clean.charCodeAt(i + 3)];
    if (o < out.length) out[o++] = (n >> 16) & 255;
    if (o < out.length) out[o++] = (n >> 8) & 255;
    if (o < out.length) out[o++] = n & 255;
  }
  return out;
}

export function bundledAsset(name: string): Uint8Array {
  const hit = cache.get(name);
  if (hit) return hit;
  const b64 = table[name];
  if (b64 === undefined) throw new Error("pocketjs-react: no bundled asset " + JSON.stringify(name));
  const bytes = base64ToBytes(b64);
  cache.set(name, bytes);
  return bytes;
}
