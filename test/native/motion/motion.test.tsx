// Motion probe (measurement only, not an animation runtime): what one 150 ms colour or opacity transition costs
// on this renderer. A class change written by React is the only input; the core interpolates. The probe counts
// bridge calls (wrapped in place on the ops object), frame compute time, and samples the drawn pixels each frame
// to see whether the core produced intermediate values. Output: /tmp/jun/native-spike/motion.json.
import { mkdirSync, writeFileSync } from "node:fs";
import { expect, test } from "bun:test";
import { BTN } from "@pocketjs/framework/input";
import { useState, type ReactNode } from "react";
import { mount, Text, View } from "../../../src/index.ts";
import { bootCore, type Core } from "../../harness.ts";
import { compileClasses } from "../../../src/internal/pocket-build.ts";
import { installBuildStyles } from "../../../src/style/build-styles.ts";
import { slotCrossProduct } from "../../../tools/build.ts";
import { Focusable } from "../../../src/native/focusable.tsx";
import { Input } from "../../../src/native/input.tsx";
import { Card, CardDescription, CardTitle } from "../../../src/native/card.tsx";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../../src/native/tabs.tsx";
import { Dialog, DialogTrigger } from "../../../src/native/dialog.tsx";
import { TOKENS } from "../../../src/native/tokens.ts";

const ROOT = "w-full h-full flex-col bg-white gap-2 p-2";
const OFF_BOX = "h-[40px] w-[160px] rounded-md border-2 border-transparent flex-row items-center justify-center bg-slate-900 transition-colors duration-150";
const ON_BOX = "h-[40px] w-[160px] rounded-md border-2 border-transparent flex-row items-center justify-center bg-slate-700 transition-colors duration-150";
const OFF_TXT = "text-base font-bold text-white transition-colors duration-150";
const ON_TXT = "text-base font-bold text-slate-200 transition-colors duration-150";
const FADE_OFF = "w-[200px] h-[60px] bg-slate-900 opacity-0 transition-opacity duration-150";
const FADE_ON = "w-[200px] h-[60px] bg-slate-900 opacity-100 transition-opacity duration-150";
const PROBE = [OFF_BOX, ON_BOX, OFF_TXT, ON_TXT, FADE_OFF, FADE_ON, ROOT];
const LITERALS = [...Object.values(TOKENS), ...PROBE];
const UTIL = LITERALS.flatMap((l) => l.split(/\s+/)).filter(Boolean);
const STRICT = { compat: { classMiss: "throw" as const, tokenMap: false } };

function instrument(ops: Record<string, unknown>): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const k of Object.keys(ops)) {
    const f = ops[k];
    if (typeof f !== "function") continue;
    ops[k] = (...args: unknown[]) => { counts[k] = (counts[k] ?? 0) + 1; return (f as (...a: unknown[]) => unknown).apply(ops, args); };
  }
  return counts;
}

function Toggle(props: { onOn?: () => void }) {
  const [on, setOn] = useState(false);
  return (
    <Focusable look={on ? ON_BOX : OFF_BOX} onPress={() => setOn(!on)}>
      <Text className={on ? ON_TXT : OFF_TXT}>Go</Text>
    </Focusable>
  );
}

function FadePage() {
  const [on, setOn] = useState(false);
  return (
    <View className={ROOT}>
      <Focusable look={on ? ON_BOX : OFF_BOX} onPress={() => setOn(!on)}><Text className={on ? ON_TXT : OFF_TXT}>Go</Text></Focusable>
      <View className={on ? FADE_ON : FADE_OFF} />
    </View>
  );
}

function Five() {
  const [on, setOn] = useState(false);
  return (
    <View className={ROOT}>
      <Focusable look={on ? ON_BOX : OFF_BOX} onPress={() => setOn(!on)}><Text className={on ? ON_TXT : OFF_TXT}>Go</Text></Focusable>
      <Input placeholder="Name" value="" onChange={() => {}} />
      <Card><CardTitle>Account</CardTitle><CardDescription>Manage it</CardDescription></Card>
      <Tabs defaultValue="A"><TabsList><TabsTrigger value="A">A</TabsTrigger><TabsTrigger value="B">B</TabsTrigger></TabsList><TabsContent value="A">body</TabsContent></Tabs>
      <Dialog><DialogTrigger>Open</DialogTrigger></Dialog>
    </View>
  );
}

async function boot(app: () => ReactNode) {
  const core: Core = await bootCore({ classes: UTIL, fontSlots: slotCrossProduct(LITERALS, []) });
  installBuildStyles({}, compileClasses([]).bin, UTIL);
  const counts = instrument(core.ops as unknown as Record<string, unknown>);
  const unmount = mount(app(), STRICT);
  core.step(0); core.step(0); core.render();
  return { core, counts, unmount };
}

function hex(h: string): number[] { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
function tally(core: Core, x0: number, y0: number, w: number, h: number): Map<string, number> {
  const m = new Map<string, number>();
  for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) { const c = core.pixel(x, y); m.set(c, (m.get(c) ?? 0) + 1); }
  return m;
}
function textColour(core: Core, rect: { x: number; y: number; w: number; h: number }, fill: string): string {
  const m = tally(core, rect.x, rect.y, rect.w, rect.h);
  let best = fill; let n = -1;
  for (const [c, k] of m) if (c !== fill && k > n) { best = c; n = k; }
  return best;
}

function withTiming(core: Core, frames: number, buttons: (i: number) => number, sample: (i: number) => void): number[] {
  const times: number[] = [];
  for (let i = 0; i < frames; i++) {
    const t0 = performance.now();
    core.step(buttons(i));
    core.render();
    times.push(performance.now() - t0);
    sample(i);
  }
  return times;
}

const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / Math.max(1, xs.length);
const sum = (c: Record<string, number>) => Object.values(c).reduce((a, b) => a + b, 0);

function transitionFrames(five: boolean, frames: number) {
  return boot(() => (five ? <Five /> : <Toggle />)).then(({ core, counts, unmount }) => {
    core.step(BTN.DOWN); core.step(0); core.render();
    const idleCounts = { ...counts };
    for (const k of Object.keys(counts)) delete counts[k];
    const idle = withTiming(core, 10, () => 0, () => {});
    const idleWrites = sum(counts);
    for (const k of Object.keys(counts)) delete counts[k];
    const label = core.texts().find((t) => t.text === "Go")!;
    const fill0 = core.pixel(14, 28);
    const fills: string[] = []; const texts: string[] = [];
    const trans = withTiming(core, frames, (i) => (i === 0 ? BTN.CIRCLE : 0), () => {
      fills.push(core.pixel(14, 28));
      texts.push(textColour(core, label, core.pixel(14, 28)));
    });
    const transWrites = { ...counts };
    unmount(); core.dispose();
    return { idle, idleWrites, trans, transWrites, fills, texts, fill0, idleCounts };
  });
}

function fadeFrames(frames: number) {
  return boot(() => <FadePage />).then(({ core, counts, unmount }) => {
    core.step(BTN.DOWN); core.step(0); core.render();
    const panel = { x: 108, y: 86 };
    for (const k of Object.keys(counts)) delete counts[k];
    const before = core.pixel(panel.x, panel.y);
    const seq: string[] = [];
    const times = withTiming(core, frames, (i) => (i === 0 ? BTN.CIRCLE : 0), () => { seq.push(core.pixel(panel.x, panel.y)); });
    const writes = { ...counts };
    unmount(); core.dispose();
    return { before, seq, times, writes };
  });
}

test("motion probe: colour transition, fade transition and five-component cost", async () => {
  const single = await transitionFrames(false, 14);
  const five = await transitionFrames(true, 14);
  const fade = await fadeFrames(14);
  const distinct = (xs: string[]) => new Set(xs).size;
  const out = {
    frameMs: { idleSingle: mean(single.idle), transSingle: mean(single.trans), idleFive: mean(five.idle), transFive: mean(five.trans) },
    writesPerTransition: { single: sum(single.transWrites), five: sum(five.transWrites), idleSingle: single.idleWrites, idleFive: five.idleWrites },
    writeOps: single.transWrites,
    fill: { start: single.fill0, seq: single.fills, distinctValues: distinct(single.fills) },
    text: { seq: single.texts, distinctValues: distinct(single.texts) },
    fade: { before: fade.before, seq: fade.seq, distinctValues: distinct(fade.seq), writes: sum(fade.writes), writeOps: fade.writes, frameMs: mean(fade.times) },
    framesToSettleFill: single.fills.findIndex((c, i, a) => a.slice(i).every((d) => d === a[a.length - 1])),
  };
  mkdirSync("/tmp/jun/native-spike", { recursive: true });
  writeFileSync("/tmp/jun/native-spike/motion.json", JSON.stringify(out, null, 2));
  console.log("MOTION " + JSON.stringify(out));
  expect(single.trans.length).toBe(14);
});
