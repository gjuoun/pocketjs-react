// The C1 acceptance probe: verbatim shadcn v4 button + badge (zero JSX edits in the
// registry sources) through the product mount(). The node tree is asserted in-process
// (the built bundle is its own module graph, its mirror is not reachable from here); the
// built path proves the drawn runs, d-pad focus, CIRCLE -> onClick and a pointer click.
import { afterEach, expect, test } from "bun:test";
import { BTN } from "@pocketjs/framework/input";
import { build } from "../tools/build.ts";
import { bootApp, bootCore, type Core, type TextRun } from "./harness.ts";
import { compatStats, mount, resetCompatStats } from "../src/index.ts";
import { compileClasses } from "../src/internal/pocket-build.ts";
import { rootMirror } from "../src/internal/pocket.ts";
import { installBuildStyles } from "../src/style/build-styles.ts";
import { App } from "./fixtures/shadcn/app.tsx";
import { Button } from "./fixtures/shadcn/button.tsx";

const OUT = "/tmp/pocketjs-react-test/compat-c1";
let core: Core | undefined;
afterEach(() => {
  core?.dispose();
  core = undefined;
  resetCompatStats();
  installBuildStyles({}, new Uint8Array(0), []);
  delete (globalThis as { __pocketPointer?: unknown }).__pocketPointer;
});

const bootBuilt = async () => {
  core = await bootApp(await build("test/fixtures/shadcn/main.tsx", { outdir: OUT, name: "shadcn-compat" }));
  core.step(0);
  return core;
};
const runs = (c: Core) => c.texts().map((r) => r.text);
const runOf = (c: Core, text: string): TextRun => c.texts().find((r) => r.text === text)!;
/** Dominant color of a text run's rect: the surface the label sits on. */
const surface = (c: Core, r: TextRun): string => {
  const hist = new Map<string, number>();
  for (let y = r.y; y < r.y + r.h; y++) {
    for (let x = r.x; x < r.x + r.w; x++) {
      const p = c.pixel(x, y);
      hist.set(p, (hist.get(p) ?? 0) + 1);
    }
  }
  return [...hist.entries()].sort((a, b) => b[1] - a[1])[0][0];
};
const click = (c: Core, x: number, y: number) => {
  const q = ((globalThis as { __pocketPointer?: unknown[] }).__pocketPointer ??= []);
  q.push({ x, y, down: true });
  c.step(0);
  q.push({ x, y, down: false });
  c.step(0);
  c.step(0);
};

test("the mapped node tree: div/button/span with provenance, badge text, press counter", async () => {
  const built = await build("test/fixtures/shadcn/main.tsx", { outdir: OUT, name: "shadcn-compat" });
  core = await bootCore({ classes: built.tokens });
  installBuildStyles({}, compileClasses([]).bin, built.tokens);
  mount(<App />, { compat: { classMiss: "drop" } });
  core.step(0);
  const div = rootMirror.children[0].children[0];
  expect(div.domTag).toBe("view");
  expect(div.debugName).toBe("div");
  const button = div.children[0];
  expect(button.domTag).toBe("view");
  expect(button.debugName).toBe("button");
  expect(button.focusable).toBe(true);
  expect(button.children[0].text).toBe("Save");
  const badge = div.children[1];
  expect(badge.domTag).toBe("text");
  expect(badge.children[0].text).toBe("Beta");
  const span = div.children[2];
  expect(span.domTag).toBe("text");
  expect(span.children.map((c) => c.text).join("")).toBe("pressed 0");
  // What the layer silently accepted for the verbatim sources: each data-* attr counted.
  // C2 closed the styling gap: the shadcn literals now map to PocketJS vocabulary and drop nothing.
  expect(compatStats().droppedAttrs).toEqual({ "data-slot": 2, "data-variant": 2, "data-size": 1 });
  expect(compatStats().classMiss).toEqual({ tokens: 0, literals: 0 });
});

test("the built bundle renders the verbatim components' text runs", async () => {
  const c = await bootBuilt();
  expect(runs(c)).toEqual(["Save", "Beta", "pressed 0"]);
});

test("d-pad focus lands on the mapped button and CIRCLE fires onClick", async () => {
  const c = await bootBuilt();
  const save = c.texts().find((r) => r.text === "Save")!;
  const unfocused = c.pixel(save.x - 4, save.y + 2);
  c.press(BTN.DOWN);
  c.render();
  // The fixture gives the button focus:bg-blue-600 (a supported token), so focus is visible.
  expect(c.pixel(save.x - 4, save.y + 2)).not.toBe(unfocused);
  c.press(BTN.CIRCLE);
  expect(runs(c)).toEqual(["Save", "Beta", "pressed 1"]);
});

test("a pointer click on the mapped button presses it through the same focus system", async () => {
  const c = await bootBuilt();
  const save = c.texts().find((r) => r.text === "Save")!;
  click(c, save.x + 4, save.y + 4);
  expect(runs(c)).toEqual(["Save", "Beta", "pressed 1"]);
});

// C2 acceptance guard: the verbatim Button base (cva default variant + default size) must drop
// no class tokens. The in-process runtime is fed the build's own token table, so the count is
// the same 19 the C1 E2E measured (bg-primary, inline-flex, hover:… and friends), not "every
// token is unseen". Red until the token map lands (Step 2/3).
test("C2: the verbatim button base drops no class tokens", async () => {
  const built = await build("test/fixtures/shadcn/main.tsx", { outdir: OUT, name: "shadcn-compat" });
  // Boot with the token set so the font slots the button's text-sm/font-bold need are baked;
  // the style table itself is installed empty so the literal goes through the runtime compiler.
  core = await bootCore({ classes: built.tokens });
  // mount() reads the installed build table: give it the fixture build's real token set (an
  // empty styles.bin, so literals compile at runtime) - the same state the built bundle is in.
  installBuildStyles({}, compileClasses([]).bin, built.tokens);
  mount(<Button>Save</Button>, { compat: { classMiss: "drop" } });
  core.step(0);
  const save = core.texts().find((r) => r.text === "Save")!;
  expect(compatStats().classMiss).toEqual({ tokens: 0, literals: 0 });
  expect(core.pixel(save.x - 4, save.y + 2)).toBe("#0f172a");
});

const OUT_VARIANTS = "/tmp/pocketjs-react-test/compat-c2";
const bootVariants = async (): Promise<Core> =>
  (core = await bootApp(await build("test/fixtures/shadcn/variants-main.tsx", { outdir: OUT_VARIANTS, name: "variants" })));

const hasColor = (c: Core, r: TextRun, color: string): boolean => {
  for (let y = r.y; y < r.y + r.h; y++) for (let x = r.x; x < r.x + r.w; x++) if (c.pixel(x, y) === color) return true;
  return false;
};

// C2 acceptance: the six Button variants map to six different surfaces. default/secondary/
// destructive/outline differ by fill; ghost and link are transparent at rest (verbatim shadcn
// behavior - they differ on hover, which the map turns into the pressed cue below).
test("C2: every Button variant paints its mapped surface", async () => {
  const c = await bootVariants();
  const fills: [string, string][] = [
    ["Default", "#0f172a"],
    ["Secondary", "#e2e8f0"],
    ["Destructive", "#dc2626"],
    ["Outline", "#ffffff"],
  ];
  for (const [label, color] of fills) expect({ label, color: surface(c, runOf(c, label)) }).toEqual({ label, color });
  expect(new Set(fills.map(([, color]) => color)).size).toBe(4);
  expect(surface(c, runOf(c, "Ghost"))).toBe("#f1f5f9");
  expect(surface(c, runOf(c, "Link"))).toBe("#f1f5f9");
});

test("C2: every Badge variant paints its mapped surface or border", async () => {
  const c = await bootVariants();
  expect(surface(c, runOf(c, "BDefault"))).toBe("#0f172a");
  expect(surface(c, runOf(c, "BSecondary"))).toBe("#e2e8f0");
  expect(surface(c, runOf(c, "BDestructive"))).toBe("#dc2626");
  // outline is transparent with border-slate-200; ghost/link are transparent and differ by text
  // color (ghost keeps the core's default white, link maps text-primary -> slate-900).
  expect(hasColor(c, runOf(c, "BOutline"), "#e2e8f0")).toBe(true);
  expect(surface(c, runOf(c, "BGhost"))).toBe("#f1f5f9");
  expect(surface(c, runOf(c, "BLink"))).toBe("#f1f5f9");
  expect(hasColor(c, runOf(c, "BGhost"), "#ffffff")).toBe(true);
  expect(hasColor(c, runOf(c, "BLink"), "#0f172a")).toBe(true);
});

// hover: -> active: is the map's press cue: the ghost variant's only mapped style is the accent
// background, so a held CIRCLE must paint it and releasing must restore the container color.
test("C2: hover: maps to active: - a pressed ghost button shows the accent fill", async () => {
  const c = await bootVariants();
  expect(surface(c, runOf(c, "Ghost"))).toBe("#f1f5f9");
  for (let i = 0; i < 5; i++) c.press(BTN.DOWN); // Default..Ghost
  // transition-all animates the change: hold (and release) for enough frames to settle.
  for (let i = 0; i < 12; i++) c.step(BTN.CIRCLE);
  c.render();
  expect(surface(c, runOf(c, "Ghost"))).toBe("#e2e8f0");
  for (let i = 0; i < 12; i++) c.step(0);
  c.render();
  expect(surface(c, runOf(c, "Ghost"))).toBe("#f1f5f9");
});
