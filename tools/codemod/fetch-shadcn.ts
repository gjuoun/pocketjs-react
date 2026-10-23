// Vendor shadcn registry sources, verbatim, for the compat-vendor demo (C3).
//
//   bun tools/codemod/fetch-shadcn.ts [names...] [--out <dir>] [--style new-york-v4]
//   bun tools/codemod/fetch-shadcn.ts --verify [--out <dir>]
//
// The only edits to the registry text are import specifiers (a consumer app resolves
// pocketjs-react by name and its sibling components by relative path); every one of them is
// listed in NOTICE.md next to the file's sha256, so the vendored tree is auditable and the
// --verify pass is offline. Network runs are a deliberate, manual act: the tests never fetch.
import { mkdirSync } from "node:fs";
import { basename, resolve } from "node:path";

const REGISTRY = "https://ui.shadcn.com/r/styles/";
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

export interface VendorEntry {
  name: string;
  file: string;
  url: string;
  bytes: number;
  sha256: string;
  remaps: string[];
}

function args(): {
  names: string[];
  out: string;
  style: string;
  verify: boolean;
} {
  const argv = process.argv.slice(2);
  const get = (flag: string, fallback: string) => {
    const i = argv.indexOf(flag);
    return i >= 0 && argv[i + 1] ? argv[i + 1] : fallback;
  };
  return {
    names: argv.filter(
      (a, i) =>
        !a.startsWith("--") &&
        !["--out", "--style"].includes(argv[i - 1] ?? ""),
    ),
    out: resolve(get("--out", DEFAULT_OUT)),
    style: get("--style", DEFAULT_STYLE),
    verify: argv.includes("--verify"),
  };
}

export function sha256(bytes: Uint8Array): string {
  const hasher = new Bun.CryptoHasher("sha256");
  hasher.update(bytes);
  return hasher.digest("hex");
}

function notice(style: string, entries: VendorEntry[]): string {
  const lines = [
    "# Vendored shadcn sources (C3)",
    "",
    "Registry sources copied verbatim. The only edits are the import specifiers listed per",
    "file, because a consumer app resolves `pocketjs-react` by name and sibling components by",
    "relative path. `bun tools/codemod/fetch-shadcn.ts` re-creates this tree;",
    "`--verify` checks the hashes below offline.",
    "",
    "- style: `" + style + "`",
    "- fetched: " + new Date().toISOString().slice(0, 10),
    "- registry: " + REGISTRY + style + "/<name>.json",
    "",
    "| file | bytes | sha256 | upstream | import remaps |",
    "|---|---|---|---|---|",
  ];
  for (const e of entries) {
    lines.push(
      "| `" +
        e.file +
        "` | " +
        e.bytes +
        " | `" +
        e.sha256 +
        "` | " +
        e.url +
        " | " +
        (e.remaps.length ? e.remaps.join("<br>") : "none") +
        " |",
    );
  }
  lines.push(
    "",
    "The vendored files are data, not product code: `test/fixtures/shadcn-vendor/upstream/`",
  );
  lines.push(
    "is only read by the codemod, and only its output (`../ui/`) is imported by the demo.",
  );
  lines.push("");
  return lines.join("\n");
}

/** Text after the documented import remaps, plus the list of edits that fired. */
export function remap(source: string): { text: string; applied: string[] } {
  let text = source;
  const applied: string[] = [];
  for (const [pattern, replacement] of IMPORT_REMAP) {
    const hits = text.match(pattern);
    if (!hits) continue;
    text = text.replace(pattern, replacement);
    for (const hit of new Set(hits))
      applied.push(hit + " -> " + replacement.replace(/^from /, ""));
  }
  return { text, applied };
}

async function fetchOne(
  name: string,
  style: string,
): Promise<{ file: string; content: string; url: string }> {
  const url = REGISTRY + style + "/" + name + ".json";
  const response = await fetch(url);
  if (!response.ok)
    throw new Error("registry " + url + " -> HTTP " + response.status);
  const json = (await response.json()) as {
    files?: { path: string; content: string }[];
  };
  const file = json.files?.[0];
  if (!file) throw new Error("registry " + name + ": no files[] entry");
  return { file: basename(file.path), content: file.content, url };
}

async function verify(out: string): Promise<number> {
  const noticePath = resolve(out, "../NOTICE.md");
  const text = await Bun.file(noticePath).text();
  const rows = [
    ...text.matchAll(/^\| `([^`]+)` \| (\d+) \| `([0-9a-f]{64})` \|/gm),
  ];
  if (rows.length === 0) {
    console.error("verify: no hash rows in " + noticePath);
    return 1;
  }
  let bad = 0;
  for (const [, file, bytes, hash] of rows) {
    const path = resolve(out, file);
    const data = new Uint8Array(await Bun.file(path).arrayBuffer());
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
        "…)",
    );
  }
  console.log(
    "verify: " +
      (rows.length - bad) +
      "/" +
      rows.length +
      " files match NOTICE.md",
  );
  return bad === 0 ? 0 : 1;
}

async function main(): Promise<number> {
  const opts = args();
  if (opts.verify) return verify(opts.out);
  const names = opts.names.length ? opts.names : DEFAULT_NAMES;
  mkdirSync(opts.out, { recursive: true });
  const entries: VendorEntry[] = [];
  for (const name of names) {
    const source = await fetchOne(name, opts.style);
    const { text, applied } = remap(source.content);
    const bytes = new TextEncoder().encode(text);
    await Bun.write(resolve(opts.out, source.file), bytes);
    const entry: VendorEntry = {
      name,
      file: source.file,
      url: source.url,
      bytes: bytes.byteLength,
      sha256: sha256(bytes),
      remaps: applied,
    };
    entries.push(entry);
    console.log(
      "wrote " +
        source.file +
        " (" +
        entry.bytes +
        " bytes, sha256 " +
        entry.sha256.slice(0, 12) +
        "…)",
    );
    for (const edit of applied) console.log("  remap " + edit);
  }
  const noticePath = resolve(opts.out, "../NOTICE.md");
  await Bun.write(noticePath, notice(opts.style, entries));
  console.log("notice: " + noticePath);
  return 0;
}

if (import.meta.main) process.exit(await main());
