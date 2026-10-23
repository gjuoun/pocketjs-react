// The C1 acceptance probe: verbatim shadcn v4 button + badge (zero JSX edits in the
// registry sources) through the product mount(). The node tree is asserted in-process
// (the built bundle is its own module graph, its mirror is not reachable from here); the
// built path proves the drawn runs, d-pad focus, CIRCLE -> onClick and a pointer click.
import { afterEach, expect, test } from "bun:test";
import { BTN } from "@pocketjs/framework/input";
import { build } from "../tools/build.ts";
import { bootApp, bootCore, type Core } from "./harness.ts";
import { compatStats, mount, resetCompatStats } from "../src/index.ts";
import { rootMirror } from "../src/internal/pocket.ts";
import { App } from "./fixtures/shadcn/app.tsx";

const OUT = "/tmp/pocketjs-react-test/compat-c1";
let core: Core | undefined;
afterEach(() => {
  core?.dispose();
  core = undefined;
  resetCompatStats();
  delete (globalThis as { __pocketPointer?: unknown }).__pocketPointer;
});

const bootBuilt = async () => {
  core = await bootApp(await build("test/fixtures/shadcn/main.tsx", { outdir: OUT, name: "shadcn-compat" }));
  core.step(0);
  return core;
};
const runs = (c: Core) => c.texts().map((r) => r.text);
const click = (c: Core, x: number, y: number) => {
  const q = ((globalThis as { __pocketPointer?: unknown[] }).__pocketPointer ??= []);
  q.push({ x, y, down: true });
  c.step(0);
  q.push({ x, y, down: false });
  c.step(0);
  c.step(0);
};

test("the mapped node tree: div/button/span with provenance, badge text, press counter", async () => {
  core = await bootCore({ classes: [] });
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
  // What the layer silently accepted for the verbatim sources: each data-* attr counted,
  // the shadcn class literals counted as unstyled instead of crashing.
  expect(compatStats().droppedAttrs).toEqual({ "data-slot": 2, "data-variant": 2, "data-size": 1 });
  expect(compatStats().classMiss.literals).toBeGreaterThanOrEqual(3);
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
