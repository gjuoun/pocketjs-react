// Theme switch latency: the theme page alone, switched light to dark and back by its own toggle (a Button press). The page
// holds four sections; only the shown one is mounted, so each section is measured with its own components on the page: the
// section switch goes to section k, then 40 toggles are timed frame by frame, from the press frame until the page surface is
// drawn in the new theme's colour. Section 1 reports the first switch (it compiles the new class combinations) and the steady
// median; sections 2 to 4 report their steady medians. Output: /tmp/pocketjs-react-qa/native/theme-switch.json.
//   POCKETJS_CORE_ROOT=<overlay> bun tools/native/theme-switch.ts
import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { BTN } from "@pocketjs/framework/input";
import { focusNode } from "@pocketjs/framework/input";
import { rootMirror } from "../../src/internal/pocket.ts";
import { compileClasses } from "../../src/internal/pocket-build.ts";
import { installBuildStyles } from "../../src/style/build-styles.ts";
import { bootCore, type Core } from "../../test/harness.ts";
import { build } from "../build.ts";
import { triggerNode } from "../qa/acceptance/interaction.ts";
import { THEMES } from "../../src/native/tokens.ts";

const ROOT = resolve(import.meta.dir, "../..");
const QA = "/tmp/pocketjs-react-qa/native";
const SWITCHES = 40;
const SECTIONS = 4;
const PAGE_BG = { light: THEMES.light["theme.page"], dark: THEMES.dark["theme.page"] } as const;
const BG_PX = { light: "#ffffff", dark: "#0f172a" } as const;
// The page's own 4 px padding, top left: surface in every section (a section's rows start inside it).
const PROBE = { x: 1, y: 1 };

function median(xs: number[]): number {
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)];
}

interface Steady { medianMs: number; minMs: number; maxMs: number; medianFrames: number; medianBridgeWrites: number }

async function main(): Promise<number> {
  if (!process.env.POCKETJS_CORE_ROOT) { console.error("theme-switch: set POCKETJS_CORE_ROOT to the overlay core"); return 2; }
  const entry = resolve(ROOT, "test/native/gallery/theme-only.tsx");
  const built = await build(entry, { outdir: join(ROOT, "dist/native-judge"), name: "theme-only" });
  const styles = compileClasses(built.literals);
  const core = await bootCore({ classes: built.literals, fontSlots: built.fontSlots });
  installBuildStyles(styles.ids, styles.bin, built.tokens);
  const ops = core.ops as unknown as Record<string, unknown>;
  const reads = new Set(["captureTexts", "capturedTexts", "nodeRect", "render", "tick", "debugInspect", "debugRectXY", "debugRectWH"]);
  let writes = 0;
  for (const k of Object.keys(ops)) {
    const f = ops[k];
    if (typeof f !== "function" || reads.has(k)) continue;
    ops[k] = (...args: unknown[]) => { writes++; return (f as (...a: unknown[]) => unknown).apply(ops, args); };
  }
  await import(entry);
  core.step(0); core.step(0); core.render();
  const pageBg = (): string => core.pixel(PROBE.x, PROBE.y);
  const settle = () => { core.step(0); core.render(); };
  const toggleTarget = triggerNode(rootMirror, "Dark");
  if (!toggleTarget) throw new Error("theme-switch: no Dark toggle on the theme page");

  // The section switch: its label names the next section, so each press moves on by one; the page starts in section 1.
  let shown = 0;
  const gotoSection = (k: number) => {
    while (shown !== k) {
      const next = (shown + 1) % SECTIONS;
      const btn = triggerNode(rootMirror, (next + 1) + "/" + SECTIONS);
      if (!btn) throw new Error("theme-switch: no section switch for section " + (next + 1));
      focusNode(btn as never);
      core.step(BTN.CIRCLE);
      core.render();
      for (let i = 0; i < 4; i++) settle();
      shown = next;
    }
    focusNode(toggleTarget as never);
    for (let i = 0; i < 4; i++) settle();
  };

  const measure = (count: number): { first: { ms: number; frames: number; writes: number } | null; ms: number[]; frames: number[]; writesPer: number[] } => {
    let mode: "light" | "dark" = pageBg() === BG_PX.dark ? "dark" : "light";
    const out = { first: null as { ms: number; frames: number; writes: number } | null, ms: [] as number[], frames: [] as number[], writesPer: [] as number[] };
    for (let i = 0; i < count; i++) {
      const next: "light" | "dark" = mode === "light" ? "dark" : "light";
      const w0 = writes;
      const t0 = performance.now();
      core.step(BTN.CIRCLE);
      core.render();
      let n = 1;
      while (pageBg() !== BG_PX[next] && n < 30) { core.step(0); core.render(); n++; }
      const dt = performance.now() - t0;
      if (pageBg() !== BG_PX[next]) throw new Error("theme-switch: page did not draw " + next + " within 30 frames (got " + pageBg() + ")");
      if (i === 0 && out.first === null && shown === 0) out.first = { ms: dt, frames: n, writes: writes - w0 };
      else { out.ms.push(dt); out.frames.push(n); out.writesPer.push(writes - w0); }
      mode = next;
      settle();
    }
    return out;
  };

  const steadyOf = (m: { ms: number[]; frames: number[]; writesPer: number[] }): Steady => ({
    medianMs: Math.round(median(m.ms) * 100) / 100,
    minMs: Math.round(Math.min(...m.ms) * 100) / 100,
    maxMs: Math.round(Math.max(...m.ms) * 100) / 100,
    medianFrames: median(m.frames),
    medianBridgeWrites: median(m.writesPer),
  });

  const perSection: Record<string, Steady> = {};
  let firstSwitch: { ms: number; frames: number; bridgeWrites: number } | null = null;
  for (let k = 0; k < SECTIONS; k++) {
    gotoSection(k);
    const m = measure(SWITCHES);
    if (k === 0 && m.first) firstSwitch = { ms: Math.round(m.first.ms * 100) / 100, frames: m.first.frames, bridgeWrites: m.first.writes };
    perSection["section " + (k + 1)] = steadyOf(m);
  }
  const out = {
    channel: "overlay",
    switchesPerSection: SWITCHES,
    first: firstSwitch,
    perSection,
    pageBg: PAGE_BG,
  };
  mkdirSync(QA, { recursive: true });
  writeFileSync(join(QA, "theme-switch.json"), JSON.stringify(out, null, 2));
  if (firstSwitch) console.log("THEME SWITCH [overlay] section 1 first switch " + firstSwitch.ms + " ms (" + firstSwitch.frames + " frames, " + firstSwitch.bridgeWrites + " bridge writes, compiles the new combinations)");
  for (const [name, s] of Object.entries(perSection)) console.log("THEME SWITCH [overlay] " + name + " steady median " + s.medianMs + " ms over " + SWITCHES + " switches (min " + s.minMs + ", max " + s.maxMs + "), " + s.medianFrames + " frame(s), " + s.medianBridgeWrites + " bridge writes per switch");
  core.dispose();
  return 0;
}

process.exit(await main());
