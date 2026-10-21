// The style table the build compiled: class literal -> style id, the styles.bin bytes, and
// every complete utility token found in the source. tools/build.ts installs it before the
// app entry runs; mount() reads it.
let ids: Record<string, number> = {};
let bin: Uint8Array = new Uint8Array(0);
let tokens: readonly string[] = [];

export function installBuildStyles(table: Record<string, number>, bytes: Uint8Array, utilityTokens: readonly string[] = []): void {
  ids = table;
  bin = bytes;
  tokens = utilityTokens;
}

export function buildStyleIds(): Record<string, number> {
  return ids;
}

export function buildStyleBin(): Uint8Array {
  return bin;
}

export function buildStyleTokens(): readonly string[] {
  return tokens;
}
