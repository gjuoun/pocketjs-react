// Gallery defects, round 3: compat defects the acceptance gates find on the gallery page. The pixel checks run on both
// cores and read each label against its own fill inside its section, as gate 1 does. The gate checks run the acceptance
// runner on one section at a time and need the overlay core (nodeRect), so they run only when POCKETJS_CORE_ROOT is set.
import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { BTN } from "@pocketjs/framework/input";
import { build } from "../tools/build.ts";
import { SECTIONS, TITLE_H } from "./fixtures/shadcn-gallery/layout.ts";
import { bootApp, type Core, type TextRun } from "./harness.ts";

const ROOT = resolve(import.meta.dir, "..");
const ENTRY = join(ROOT, "test/fixtures/shadcn-gallery/main.tsx");
const OVERLAY = process.env.POCKETJS_CORE_ROOT !== undefined;
const GATE_OUT = "/tmp/pocketjs-react-qa/acceptance";
/** Gate 1 needs 3:1 on every run it reads. */
const MIN_RATIO = 3;

async function bootGallery(): Promise<Core> {
  const built = await build(ENTRY, { outdir: join(ROOT, "dist"), name: "shadcn-gallery" });
  return bootApp(built);
}

/** Yield one frame so React's scheduled work runs (as the defects file does). */
async function frame(core: Core, buttons = 0): Promise<void> {
  core.step(buttons);
  await new Promise<void>((resolve) => setTimeout(resolve, 0));
}

/** A d-pad press: held for two frames, released, settled. */
async function press(core: Core, buttons: number): Promise<void> {
  await frame(core, buttons);
  await frame(core, buttons);
  await frame(core, 0);
  await frame(core, 0);
}

/** Move the gallery down to the named section (one section per DOWN). `at` is the index already at the top. */
async function visit(core: Core, at: { i: number }, name: string): Promise<number> {
  const target = SECTIONS.findIndex((s) => s.name === name);
  for (; at.i < target; at.i++) await press(core, BTN.DOWN);
  core.texts();
  return SECTIONS[target].h;
}

/** WCAG contrast ratio of two #rrggbb colours. */
function contrast(a: string, b: string): number {
  const lum = (hex: string) => {
    const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  };
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

interface Box {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

interface Read {
  fill: string;
  ink: string;
  ratio: number;
}

/**
 * A region read the way gate 1 reads a run: the fill is the most common colour in the ring 3 px around the region, and the
 * ink is the non-fill colour furthest from it. The region and its ring stay inside the section (TITLE_H .. bottom), so a
 * neighbouring section's title bar is never read as this section's ink.
 */
function read(core: Core, box: Box, bottom: number): Read {
  core.render();
  const inside = (y: number) => y >= TITLE_H && y < bottom;
  const ring = new Map<string, number>();
  const at = (x: number, y: number) => {
    if (!inside(y)) return;
    const p = core.pixel(x, y);
    ring.set(p, (ring.get(p) ?? 0) + 1);
  };
  for (let x = box.x0 - 3; x < box.x1 + 3; x++) { at(x, box.y0 - 3); at(x, box.y1 + 2); }
  for (let y = box.y0 - 3; y < box.y1 + 3; y++) { at(box.x0 - 3, y); at(box.x1 + 2, y); }
  const fill = [...ring.entries()].sort((x, y) => y[1] - x[1])[0]?.[0] ?? "#ffffff";
  let ink = fill;
  let best = 1;
  for (let y = box.y0; y < box.y1; y++) for (let x = box.x0; x < box.x1; x++) {
    if (!inside(y)) continue;
    const p = core.pixel(x, y);
    if (p === fill) continue;
    const c = contrast(p, fill);
    if (c > best) { best = c; ink = p; }
  }
  return { fill, ink, ratio: best };
}

/** The box of a captured text run. */
function runBox(r: TextRun): Box {
  return { x0: r.x, y0: r.y, x1: r.x + r.w, y1: r.y + r.h };
}

/** The captured runs with this text, within the section's own rows (below its title bar, above its bottom). */
function runsOf(core: Core, text: string, h: number): TextRun[] {
  return core.texts().filter((r) => r.text === text && r.y >= TITLE_H && r.y < h);
}

interface GateRow {
  g1: { fails: { text: string; ratio: number }[] };
  g2: { findings: { detail: string }[] };
}

/** One section through the acceptance runner on the overlay core; the runner writes its row to a JSON file. */
function gateRow(name: string): GateRow {
  Bun.spawnSync([process.execPath, "tools/qa/acceptance/run.ts", "--component", name], { cwd: ROOT, env: process.env, stdout: "ignore", stderr: "ignore" });
  return JSON.parse(readFileSync(GATE_OUT + "/" + name + ".json", "utf8"));
}

// @@labels
test("labels on light surfaces: command, menubar, navigation-menu and toggle-group labels read on their fill", async () => {
  const core = await bootGallery();
  const at = { i: 0 };
  const wanted: [string, string[]][] = [
    ["command", ["Search"]],
    ["menubar", ["File", "Edit"]],
    ["navigation-menu", ["Docs"]],
    ["toggle-group", ["A", "B"]],
  ];
  const reads: string[] = [];
  const bad: string[] = [];
  for (const [section, texts] of wanted) {
    const h = await visit(core, at, section);
    for (const text of texts) {
      const runs = runsOf(core, text, h);
      expect(runs.length).toBeGreaterThan(0);
      for (const r of runs) {
        const got = read(core, runBox(r), h);
        const line = section + " " + text + ": ink " + got.ink + " on " + got.fill + " " + got.ratio.toFixed(2) + ":1";
        reads.push(line);
        if (got.ratio < MIN_RATIO) bad.push(line);
      }
    }
  }
  console.log(reads.join(" | "));
  expect(bad).toEqual([]);
}, 180_000);

// @@empty
test.skipIf(!OVERLAY)("empty: the Action label is legible in its section (gate 1)", () => {
  expect(gateRow("empty").g1.fails.map((f) => f.text)).toEqual([]);
}, 120_000);

