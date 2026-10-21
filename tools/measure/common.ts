// Shared pieces of the measurement scripts: build the example, wrap it with the timing
// prelude/postlude, the d-pad script, and the budget gates.
import { join, resolve } from "node:path";
import { build, type BuildResult } from "../build.ts";

export const ROOT = resolve(import.meta.dir, "../..");
export const OUT = join(ROOT, "dist/measure");
export const RUNS = 3;
/** Budgets: about 4x the measured values; exceeding one fails the run. */
export const BUDGET = { firstRenderMs: 100, medianUpdateMs: 8 };
/** Focus Alpha, toggle it, toggle Bravo on and off, open the dialog, try to leave it, close it. */
export const SCRIPT = "down circle down circle circle down down down down down circle down down up circle up".split(" ");

export async function buildExample(): Promise<BuildResult> {
  return build(join(ROOT, "examples/list-dialog/main.tsx"), { outdir: OUT, minify: true });
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

export interface RunSummary { firstRenderMs: number; medianMs: number; maxMs: number }

export function summarize(lines: string[]): RunSummary {
  const first = /first-render total_ms=([\d.]+)/.exec(lines.join("\n"));
  const sum = /summary circlePresses=5 median_ms=([\d.]+) max_ms=([\d.]+)/.exec(lines.join("\n"));
  if (!first || !sum) throw new Error("measurement lines missing:\n" + lines.join("\n"));
  return { firstRenderMs: Number(first[1]), medianMs: Number(sum[1]), maxMs: Number(sum[2]) };
}

export function report(host: string, runs: RunSummary[], built: BuildResult): number {
  const range = (xs: number[]) => Math.min(...xs).toFixed(2) + "-" + Math.max(...xs).toFixed(2);
  console.log(host + " runs=" + runs.length + " first_render_ms=" + range(runs.map((r) => r.firstRenderMs)) + " update_median_ms=" + range(runs.map((r) => r.medianMs)) + " update_max_ms=" + range(runs.map((r) => r.maxMs)));
  const gz = Bun.gzipSync(new Uint8Array(require("node:fs").readFileSync(built.js))).length;
  console.log(host + " bundle_bytes=" + built.bundleBytes + " gzip_bytes=" + gz + " pak_bytes=" + built.pakBytes + " (minified)");
  const over = runs.filter((r) => r.firstRenderMs > BUDGET.firstRenderMs || r.medianMs > BUDGET.medianUpdateMs);
  if (over.length > 0) {
    console.error(host + " BUDGET EXCEEDED: first render > " + BUDGET.firstRenderMs + " ms or median update > " + BUDGET.medianUpdateMs + " ms");
    return 1;
  }
  return 0;
}
