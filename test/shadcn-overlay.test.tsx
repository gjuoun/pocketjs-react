// C5 overlays on the real wasm core, mounted in-process like the C3 demo: the vendored shadcn
// dialog (codemod output) opens its content into the overlay layer, traps d-pad focus, and
// gives focus back on close. Focus is the core's focused node (getFocused). The menu and the select
// ride the same overlay layer; the last test runs them under the strict C3 policies.
import { afterEach, expect, test } from "bun:test";
import { BTN, getFocused } from "@pocketjs/framework/input";
import { compatStats, mount, resetCompatStats } from "../src/index.ts";
import { compileClasses } from "../src/internal/pocket-build.ts";
import { installBuildStyles } from "../src/style/build-styles.ts";
import { build } from "../tools/build.ts";
import { Overlays } from "./fixtures/shadcn-vendor/overlays.tsx";
import { Submenu } from "./fixtures/shadcn-vendor/submenu.tsx";
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

async function boot(
  compat: Parameters<typeof mount>[1] = { compat: { classMiss: "drop" } },
): Promise<Core> {
  const built = await build(`${VENDOR}/overlays-main.tsx`, {
    outdir: OUT,
    name: "shadcn-overlays",
  });
  core = await bootCore({ classes: built.tokens });
  installBuildStyles({}, compileClasses([]).bin, built.tokens);
  unmount = mount(<Overlays />, compat);
  core.step(0);
  return core;
}
const press = (c: Core, button: number) => c.press(button, SETTLE);
const visible = (c: Core): string[] => c.texts().map((r) => r.text);
/** Text of the focused node's first text descendant (a Button or Trigger shows its label). */
function focused(): string | undefined {
  const walk = (node: {
    text?: string;
    children: unknown[];
  }): string | undefined => {
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
  // the only focusable inside the dialog is its own close control (glyph "x"); nothing beneath is reachable
  expect([...seen].every((label) => label === "x")).toBe(true);
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

test("Select: the vendored select shows its placeholder, selects Banana once, and returns focus to the trigger", async () => {
  const c = await boot();
  expect(visible(c)).toContain("Pick fruit");
  focusOn(c, "Pick fruit");
  press(c, BTN.CIRCLE);
  expect(visible(c)).toContain("Apple");
  expect(visible(c)).toContain("Banana");
  expect(focused()).toBe("Apple");
  press(c, BTN.DOWN);
  expect(focused()).toBe("Banana");
  press(c, BTN.CIRCLE);
  expect(visible(c)).toContain("Fruit changes 1");
  expect(visible(c)).not.toContain("Apple");
  expect(visible(c)).toContain("Banana");
  expect(focused()).toBe("Banana");
  // Reopened: focus moves from the trigger onto the selected row, whose first text is its check glyph.
  press(c, BTN.CIRCLE);
  expect(focused()).not.toBe("Banana");
  expect(visible(c)).toContain("Apple");
  press(c, BTN.CROSS);
  expect(visible(c)).toContain("Fruit changes 1");
});

test("the vendored menu and select keep the d-pad inside them", async () => {
  const c = await boot();
  focusOn(c, "Menu");
  press(c, BTN.CIRCLE);
  const seen = new Set<string | undefined>();
  for (let i = 0; i < 4; i++) {
    press(c, BTN.DOWN);
    seen.add(focused());
  }
  for (let i = 0; i < 4; i++) {
    press(c, BTN.UP);
    seen.add(focused());
  }
  expect([...seen].every((label) => label === "Edit" || label === "Delete")).toBe(true);
  expect(seen.has("Open")).toBe(false);
  expect(seen.has("Pick fruit")).toBe(false);
  expect(seen.has("Menu")).toBe(false);
  press(c, BTN.CROSS);
  expect(focused()).toBe("Menu");
  focusOn(c, "Pick fruit");
  press(c, BTN.CIRCLE);
  const seen2 = new Set<string | undefined>();
  for (let i = 0; i < 4; i++) {
    press(c, BTN.DOWN);
    seen2.add(focused());
  }
  expect([...seen2].every((label) => label === "Apple" || label === "Banana")).toBe(true);
  expect(seen2.has("Menu")).toBe(false);
  expect(seen2.has(undefined)).toBe(false);
});

test("strict: the vendored overlays open under classMiss=throw and tokenMap=false (the source speaks PocketJS)", async () => {
  const c = await boot({ compat: { classMiss: "throw", tokenMap: false } });
  focusOn(c, "Open");
  press(c, BTN.CIRCLE);
  expect(visible(c)).toContain("Dialog title");
  press(c, BTN.CROSS);
  focusOn(c, "Menu");
  press(c, BTN.CIRCLE);
  expect(visible(c)).toContain("Edit");
  press(c, BTN.CROSS);
  focusOn(c, "Pick fruit");
  press(c, BTN.CIRCLE);
  expect(visible(c)).toContain("Banana");
  press(c, BTN.CROSS);
  const stats = compatStats();
  expect(stats.classMiss).toEqual({ tokens: 0, literals: 0 });
  expect(stats.tokenMap).toEqual({ mapped: 0, dropped: 0 });
});

test("Dialog: the scrim dims the app behind it (slate-950 at 60%); the panel stays opaque", async () => {
  const c = await boot();
  c.render();
  const base = c.pixel(2, 2); // the app's page, outside every panel
  focusOn(c, "Open");
  press(c, BTN.CIRCLE);
  expect(visible(c)).toContain("Dialog title");
  c.render();
  const dimmed = c.pixel(2, 2);
  const rgb = (hex: string) =>
    [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  const page = rgb(base);
  const scrim = rgb("#0f172a");
  const want = page.map((v, i) => 0.4 * v + 0.6 * scrim[i]);
  // Darkened, not the opaque slate-950 the scrim used to paint, and within 3 levels of the blend.
  expect(dimmed).not.toBe("#020617");
  const got = rgb(dimmed);
  got.forEach((v, i) => {
    expect(v).toBeLessThan(page[i]);
    expect(Math.abs(v - want[i])).toBeLessThanOrEqual(3);
  });
  // The panel is outside the scrim's blend: its surface is the primitive's slate-800.
  const title = c.texts().find((r) => r.text === "Dialog title")!;
  expect(c.pixel(title.x - 4, title.y + 2)).toBe("#1e293b");
});

// C9 sub-menus on the same overlay path. The menu opens Edit and More; More opens Copy and Paste.
// Esc on the device is CROSS, so each CROSS closes one level.

async function bootSub(): Promise<Core> {
  const built = await build(`${VENDOR}/submenu-main.tsx`, {
    outdir: OUT,
    name: "shadcn-submenu",
  });
  core = await bootCore({ classes: built.tokens });
  installBuildStyles({}, compileClasses([]).bin, built.tokens);
  unmount = mount(<Submenu />, { compat: { classMiss: "drop" } });
  core.step(0);
  return core;
}

test("sub: the vendored menu opens its sub-menu trigger without throwing", async () => {
  const c = await bootSub();
  focusOn(c, "Menu");
  press(c, BTN.CIRCLE);
  expect(visible(c)).toContain("Edit");
  expect(visible(c)).toContain("More");
});

test("sub: RIGHT enters the sub-menu on its first item and LEFT returns to More", async () => {
  const c = await bootSub();
  focusOn(c, "Menu");
  press(c, BTN.CIRCLE);
  focusOn(c, "More");
  press(c, BTN.RIGHT);
  expect(visible(c)).toContain("Paste");
  expect(focused()).toBe("Copy");
  press(c, BTN.LEFT);
  expect(visible(c)).not.toContain("Paste");
  expect(focused()).toBe("More");
});

test("nested: CROSS closes one level at a time and returns focus to each opener", async () => {
  const c = await bootSub();
  focusOn(c, "Menu");
  press(c, BTN.CIRCLE);
  focusOn(c, "More");
  press(c, BTN.RIGHT);
  expect(focused()).toBe("Copy");
  press(c, BTN.CROSS);
  expect(visible(c)).not.toContain("Paste");
  expect(visible(c)).toContain("Edit");
  expect(focused()).toBe("More");
  press(c, BTN.CROSS);
  expect(visible(c)).not.toContain("Edit");
  expect(focused()).toBe("Menu");
});

test("nested: selecting a sub-item calls onSelect once and closes the whole tree", async () => {
  const c = await bootSub();
  focusOn(c, "Menu");
  press(c, BTN.CIRCLE);
  focusOn(c, "More");
  press(c, BTN.RIGHT);
  press(c, BTN.CIRCLE);
  expect(visible(c)).toContain("Copies 1");
  expect(visible(c)).not.toContain("Edit");
  expect(visible(c)).not.toContain("Paste");
  expect(focused()).toBe("Menu");
});

test("nested: while the sub-menu is open the d-pad cannot reach the app beneath", async () => {
  const c = await bootSub();
  focusOn(c, "Menu");
  press(c, BTN.CIRCLE);
  focusOn(c, "More");
  press(c, BTN.RIGHT);
  const seen = new Set<string | undefined>();
  for (let i = 0; i < 4; i++) {
    press(c, BTN.DOWN);
    seen.add(focused());
    press(c, BTN.UP);
    seen.add(focused());
  }
  expect([...seen].every((label) => label === "Copy" || label === "Paste")).toBe(true);
  expect(seen.has("Below")).toBe(false);
  expect(seen.has("Menu")).toBe(false);
});
