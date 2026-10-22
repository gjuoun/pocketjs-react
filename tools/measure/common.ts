// Shared pieces of the measurement scripts: the app profiles (build, d-pad script, metrics,
// budgets), the timing prelude/postlude wrapper, and the report.
import { join, resolve } from "node:path";
import { build, type BuildResult } from "../build.ts";
import { buildReader } from "../build-reader.ts";

export const ROOT = resolve(import.meta.dir, "../..");
export const OUT = join(ROOT, "dist/measure");
export const RUNS = 3;

export interface Profile {
  name: string;
  build(): Promise<BuildResult>;
  /** Button names in press order (see post.js / DESKTOP_KEY). */
  script: string[];
  /** Metric name -> indexes into the script whose press frames it summarizes. */
  metrics: Record<string, number[]>;
  /** first_render plus metric medians; exceeding one fails the run. */
  budgets: Record<string, number>;
  /** Per-host budget overrides (merged over budgets). */
  hostBudgets?: Record<string, Record<string, number>>;
  /** The browser page measure:web serves: the stock hosts/web index.html (default) or the reader's
   *  host page, which runs the app through app-instance.js with runtime glyphs. */
  webPage?: "stock" | "app-instance";
  /** Screens worth keeping as images, by press index (-1 = before the first press). */
  shots?: Record<number, string>;
}

const LIST_DIALOG_SCRIPT = "down circle down circle circle down down down down down circle down down up circle up".split(" ");
/** Open the bundled book, open chapter 4, turn 5 pages, switch chapter twice, open the menu. */
const READER_SCRIPT = "circle down down down down circle right right right right right rtrigger rtrigger start cross".split(" ");
/** Move to the bundled Chinese book, open it, open chapter 1, turn 5 pages, switch chapter twice, open the menu. */
const READER_CJK_SCRIPT = "down circle circle right right right right right rtrigger rtrigger start cross".split(" ");

export const PROFILES: Record<string, Profile> = {
  "list-dialog": {
    name: "list-dialog",
    build: () => build(join(ROOT, "examples/list-dialog/main.tsx"), { outdir: OUT, minify: true }),
    script: LIST_DIALOG_SCRIPT,
    metrics: { update: LIST_DIALOG_SCRIPT.flatMap((b, i) => (b === "circle" ? [i] : [])) },
    budgets: { first_render: 100, update: 8 },
  },
  // A 40x18 monospace plasma redrawn every frame; CROSS pauses, CROSS again restarts.
  "ascii-anim": {
    name: "ascii-anim",
    build: () => build(join(ROOT, "examples/ascii-anim/main.tsx"), { outdir: OUT, minify: true }),
    script: "down circle cross cross".split(" "),
    metrics: { update: [0, 1], toggle: [2, 3] },
    budgets: { first_render: 120, update: 14, toggle: 10 },
    shots: { [-1]: "frame-a", 0: "frame-b", 2: "paused", 3: "resumed" },
  },
  reader: {
    name: "reader",
    build: () => buildReader({ outdir: OUT, minify: true }),
    script: READER_SCRIPT,
    metrics: { open: [0], chapter_open: [5], page: [6, 7, 8, 9, 10], chapter: [11, 12], menu: [13] },
    budgets: { first_render: 100, open: 60, chapter_open: 30, page: 8, chapter: 30 },
    shots: { [-1]: "library", 0: "contents", 5: "reading-page-1", 6: "reading-page-2" },
  },
  // The reader with the CJK set baked (the desktop host draws it) and the Chinese test book bundled.
  // On the browser page the same build runs with runtime glyphs: its first chapter rasterizes ~1,000
  // glyphs cold, later chapters are warmed while reading.
  "reader-cjk": {
    name: "reader-cjk",
    build: () => buildReader({ outdir: OUT, minify: true, name: "reader-cjk", cjk: true, books: { "sanguo.epub": join(ROOT, "test/fixtures/books/sanguo.epub") } }),
    script: READER_CJK_SCRIPT,
    metrics: { open: [1], chapter_open: [2], page: [3, 4, 5, 6, 7], chapter: [8, 9], menu: [10] },
    budgets: { first_render: 100, chapter_open: 60, page: 8, chapter: 60 },
    hostBudgets: { web: { chapter_open: 600 } },
    webPage: "app-instance",
    shots: { [-1]: "library", 1: "contents", 2: "reading-page-1", 3: "reading-page-2" },
  },
};

export function profileFromArgs(): Profile {
  const args = process.argv.slice(2);
  const i = args.indexOf("--app");
  const name = i >= 0 ? args[i + 1] : args.find((a) => a.startsWith("--app="))?.slice(6) ?? "list-dialog";
  const profile = PROFILES[name];
  if (!profile) throw new Error("unknown --app " + name + " (one of " + Object.keys(PROFILES).join(", ") + ")");
  return profile;
}

/** guest.js = prelude + indirect eval of the bundle source (parse is timed) + postlude. */
export async function wrapGuest(bundle: string, out: string): Promise<string> {
  const here = import.meta.dir + "/";
  const pre = await Bun.file(here + "pre.js").text();
  const post = await Bun.file(here + "post.js").text();
  const body = await Bun.file(bundle).text();
  await Bun.write(out, pre + "\n;(0, eval)(" + JSON.stringify(body) + ");\n" + post);
  return out;
}

/** One run: first render plus, per metric, the median and max guest frame time of its presses. */
export type RunSummary = Record<string, { median: number; max: number }> & { first_render: { median: number; max: number } };

export function summarize(lines: string[], profile: Profile): RunSummary {
  const first = /first-render total_ms=([\d.]+)/.exec(lines.join("\n"));
  const presses = lines.flatMap((l) => { const m = /press (\w+) frame_ms=([\d.]+)/.exec(l); return m ? [{ name: m[1], ms: Number(m[2]) }] : []; });
  if (!first || presses.length < profile.script.length) throw new Error("measurement lines missing (" + presses.length + "/" + profile.script.length + " presses):\n" + lines.join("\n"));
  const out = { first_render: { median: Number(first[1]), max: Number(first[1]) } } as RunSummary;
  for (const [metric, indexes] of Object.entries(profile.metrics)) {
    const xs = indexes.map((i) => {
      if (presses[i].name !== profile.script[i]) throw new Error("press " + i + " was " + presses[i].name + ", expected " + profile.script[i]);
      return presses[i].ms;
    }).sort((a, b) => a - b);
    out[metric] = { median: xs[xs.length >> 1], max: xs[xs.length - 1] };
  }
  return out;
}

export function report(host: string, runs: RunSummary[], built: BuildResult, profile: Profile): number {
  const range = (xs: number[]) => Math.min(...xs).toFixed(2) + "-" + Math.max(...xs).toFixed(2);
  const parts = ["first_render_ms=" + range(runs.map((r) => r.first_render.median))];
  for (const metric of Object.keys(profile.metrics)) parts.push(metric + "_median_ms=" + range(runs.map((r) => r[metric].median)) + " " + metric + "_max_ms=" + range(runs.map((r) => r[metric].max)));
  console.log(host + " app=" + profile.name + " runs=" + runs.length + " " + parts.join(" "));
  const gz = Bun.gzipSync(new Uint8Array(require("node:fs").readFileSync(built.js))).length;
  console.log(host + " bundle_bytes=" + built.bundleBytes + " gzip_bytes=" + gz + " pak_bytes=" + built.pakBytes + " (minified)");
  const over: string[] = [];
  for (const [metric, budget] of Object.entries({ ...profile.budgets, ...profile.hostBudgets?.[host] })) for (const r of runs) if (r[metric].median > budget) over.push(metric + " " + r[metric].median + " > " + budget);
  if (over.length > 0) {
    console.error(host + " BUDGET EXCEEDED: " + over.join(", "));
    return 1;
  }
  return 0;
}
