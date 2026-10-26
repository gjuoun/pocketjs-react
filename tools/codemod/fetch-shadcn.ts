// Vendor shadcn registry sources, verbatim, for the compat-vendor demos (C3) and the full
// inventory (shadcn-full).
//
//   bun tools/codemod/fetch-shadcn.ts [names...] [--out <dir>] [--style <style>]
//   bun tools/codemod/fetch-shadcn.ts --all [--out <dir>] [--style <style>]
//   bun tools/codemod/fetch-shadcn.ts --verify [--out <dir>]
//
// The only edits to the registry text are import specifiers (a consumer app resolves
// pocketjs-react by name and its sibling components and hooks by relative path); every one of them
// is listed in NOTICE.md next to the file's sha256, so the vendored tree is auditable and the
// --verify pass is offline. Network runs are a deliberate, manual act: the tests never fetch.
//
// --all reads the registry index and takes every registry:ui entry of one style. A name the style
// does not publish (HTTP 404) is listed under "Not published" and is not pulled from another style.
// Registry hooks a vendored file depends on are fetched too. NOTICE.md is upserted by file name and
// refuses to mix two styles in one tree.
import { mkdirSync, readdirSync } from "node:fs";
import { basename, resolve } from "node:path";

const REGISTRY = "https://ui.shadcn.com/r/styles/";
const INDEX = "https://ui.shadcn.com/r/index.json";
const DEFAULT_STYLE = "new-york-v4";
const DEFAULT_OUT = resolve(
  import.meta.dir,
  "../../test/fixtures/shadcn-vendor/upstream",
);
const DEFAULT_NAMES = ["button", "badge", "input", "card", "dialog"];

/** Registry import specifier -> the specifier a local consumer app needs. */
const IMPORT_REMAP: [RegExp, string][] = [
  [/from "cn"/g, 'from "pocketjs-react"'],
  [/from "@\/lib\/utils"/g, 'from "pocketjs-react"'],
  [/from "@\/registry\/[a-z0-9-]+\/ui\/button"/g, 'from "./button.tsx"'],
];

const ROW_LINE = /^\| \x60([^\x60]+)\x60 \| \d+ \| \x60[0-9a-f]{64}\x60 \|/;
const ROW_ALL =
  /^\| \x60([^\x60]+)\x60 \| (\d+) \| \x60([0-9a-f]{64})\x60 \|/gm;
const STYLE_LINE = /^- style: \x60([^\x60]+)\x60/m;
const INDEX_LINE = /^- index: (.+)$/m;
const NOT_PUBLISHED = /^## Not published[\s\S]*$/m;

export interface VendorEntry {
  name: string;
  file: string;
  url: string;
  bytes: number;
  sha256: string;
  remaps: string[];
}

export interface Options {
  names: string[];
  out: string;
  style: string;
  all: boolean;
  verify: boolean;
}

/** Strict argv parse: an unknown flag or a flag without its value is an error, never a silent default. */
export function parseArgs(argv: string[]): Options {
  const opts: Options = {
    names: [],
    out: DEFAULT_OUT,
    style: DEFAULT_STYLE,
    all: false,
    verify: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--all") opts.all = true;
    else if (a === "--verify") opts.verify = true;
    else if (a === "--out" || a === "--style") {
      const value = argv[++i];
      if (!value || value.startsWith("--"))
        throw new Error(a + " needs a value");
      if (a === "--out") opts.out = resolve(value);
      else opts.style = value;
    } else if (a.startsWith("--")) throw new Error("unknown flag " + a);
    else opts.names.push(a);
  }
  if (opts.all && opts.names.length) throw new Error("--all takes no names");
  return opts;
}

export function sha256(bytes: Uint8Array): string {
  const hasher = new Bun.CryptoHasher("sha256");
  hasher.update(bytes);
  return hasher.digest("hex");
}

function rowOf(e: VendorEntry): string {
  return (
    "| \x60" +
    e.file +
    "\x60 | " +
    e.bytes +
    " | \x60" +
    e.sha256 +
    "\x60 | " +
    e.url +
    " | " +
    (e.remaps.length ? e.remaps.join("<br>") : "none") +
    " |"
  );
}

function notPublishedBlock(style: string, names: string[]): string {
  const lines = ["## Not published in " + style, ""];
  if (names.length === 0) lines.push("none");
  for (const name of names)
    lines.push(
      "- \x60" +
        name +
        "\x60 - HTTP 404 in " +
        style +
        " (not vendored; not pulled from another style)",
    );
  return lines.join("\n") + "\n";
}

export interface NoticeInput {
  style: string;
  fetched: string;
  entries: VendorEntry[];
  /** Undefined keeps the block already in NOTICE.md; a list replaces it. */
  notPublished?: string[];
  /** The index.json fingerprint, when this run read the index. */
  index?: string;
}

/** Upsert this run's rows into the existing NOTICE.md text and return the whole new text. */
export function mergeNotice(existing: string, input: NoticeInput): string {
  const prior = STYLE_LINE.exec(existing)?.[1];
  if (prior && prior !== input.style)
    throw new Error(
      "NOTICE.md holds style " + prior + "; refusing to mix in " + input.style,
    );
  const rows = new Map<string, string>();
  for (const line of existing.split("\n")) {
    const hit = ROW_LINE.exec(line);
    if (hit) rows.set(hit[1], line);
  }
  for (const e of input.entries) rows.set(e.file, rowOf(e));
  const index = input.index ?? INDEX_LINE.exec(existing)?.[1];
  const block =
    input.notPublished !== undefined
      ? notPublishedBlock(input.style, input.notPublished)
      : (NOT_PUBLISHED.exec(existing)?.[0] ?? "");
  const lines = [
    "# Vendored shadcn sources (C3)",
    "",
    "Registry sources copied verbatim. The only edits are the import specifiers listed per",
    "file, because a consumer app resolves \x60pocketjs-react\x60 by name and sibling components",
    "and hooks by relative path. \x60bun tools/codemod/fetch-shadcn.ts\x60 re-creates this tree;",
    "\x60--verify\x60 checks the hashes below offline and lists any .ts/.tsx file with no row.",
    "",
    "- style: \x60" + input.style + "\x60",
    "- fetched: " + input.fetched,
    "- registry: " + REGISTRY + input.style + "/<name>.json",
  ];
  if (index) lines.push("- index: " + index);
  lines.push(
    "",
    "| file | bytes | sha256 | upstream | import remaps |",
    "|---|---|---|---|---|",
    ...[...rows.keys()].sort().map((k) => rows.get(k)!),
    "",
    "The vendored files are data, not product code: \x60test/fixtures/**/upstream/\x60",
    "is only read by the codemod, and only its output (\x60../ui/\x60) is imported by the demo.",
    "",
  );
  if (block) lines.push(block);
  return lines.join("\n");
}

/** Text after the documented import remaps, the edits that fired, and any \x60@/\x60 import left over. */
export function remap(
  source: string,
  locals: Record<string, string> = {},
): { text: string; applied: string[]; unresolved: string[] } {
  let text = source;
  const applied: string[] = [];
  for (const [pattern, replacement] of IMPORT_REMAP) {
    const hits = text.match(pattern);
    if (!hits) continue;
    text = text.replace(pattern, replacement);
    for (const hit of new Set(hits))
      applied.push(hit + " -> " + replacement.replace(/^from /, ""));
  }
  for (const name of Object.keys(locals).sort()) {
    const pattern = new RegExp(
      'from "@/registry/[a-z0-9-]+/(?:ui|hooks)/' +
        name.replace(/[.*+?^$()|[\]\\{}]/g, "\\$&") +
        '"',
      "g",
    );
    const hits = text.match(pattern);
    if (!hits) continue;
    const to = '"./' + locals[name] + '"';
    text = text.replace(pattern, "from " + to);
    for (const hit of new Set(hits)) applied.push(hit + " -> " + to);
  }
  const unresolved = [...new Set(text.match(/from "@\/[^"]+"/g) ?? [])].map(
    (s) => s.slice(6, -1),
  );
  return { text, applied, unresolved };
}

interface Fetched {
  file: string;
  content: string;
  url: string;
  type: string;
  deps: string[];
}

async function fetchOne(
  name: string,
  style: string,
  tolerate404: boolean,
): Promise<Fetched | null> {
  const url = REGISTRY + style + "/" + name + ".json";
  const response = await fetch(url);
  if (!response.ok) {
    if (tolerate404 && response.status === 404) return null;
    throw new Error("registry " + url + " -> HTTP " + response.status);
  }
  const json = (await response.json()) as {
    type?: string;
    files?: { path: string; content: string }[];
    registryDependencies?: string[];
  };
  const file = json.files?.[0];
  if (!file) throw new Error("registry " + name + ": no files[] entry");
  const deps = (json.registryDependencies ?? []).map((d) =>
    d.startsWith("http") ? basename(d).replace(/\.json$/, "") : d,
  );
  return {
    file: basename(file.path),
    content: file.content,
    url,
    type: json.type ?? "",
    deps,
  };
}

/** Every registry:ui name in the index, plus the index's sha256 for the NOTICE header. */
async function indexNames(): Promise<{ names: string[]; sha256: string }> {
  const response = await fetch(INDEX);
  if (!response.ok)
    throw new Error("registry index -> HTTP " + response.status);
  const bytes = new Uint8Array(await response.arrayBuffer());
  const list = JSON.parse(new TextDecoder().decode(bytes)) as {
    name: string;
    type: string;
  }[];
  return {
    names: list.filter((e) => e.type === "registry:ui").map((e) => e.name),
    sha256: sha256(bytes),
  };
}

/** Offline: every NOTICE row matches its file, and every .ts/.tsx in the tree has a row. */
export async function verifyDir(out: string): Promise<number> {
  const noticePath = resolve(out, "../NOTICE.md");
  const text = await Bun.file(noticePath).text();
  const rows = [...text.matchAll(ROW_ALL)];
  if (rows.length === 0) {
    console.error("verify: no hash rows in " + noticePath);
    return 1;
  }
  let bad = 0;
  for (const [, file, bytes, hash] of rows) {
    const data = new Uint8Array(
      await Bun.file(resolve(out, file)).arrayBuffer(),
    );
    const ok = data.byteLength === Number(bytes) && sha256(data) === hash;
    if (!ok) bad++;
    console.log(
      (ok ? "ok   " : "DRIFT") +
        " " +
        file +
        " (" +
        data.byteLength +
        " bytes, sha256 " +
        sha256(data).slice(0, 12) +
        "...)",
    );
  }
  const listed = new Set(rows.map((r) => r[1]));
  const unlisted = readdirSync(out)
    .filter((f) => /\.tsx?$/.test(f) && !listed.has(f))
    .sort();
  for (const f of unlisted) console.log("UNLISTED " + f + " (no NOTICE row)");
  console.log(
    "verify: " +
      (rows.length - bad) +
      "/" +
      rows.length +
      " files match NOTICE.md" +
      (unlisted.length ? ", " + unlisted.length + " unlisted" : ""),
  );
  return bad === 0 && unlisted.length === 0 ? 0 : 1;
}

async function main(): Promise<number> {
  let opts: Options;
  try {
    opts = parseArgs(process.argv.slice(2));
  } catch (error) {
    console.error((error as Error).message);
    return 2;
  }
  if (opts.verify) return verifyDir(opts.out);

  let indexSha: string | undefined;
  let names = opts.names.length ? opts.names : DEFAULT_NAMES;
  if (opts.all) {
    const index = await indexNames();
    names = index.names;
    indexSha = index.sha256 + "  " + INDEX;
  }
  const requested = new Set(names);

  // Phase 1: fetch every requested name, and the hooks they depend on.
  const fetched = new Map<string, Fetched>();
  const notPublished: string[] = [];
  const queue = [...names];
  while (queue.length) {
    const name = queue.shift()!;
    if (fetched.has(name) || notPublished.includes(name)) continue;
    const got = await fetchOne(name, opts.style, opts.all);
    if (!got) {
      notPublished.push(name);
      continue;
    }
    // A component a named run did not ask for is left to that run; only hooks come along.
    if (!requested.has(name) && got.type !== "registry:hook") continue;
    fetched.set(name, got);
    for (const dep of got.deps)
      if (
        !fetched.has(dep) &&
        !requested.has(dep) &&
        !notPublished.includes(dep)
      )
        queue.push(dep);
    if (!requested.has(name))
      console.log("dependency " + name + " (" + got.type + ")");
  }

  // Phase 2: remap against the local file names of everything fetched, then write.
  mkdirSync(opts.out, { recursive: true });
  const locals: Record<string, string> = {};
  for (const [name, f] of fetched) locals[name] = f.file;
  const entries: VendorEntry[] = [];
  for (const [name, f] of fetched) {
    const { text, applied, unresolved } = remap(f.content, locals);
    const bytes = new TextEncoder().encode(text);
    await Bun.write(resolve(opts.out, f.file), bytes);
    const entry: VendorEntry = {
      name,
      file: f.file,
      url: f.url,
      bytes: bytes.byteLength,
      sha256: sha256(bytes),
      remaps: [...applied, ...unresolved.map((u) => "UNRESOLVED " + u)],
    };
    entries.push(entry);
    console.log(
      "wrote " +
        f.file +
        " (" +
        entry.bytes +
        " bytes, sha256 " +
        entry.sha256.slice(0, 12) +
        "...)",
    );
    for (const edit of applied) console.log("  remap " + edit);
    for (const u of unresolved) console.log("  UNRESOLVED " + u);
  }

  // Phase 3: upsert NOTICE.md (per file name; a named run keeps the existing Not published block).
  const noticePath = resolve(opts.out, "../NOTICE.md");
  const existing = (await Bun.file(noticePath).exists())
    ? await Bun.file(noticePath).text()
    : "";
  await Bun.write(
    noticePath,
    mergeNotice(existing, {
      style: opts.style,
      fetched: new Date().toISOString().slice(0, 10),
      entries,
      notPublished: opts.all ? notPublished : undefined,
      index: indexSha,
    }),
  );
  if (opts.all)
    for (const name of notPublished)
      console.log("not published in " + opts.style + ": " + name);
  console.log("notice: " + noticePath);
  return 0;
}

if (import.meta.main) process.exit(await main());
