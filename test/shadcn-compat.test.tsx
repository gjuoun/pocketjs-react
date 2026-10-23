// The C1 acceptance probe: verbatim shadcn v4 button + badge (zero JSX edits) through the
// product mount() on the real wasm core - the strict web-host contract. Asserts the node
// tree, d-pad focus + CIRCLE -> onClick, a pointer click, and the compat counters.
import { afterEach, expect, test } from "bun:test";
import { BTN, getFocused } from "@pocketjs/framework/input";
import { build } from "../tools/build.ts";
import { bootApp, type Core } from "./harness.ts";
import { rootMirror, type NodeMirror } from "../src/internal/pocket.ts";

const OUT = "/tmp/pocketjs-react-test/compat-c1";
let core: Core | undefined;
afterEach(() => {
  core?.dispose();
  core = undefined;
  delete (globalThis as { __pocketPointer?: unknown }).__pocketPointer;
});

const boot = async () => {
  core = await bootApp(await build("test/fixtures/shadcn/main.tsx", { outdir: OUT, name: "shadcn-compat" }));
  core.step(0);
  return core;
};
const appLayer = (): NodeMirror => rootMirror.children[0];
const runs = (c: Core) => c.texts().map((r) => r.text);
const click = (c: Core, x: number, y: number) => {
  const q = ((globalThis as { __pocketPointer?: unknown[] }).__pocketPointer ??= []);
  q.push({ x, y, down: true });
  c.step(0);
  q.push({ x, y, down: false });
  c.step(0);
  c.step(0);
};

test("verbatim shadcn button + badge build and render their tree", async () => {
  await boot();
  expect(runs(core!)).toEqual(["Save", "Beta", "pressed 0"]);
  const div = appLayer().children[0];
  expect(div.domTag).toBe("view");
  expect(div.debugName).toBe("div");
  const button = div.children[0];
  expect(button.domTag).toBe("view");
  expect(button.debugName).toBe("button");
  expect(button.children[0].text).toBe("Save");
  const badge = div.children[1];
  expect(badge.domTag).toBe("text");
  expect(badge.children[0].text).toBe("Beta");
  const span = div.children[2];
  expect(span.domTag).toBe("text");
  expect(span.children.map((c) => c.text).join("")).toBe("pressed 0");
});

test("d-pad focus lands on the mapped button and CIRCLE fires onClick", async () => {
  await boot();
  core!.press(BTN.DOWN);
  expect(getFocused()?.debugName).toBe("button");
  core!.press(BTN.CIRCLE);
  expect(runs(core!)).toEqual(["Save", "Beta", "pressed 1"]);
});

test("a pointer click on the mapped button presses it through the same focus system", async () => {
  await boot();
  const save = core!.texts().find((r) => r.text === "Save")!;
  click(core!, save.x + 4, save.y + 4);
  expect(runs(core!)).toEqual(["Save", "Beta", "pressed 1"]);
});
