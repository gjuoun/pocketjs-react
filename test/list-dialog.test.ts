// The example app, built by tools/build.ts, played with the d-pad on the real wasm core.
import { expect, test } from "bun:test";
import { BTN } from "@pocketjs/framework/input";
import { build } from "../tools/build.ts";
import { bootApp, type Core } from "./harness.ts";

const SETTLE = 4;

test("list toggles, inline-style bar, and a dialog that traps and restores focus", async () => {
  const core = await bootApp(await build("examples/list-dialog/main.tsx", { outdir: "/tmp/pocketjs-react-test/list-dialog" }));
  try {
    const run = (text: string) => core.texts().find((r) => r.text === text);
    const rowBg = (text: string) => { const r = run(text)!; return core.pixel(r.x - 4, r.y + 2); };
    const press = (b: number) => core.press(b, SETTLE);
    /** Width of the inline-styled bar: pixels at the track's left edge that are not the track. */
    const barWidth = () => {
      const t = run("pocketjs-react")!;
      const y = t.y + Math.floor(t.h / 2);
      let x = t.x + t.w;
      const bg = core.pixel(x + 1, y);
      while (core.pixel(x, y) === bg) x++; // gap up to the track or bar
      const fill = core.pixel(x, y);
      let n = 0;
      while (core.pixel(x + n, y) === fill) n++;
      return { fill, n };
    };

    const track = barWidth(); // nothing on yet: the run is the empty track itself
    expect(track.n).toBe(120);

    press(BTN.DOWN); // focus Alpha
    const focusColor = rowBg("Alpha");
    const alpha0 = run("Alpha")!;
    press(BTN.CIRCLE); // Alpha on
    const alpha1 = run("Alpha")!;
    expect(alpha1.x).toBeGreaterThan(alpha0.x); // cn: px-3 -> px-6
    expect(alpha1.w).toBeGreaterThan(alpha0.w); // cn: font-bold
    expect(barWidth().n).toBe(20);

    press(BTN.DOWN); // Bravo
    press(BTN.CIRCLE); // Bravo on
    const bar = barWidth();
    expect(bar.n).toBe(40);
    expect(bar.fill).not.toBe(track.fill);

    for (let i = 0; i < 5; i++) press(BTN.DOWN); // Open dialog
    press(BTN.CIRCLE);
    expect(run("Discard changes?")).toBeDefined();
    for (let i = 0; i < 3; i++) press(BTN.DOWN); // trapped inside the dialog
    expect(run("Discard changes?")).toBeDefined();
    press(BTN.CROSS); // back closes
    expect(run("Discard changes?")).toBeUndefined();
    expect(rowBg(OPEN_LABEL)).toBe(focusColor);
  } finally {
    core.dispose();
  }
});

const OPEN_LABEL = "Open dialog";
