// C5 overlays on the real wasm core, mounted in-process like the C3 demo: the vendored shadcn
// dialog (codemod output) opens its content into the overlay layer, traps d-pad focus, and
// gives focus back on close. Focus is the core's focused node (getFocused).
import { afterEach, expect, test } from "bun:test";
import { BTN, getFocused } from "@pocketjs/framework/input";
import { mount, resetCompatStats } from "../src/index.ts";
import { compileClasses } from "../src/internal/pocket-build.ts";
import { installBuildStyles } from "../src/style/build-styles.ts";
import { build } from "../tools/build.ts";
import { Overlays } from "./fixtures/shadcn-vendor/overlays.tsx";
import { bootCore, type Core } from "./harness.ts";

const VENDOR = "test/fixtures/shadcn-vendor";
const OUT = "/tmp/pocketjs-react-test/compat-c5";
const SETTLE = 4;

let core: Core | undefined;
let unmount: (() => void) | undefined;
afterEach(() => {
  unmount?.();
  unmount = undefined;
  core?.dispose();
  core = undefined;
  resetCompatStats();
  installBuildStyles({}, new Uint8Array(0), []);
});

async function boot(): Promise<Core> {
  const built = await build(VENDOR + "/overlays-main.tsx", { outdir: OUT, name: "shadcn-overlays" });
  core = await bootCore({ classes: built.tokens });
  installBuildStyles({}, compileClasses([]).bin, built.tokens);
  unmount = mount(<Overlays />, { compat: { classMiss: "drop" } });
  core.step(0);
  return core;
}
const press = (c: Core, button: number) => c.press(button, SETTLE);
const visible = (c: Core): string[] => c.texts().map((r) => r.text);
/** Text of the focused node's first text descendant (a Button or Trigger shows its label). */
function focused(): string | undefined {
  const walk = (node: { text?: string; children: unknown[] }): string | undefined => {
    if (node.text) return node.text;
    for (const child of node.children as (typeof node)[]) {
      const found = walk(child);
      if (found) return found;
    }
    return undefined;
  };
  const node = getFocused();
  return node ? walk(node as never) : undefined;
}
/** Move focus with the d-pad until `label` has it (at most four presses). */
function focusOn(c: Core, label: string): void {
  for (let i = 0; i < 4 && focused() !== label; i++) press(c, BTN.DOWN);
  expect(focused()).toBe(label);
}

test("Dialog: the trigger opens its content into the overlay layer", async () => {
  const c = await boot();
  expect(visible(c)).not.toContain("Dialog title");
  focusOn(c, "Open");
  press(c, BTN.CIRCLE);
  expect(visible(c)).toContain("Dialog title");
  expect(visible(c)).toContain("Dialog body");
});

test("Dialog: while open the d-pad cannot reach the app beneath", async () => {
  const c = await boot();
  focusOn(c, "Open");
  press(c, BTN.CIRCLE);
  expect(visible(c)).toContain("Dialog title");
  const seen = new Set<string | undefined>();
  for (let i = 0; i < 4; i++) {
    press(c, BTN.DOWN);
    seen.add(focused());
  }
  for (let i = 0; i < 4; i++) {
    press(c, BTN.UP);
    seen.add(focused());
  }
  expect(seen.has("Under")).toBe(false);
  expect(visible(c)).toContain("Dialog title");
});

test("Dialog: CROSS closes it and focus returns to the trigger", async () => {
  const c = await boot();
  focusOn(c, "Open");
  press(c, BTN.CIRCLE);
  expect(visible(c)).toContain("Dialog title");
  press(c, BTN.CROSS);
  expect(visible(c)).not.toContain("Dialog title");
  expect(focused()).toBe("Open");
});

test("DropdownMenu: the vendored menu opens, the d-pad moves, CIRCLE selects once and closes", async () => {
  const c = await boot();
  expect(visible(c)).toContain("Deletes 0");
  focusOn(c, "Menu");
  press(c, BTN.CIRCLE);
  expect(visible(c)).toContain("Edit");
  expect(visible(c)).toContain("Delete");
  expect(focused()).toBe("Edit");
  press(c, BTN.DOWN);
  expect(focused()).toBe("Delete");
  press(c, BTN.CIRCLE);
  expect(visible(c)).toContain("Deletes 1");
  expect(visible(c)).not.toContain("Edit");
  expect(focused()).toBe("Menu");
});
