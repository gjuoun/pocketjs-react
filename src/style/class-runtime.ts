// Runtime className. PocketJS resolves a class string by exact match against the table
// compiled at build time, and the core's loadStyles replaces the whole table. To let any
// string React code produces work (ternaries, clsx, cn/twMerge):
//   - a string in the build table resolves to its id;
//   - any other string is compiled in the guest by PocketJS's own Tailwind compiler
//     (parseClassLiteral, the same code the build runs), deduped, and appended to the table,
//     so ids stay stable and focus:/active:/transitions stay native;
//   - new records are encoded incrementally (only the new record's bytes) and the grown
//     table is loaded ONCE per React commit; nodes waiting on a new id get it after that load.
// Utility names must still appear as complete tokens in source: fonts are baked from the
// build scan, so the runtime never invents a utility the build did not see.
import {
  PROP,
  PROP_VALUE_KIND,
  STYLE_ID_NONE,
  VALUE_KIND,
  decodeStyleTable,
  encodeStyleTable,
  parseClassLiteral,
  resolveStyle,
  setProp,
  type NodeMirror,
  type PropName,
  type StyleRecord,
} from "../internal/pocket.ts";
import { getOps } from "@pocketjs/framework/host";

const HEADER_SIZE = 12;

let enabled = false;
let header = new Uint8Array(0);
let recordBytes = new Uint8Array(0);
let animBytes = new Uint8Array(0);
let recordCount = 0;
let loadedCount = 0;
const canonical = new Map<string, number>();
const cache = new Map<string, number | null>();
const pending: Array<[NodeMirror, number]> = [];
const applied = new WeakMap<NodeMirror, string>();
const appliedId = new WeakMap<NodeMirror, number>();
let records: StyleRecord[] = [];

export const classRuntimeStats = { compiled: 0, appended: 0, loads: 0 };

function body(table: Uint8Array): Uint8Array {
  return table.subarray(HEADER_SIZE);
}

/** Start from the build's styles.bin (the table the host already loaded from the pak). */
export function initClassRuntime(bin: Uint8Array): void {
  pending.length = 0;
  cache.clear();
  canonical.clear();
  enabled = bin.length > 0;
  if (!enabled) return;
  const table = decodeStyleTable(bin);
  records = table.styles.slice();
  table.styles.forEach((record: StyleRecord, id: number) => {
    const key = JSON.stringify(record);
    if (!canonical.has(key)) canonical.set(key, id);
  });
  header = bin.slice(0, HEADER_SIZE);
  recordBytes = body(encodeStyleTable(table.styles, [])).slice();
  animBytes = body(encodeStyleTable([], table.anims)).slice();
  recordCount = loadedCount = table.styles.length;
}

function append(record: StyleRecord): number {
  const bytes = body(encodeStyleTable([record], []));
  const grown = new Uint8Array(recordBytes.length + bytes.length);
  grown.set(recordBytes);
  grown.set(bytes, recordBytes.length);
  recordBytes = grown;
  classRuntimeStats.appended++;
  records.push(record);
  return recordCount++;
}

function assemble(): Uint8Array {
  const out = new Uint8Array(HEADER_SIZE + recordBytes.length + animBytes.length);
  out.set(header);
  new DataView(out.buffer).setUint16(6, recordCount, true);
  out.set(recordBytes, HEADER_SIZE);
  out.set(animBytes, HEADER_SIZE + recordBytes.length);
  return out;
}

/** Style id for a class string, compiling and appending it when needed; null = not a class string. */
export function resolveClass(cls: string): number | null {
  const hit = resolveStyle(cls);
  if (hit !== undefined) return hit;
  const norm = cls.trim().replace(/\s+/g, " ");
  const cached = cache.get(norm);
  if (cached !== undefined) return cached;
  if (!enabled) return null;
  classRuntimeStats.compiled++;
  const record = parseClassLiteral(norm);
  let id: number | null = null;
  if (record) {
    const key = JSON.stringify(record);
    id = canonical.get(key) ?? null;
    if (id === null) {
      id = append(record);
      canonical.set(key, id);
    }
  }
  cache.set(norm, id);
  return id;
}

/** Apply a node's className (called by the host config on create and update). */
export function applyClassName(node: NodeMirror, cls: unknown): void {
  const next = typeof cls === "string" ? cls : "";
  if (applied.get(node) === next) return;
  applied.set(node, next);
  if (next.trim() === "") {
    appliedId.delete(node);
    getOps().setStyle(node.id, STYLE_ID_NONE);
    return;
  }
  const id = resolveClass(next);
  if (id !== null) appliedId.set(node, id);
  else appliedId.delete(node);
  if (id === null) {
    // Not compilable: let the framework report it (throws on strict hosts, counts a miss on native ones).
    setProp(node, "class", next);
    return;
  }
  if (id < loadedCount) getOps().setStyle(node.id, id);
  else pending.push([node, id]);
}

/** After a React commit: load the grown table once, then hand waiting nodes their ids. */
export function flushClassTable(): void {
  if (recordCount > loadedCount) {
    getOps().loadStyles?.(assemble());
    loadedCount = recordCount;
    classRuntimeStats.loads++;
  }
  if (pending.length === 0) return;
  const ops = getOps();
  for (const [node, id] of pending) ops.setStyle(node.id, id);
  pending.length = 0;
}
const PROP_NAMES: Record<number, PropName> = Object.fromEntries(
  Object.entries(PROP).map(([name, id]) => [id as number, name as PropName]),
);
const f32 = new DataView(new ArrayBuffer(4));

/** The base-variant value the node's current class record sets for `prop`, in setProp form. */
export function classBaseValue(node: NodeMirror, prop: PropName): number | undefined {
  const id = appliedId.get(node);
  if (id === undefined) return undefined;
  const entry = records[id]?.base?.find((p) => PROP_NAMES[p.prop] === prop);
  if (!entry) return undefined;
  if (PROP_VALUE_KIND[prop] !== VALUE_KIND.f32) return entry.value;
  f32.setUint32(0, entry.value, true);
  return f32.getFloat32(0, true);
}
