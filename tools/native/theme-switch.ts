// Theme switch latency: the theme page (all twelve native components) alone, switched light to dark and back by
// its own toggle (a Button press). Each switch is timed frame by frame, from the press frame until the page surface
// is drawn in the new theme's colour. Reports the first switch (it compiles the new class combinations) and the
// median of the steady switches. Output: /tmp/pocketjs-react-qa/native/theme-switch.json.
//   POCKETJS_CORE_ROOT=<overlay> bun tools/native/theme-switch.ts
import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { BTN } from "@pocketjs/framework/input";
import { focusNode } from "@pocketjs/framework/input";
import { rootMirror } from "../../src/internal/pocket.ts";
import { compileClasses } from "../../src/internal/pocket-build.ts";
import { installBuildStyles } from "../../src/style/build-styles.ts";
import { bootCore } from "../../test/harness.ts";
import { build } from "../build.ts";
import { triggerNode } from "../qa/acceptance/interaction.ts";
import { THEMES } from "../../src/native/tokens.ts";

const ROOT = resolve(import.meta.dir, "../..");
const QA = "/tmp/pocketjs-react-qa/native";
const SWITCHES = 40;
const PAGE_BG = { light: THEMES.light["theme.page"], dark: THEMES.dark["theme.page"] } as const;
const BG_PX = { light: "#ffffff", dark: "#0f172a" } as const;
// Inside the theme page's surface (it is 480 x 252), clear of every component.
const PROBE = { x: 470, y: 240 };

function median(xs: number[]): number {
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)];
}

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
  const target = triggerNode(rootMirror, "Dark");
  if (!target) throw new Error("theme-switch: no Dark toggle on the theme page");
  focusNode(target as never);
  const pageBg = (): string => core.pixel(PROBE.x, PROBE.y);
  const ms: number[] = [];
  const frames: number[] = [];
  const writesPer: number[] = [];
  let mode: "light" | "dark" = "light";
  const first: { ms: number; frames: number; writes: number } = { ms: 0, frames: 0, writes: 0 };
  for (let i = 0; i < SWITCHES; i++) {
    const next: "light" | "dark" = mode === "light" ? "dark" : "light";
    const w0 = writes;
    const t0 = performance.now();
    core.step(BTN.CIRCLE);
    core.render();
    let n = 1;
    while (pageBg() !== BG_PX[next] && n < 30) { core.step(0); core.render(); n++; }
    const dt = performance.now() - t0;
    if (pageBg() !== BG_PX[next]) throw new Error("theme-switch: page did not draw " + next + " within 30 frames (got " + pageBg() + ")");
    if (i === 0) Object.assign(first, { ms: dt, frames: n, writes: writes - w0 });
    else { ms.push(dt); frames.push(n); writesPer.push(writes - w0); }
    mode = next;
    // Let the frame settle before the next press.
    core.step(0); core.render();
  }
  const out = {
    channel: "overlay",
    switches: SWITCHES,
    first: { ms: Math.round(first.ms * 100) / 100, frames: first.frames, bridgeWrites: first.writes },
    steady: { medianMs: Math.round(median(ms) * 100) / 100, minMs: Math.round(Math.min(...ms) * 100) / 100, maxMs: Math.round(Math.max(...ms) * 100) / 100, medianFrames: median(frames), medianBridgeWrites: median(writesPer) },
    pageBg: PAGE_BG,
  };
  mkdirSync(QA, { recursive: true });
  writeFileSync(join(QA, "theme-switch.json"), JSON.stringify(out, null, 2));
  console.log("THEME SWITCH [overlay] first " + out.first.ms + " ms (" + out.first.frames + " frames, " + out.first.bridgeWrites + " bridge writes, compiles the new combinations)");
  console.log("THEME SWITCH [overlay] steady median " + out.steady.medianMs + " ms over " + (SWITCHES - 1) + " switches (min " + out.steady.minMs + ", max " + out.steady.maxMs + "), " + out.steady.medianFrames + " frame(s), " + out.steady.medianBridgeWrites + " bridge writes per switch");
  core.dispose();
  return 0;
}

process.exit(await main());
