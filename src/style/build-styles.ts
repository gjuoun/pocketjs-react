// The style table the build compiled: class literal -> style id, plus the styles.bin bytes.
// tools/build.ts installs it before the app entry runs; mount() reads it.
let ids: Record<string, number> = {};
let bin: Uint8Array = new Uint8Array(0);

export function installBuildStyles(table: Record<string, number>, bytes: Uint8Array): void {
  ids = table;
  bin = bytes;
}

export function buildStyleIds(): Record<string, number> {
  return ids;
}

export function buildStyleBin(): Uint8Array {
  return bin;
}
