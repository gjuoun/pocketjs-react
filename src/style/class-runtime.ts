// Runtime className. PocketJS resolves a class string by exact match against the table
// compiled at build time, and the core's loadStyles replaces the whole table. To let any
// string React code produces work (ternaries, clsx, cn/twMerge):
//   - a string in the build table resolves to its id;
//   - any other string is compiled in the guest by PocketJS's own Tailwind compiler
//     (parseClassLiteral, the same code the build runs), deduped, and appended to the table,
//     so ids stay stable and focus:/active:/transitions stay native;
//   - new records are encoded incrementally (only the new record's bytes) and the grown
//     table is loaded ONCE per React commit; nodes waiting on a new id get it after that load.
// As with Tailwind, every utility must appear as a complete token somewhere in the source.
// The runtime only compiles class strings made of tokens the build scan found; a name
// assembled at runtime (`p-${n}`) is rejected (thrown on strict hosts such as the browser,
// reported and dropped on native ones), never compiled behind the author's back.

import { getHost, getOps } from "@pocketjs/framework/host";
import { bakedTimelines } from "@pocket-internal/framework/compiler/animation.ts";
import type { AnimTimeline } from "@pocket-internal/contracts/spec/spec.ts";
import { dropReason, rewrite } from "../compat/tokens.ts";
import { setBindings } from "./vars.ts";
import { setPercents } from "./percent.ts";
import {
  decodeStyleTable,
  encodeStyleTable,
  type NodeMirror,
  PROP,
  PROP_VALUE_KIND,
  type PropName,
  parseClassLiteral,
  resolveStyle,
  STYLE_ID_NONE,
  type StyleRecord,
  setProp,
  VALUE_KIND,
} from "../internal/pocket.ts";

const HEADER_SIZE = 12;

let enabled = false;
let known = new Set<string>();
const reported = new Set<string>();
let header = new Uint8Array(0);
let recordBytes = new Uint8Array(0);
let animBytes = new Uint8Array(0);
/** The ANIM TABLE every record may reference (a record's animation ids index it). It starts as the
 *  build's table and grows when the compiler bakes a timeline a runtime literal needs. */
let timelines: AnimTimeline[] = [];
let recordCount = 0;
let loadedCount = 0;
const canonical = new Map<string, number>();
const cache = new Map<string, number | null>();
const pending: Array<[NodeMirror, number]> = [];
const applied = new WeakMap<NodeMirror, string>();
const appliedId = new WeakMap<NodeMirror, number>();
let records: StyleRecord[] = [];

export const classRuntimeStats = {
  compiled: 0,
  appended: 0,
  loads: 0,
  /** Unseen tokens dropped under the classMiss drop policy (wired in that policy). */
  droppedTokens: 0,
  /** Literals that produced no style id under the drop policy (all-unknown or rejected). */
  droppedLiterals: 0,
  /** Tokens the compat token map moved to PocketJS vocabulary (bg-primary -> bg-slate-900). */
  mappedTokens: 0,
  /** Tokens the compat token map dropped on purpose (dark:, rounded-full, ring-*, ...). */
  mapDroppedTokens: 0,
  /** Every dropped token (map or classMiss), counted by its policy reason (C8 Step 11). */
  unsupported: {} as Record<string, number>,
};

/** What happens to class tokens the build scan never collected. "throw" keeps the strict
 *  web-host contract (and the native host's report-and-drop); "drop" keeps the supported
 *  subset, counts the rest, and never crashes - the shadcn-compat failure mode until the
 *  token mapper (C2) shrinks the drop set to zero. */
export type ClassMissPolicy = "throw" | "drop";
let missPolicy: ClassMissPolicy = "throw";

/** Zero the class-miss and token-map counters (compatStats() owns the public reset). */
export function resetClassMissStats(): void {
  classRuntimeStats.droppedTokens = 0;
  classRuntimeStats.droppedLiterals = 0;
  classRuntimeStats.mappedTokens = 0;
  classRuntimeStats.mapDroppedTokens = 0;
  for (const key of Object.keys(classRuntimeStats.unsupported))
    delete classRuntimeStats.unsupported[key];
}

function countUnsupported(reason: string, n = 1): void {
  classRuntimeStats.unsupported[reason] =
    (classRuntimeStats.unsupported[reason] ?? 0) + n;
}

/** The C2 token map: rewrite shadcn vocabulary into PocketJS vocabulary before resolving.
 *  Off until mount() installs the compat layer, so direct class-runtime users keep the
 *  strict contract; compat mounts turn it on by default (opt out with tokenMap: false). */
let tokenMapEnabled = false;

export function setTokenMapEnabled(enabled: boolean): void {
  tokenMapEnabled = enabled;
}

export function setClassMissPolicy(mode: ClassMissPolicy): void {
  missPolicy = mode;
}

// Miss bookkeeping for the outermost resolve call only (the kept-subset recursion resets
// nothing), so applyClassName can count a literal exactly once per unique literal. Token
// counts accumulate straight into classRuntimeStats.
let resolveDepth = 0;
let missLiteral = false;

function body(table: Uint8Array): Uint8Array {
  return table.subarray(HEADER_SIZE);
}

/** Start from the build's styles.bin (the table the host already loaded from the pak). */
export function initClassRuntime(
  bin: Uint8Array,
  tokens: readonly string[] = [],
): void {
  known = new Set(tokens);
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
  timelines = table.anims.slice();
  animBytes = animSection(timelines);
  recordBytes = recordsOf(table.styles, timelines);
  recordCount = loadedCount = table.styles.length;
}

/** The anim section alone: what encodeStyleTable writes after the records. */
function animSection(anims: readonly AnimTimeline[]): Uint8Array<ArrayBuffer> {
  return new Uint8Array(body(encodeStyleTable([], anims)));
}

/**
 * The record bytes of `styles`, validated against `anims`. encodeStyleTable checks every animation id
 * against the table it is given, so the records are encoded WITH the table and the anim section is cut
 * off the end (records come first in the encoding). Encoding them against an empty table is what threw
 * "bad anim id" for every skeleton and spinner.
 */
function recordsOf(
  styles: readonly StyleRecord[],
  anims: readonly AnimTimeline[],
): Uint8Array<ArrayBuffer> {
  const full = body(encodeStyleTable(styles, anims));
  return new Uint8Array(
    full.subarray(0, full.length - animSection(anims).length),
  );
}

/**
 * Take in timelines the compiler has baked since the table was read. The table the build shipped is authoritative:
 * a registry shorter than it never replaces it. In a built bundle this module's registry is its own copy and starts
 * empty (the build baked the timelines in another process), so replacing the table with it dropped every animation
 * from the grown table and left the records' animation ids dangling.
 */
function syncTimelines(): void {
  const live = bakedTimelines();
  if (live.length <= timelines.length) return;
  timelines = live.slice();
  animBytes = animSection(timelines);
}

function append(record: StyleRecord): number {
  syncTimelines();
  const bytes = recordsOf([record], timelines);
  const grown = new Uint8Array(recordBytes.length + bytes.length);
  grown.set(recordBytes);
  grown.set(bytes, recordBytes.length);
  recordBytes = grown;
  classRuntimeStats.appended++;
  records.push(record);
  return recordCount++;
}

function assemble(): Uint8Array {
  const out = new Uint8Array(
    HEADER_SIZE + recordBytes.length + animBytes.length,
  );
  out.set(header);
  const view = new DataView(out.buffer);
  view.setUint16(6, recordCount, true);
  view.setUint16(8, timelines.length, true);
  out.set(recordBytes, HEADER_SIZE);
  out.set(animBytes, HEADER_SIZE + recordBytes.length);
  return out;
}

/** Style id for a class string, compiling and appending it when needed; null = not a class string. */
export function resolveClass(cls: string): number | null {
  if (resolveDepth === 0) {
    missLiteral = false;
  }
  resolveDepth++;
  try {
    const hit = resolveStyle(cls);
    if (hit !== undefined) return hit;
    const norm = cls.trim().replace(/\s+/g, " ");
    const cached = cache.get(norm);
    if (cached !== undefined) return cached;
    if (!enabled) return null;
    const parts = norm.split(" ");
    const unseen = parts.filter((tok) => !known.has(tok));
    if (unseen.length > 0) {
      if (missPolicy === "drop") {
        classRuntimeStats.droppedTokens += unseen.length;
        countUnsupported("not-in-build", unseen.length);
        classRuntimeStats.droppedLiterals++;
        missLiteral = true;
        if (!reported.has(norm)) {
          reported.add(norm);
          console.error(
            "pocketjs-react: dropping class token(s) " +
              unseen.map((t) => JSON.stringify(t)).join(", ") +
              " - not in the build table (compat classMiss=drop; see compatStats)",
          );
        }
      } else {
        const message =
          "pocketjs-react: class token " +
          unseen.map((t) => JSON.stringify(t)).join(", ") +
          " does not appear in the source; write Tailwind utilities as complete tokens (a name built at runtime cannot be found by the build scan)";
        if (getHost().strict) throw new Error(message);
        if (!reported.has(norm)) {
          reported.add(norm);
          console.error(message);
        }
      }
    }
    const kept = parts.filter((tok) => known.has(tok)).join(" ");
    if (kept !== norm) {
      const id = kept === "" ? null : resolveClass(kept);
      cache.set(norm, id);
      return id;
    }
    classRuntimeStats.compiled++;
    let record: StyleRecord | null = null;
    try {
      record = parseClassLiteral(norm);
    } catch (error) {
      if (missPolicy === "throw") throw error;
      // The compiler rejects some all-known literals outright (rounded-full without a
      // build-time size): under the drop policy that is a counted miss, not a crash.
      classRuntimeStats.droppedLiterals++;
      missLiteral = true;
      cache.set(norm, null);
      return null;
    }
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
  } finally {
    resolveDepth--;
  }
}

/** Apply a node's className (called by the host config on create and update). */
/** Read-only: the class string last applied to a node (QA gates read it; no runtime effect). */
export function classOf(node: NodeMirror): string {
  return applied.get(node) ?? "";
}

export function applyClassName(node: NodeMirror, cls: unknown): void {
  const raw = typeof cls === "string" ? cls : "";
  if (applied.get(node) === raw) return;
  applied.set(node, raw);
  const rewritten = tokenMapEnabled ? rewrite(raw) : undefined;
  setBindings(node, rewritten?.bindings ?? []);
  setPercents(node, rewritten?.percents ?? []);
  const next = rewritten ? rewritten.text : raw;
  if (rewritten) {
    classRuntimeStats.mappedTokens += rewritten.mapped;
    classRuntimeStats.mapDroppedTokens += rewritten.dropped;
    for (const tok of rewritten.droppedTokens)
      countUnsupported(dropReason(tok));
  }
  if (next.trim() === "") {
    appliedId.delete(node);
    getOps().setStyle(node.id, STYLE_ID_NONE);
    return;
  }
  const id = resolveClass(next);
  if (id !== null) appliedId.set(node, id);
  else appliedId.delete(node);
  if (id === null) {
    if (missPolicy === "drop") {
      // Counted unstyled (the unseen-token path already flagged the literal); never hand an
      // unknown literal to the framework's setClass, which throws on strict hosts.
      if (!missLiteral) classRuntimeStats.droppedLiterals++;
      return;
    }
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

/** True when the node's class sets `prop` in a focus: or active: variant (the core applies those natively). */
export function classVariantOwns(node: NodeMirror, prop: PropName): boolean {
  const id = appliedId.get(node);
  const record = id === undefined ? undefined : records[id];
  if (!record) return false;
  const want = PROP[prop];
  return [record.focus, record.active].some(
    (v) => v?.some((p) => p.prop === want) === true,
  );
}

/** The base-variant value the node's current class record sets for `prop`, in setProp form. */
/** The base-variant value a class string sets for `prop`, read from the record it compiles to. */
export function classStringValue(
  cls: string,
  prop: PropName,
): number | undefined {
  const id = resolveClass(cls);
  if (id === null) return undefined;
  const entry = records[id]?.base?.find((p) => PROP_NAMES[p.prop] === prop);
  if (!entry) return undefined;
  if (PROP_VALUE_KIND[prop] !== VALUE_KIND.f32) return entry.value;
  f32.setUint32(0, entry.value, true);
  return f32.getFloat32(0, true);
}

export function classBaseValue(
  node: NodeMirror,
  prop: PropName,
): number | undefined {
  return classVariantValue(node, prop, "base");
}

/** The value the node's class record sets for `prop` in the base or the focus: variant, in setProp form. */
export function classVariantValue(
  node: NodeMirror,
  prop: PropName,
  variant: "base" | "focus",
): number | undefined {
  const id = appliedId.get(node);
  if (id === undefined) return undefined;
  const list = variant === "base" ? records[id]?.base : records[id]?.focus;
  const entry = list?.find((p) => PROP_NAMES[p.prop] === prop);
  if (!entry) return undefined;
  if (PROP_VALUE_KIND[prop] !== VALUE_KIND.f32) return entry.value;
  f32.setUint32(0, entry.value, true);
  return f32.getFloat32(0, true);
}
