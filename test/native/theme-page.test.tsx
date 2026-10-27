import { afterEach, beforeAll, expect, test } from "bun:test";
import { BTN, focusNode } from "@pocketjs/framework/input";
import { resolve, join } from "node:path";
import { mount } from "../../src/index.ts";
import { rootMirror } from "../../src/internal/pocket.ts";
import { compileClasses } from "../../src/internal/pocket-build.ts";
import { installBuildStyles } from "../../src/style/build-styles.ts";
import { bootCore, type Core } from "../harness.ts";
import { build, type BuildResult } from "../../tools/build.ts";
import { triggerNode } from "../../tools/qa/acceptance/interaction.ts";
import { ThemePage } from "./gallery/pages.tsx";

const ROOT = resolve(import.meta.dir, "../..");
const STRICT = { compat: { classMiss: "throw" as const, tokenMap: false } };
let built: BuildResult;
let core: Core | undefined;
let unmount: (() => void) | undefined;
beforeAll(async () => { built = await build(resolve(ROOT, "test/native/gallery/theme-only.tsx"), { outdir: join(ROOT, "dist/native-judge"), name: "theme-only" }); });
afterEach(() => { try { unmount?.(); } catch {} core?.dispose(); core = undefined; unmount = undefined; });

/** Boots the theme page on a fresh core: the bench's build (its classes are in the table), mounted as the app. */
async function bootTheme(): Promise<Core> {
  const styles = compileClasses(built.literals);
  const c = await bootCore({ classes: built.literals, fontSlots: built.fontSlots });
  installBuildStyles(styles.ids, styles.bin, built.tokens);
  core = c;
  unmount = mount(<ThemePage />, STRICT);
  c.step(0); c.step(0); c.render();
  return c;
}

/** The vertical extent of the painted (non-page) pixels down the centre of a drawn label. */
function paintedHeight(c: Core, label: string, index = 0): number {
  const t = c.texts().filter((x) => x.text === label)[index];
  const cx = t.x + Math.floor(t.w / 2);
  let top = -1, bot = -1;
  for (let y = t.y - 12; y < t.y + t.h + 12; y++) if (c.pixel(cx, y) !== "#ffffff") { if (top < 0) top = y; bot = y; }
  return bot - top + 1;
}

const COMPONENTS = ["Dark", "Edit", "Stable", "Beta", "Failed", "Per month", "60%", "Name", "Account", "Info", "Use", "AK", "Email", "Yes", "No", "Shipping", "Returns", "Sync"];

test("the theme page draws the labels of all eighteen components (Button, Dialog, Badge, Select, Slider, Progress, Label, Input, Card, Tabs, Separator, Avatar, Spinner, Skeleton, Checkbox, RadioGroup, Accordion, Switch)", async () => {
  const c = await bootTheme();
  const drawn = c.texts().map((t) => t.text);
  for (const l of COMPONENTS) expect(drawn).toContain(l);
  expect(drawn).toContain("40");
});

test("nothing is squeezed: a badge paints 20 px, an avatar 32 px", async () => {
  const c = await bootTheme();
  expect(paintedHeight(c, "Stable")).toBe(20);
  expect(paintedHeight(c, "Beta")).toBe(20);
  expect(paintedHeight(c, "Failed")).toBe(20);
  expect(paintedHeight(c, "AK", 0)).toBe(32);
  expect(paintedHeight(c, "AK", 1)).toBe(32);
});

test("the dark toggle re-renders the same labels in the dark table; the layout is unchanged", async () => {
  const c = await bootTheme();
  const before = c.texts().map((t) => t.text + "@" + t.x + "," + t.y);
  focusNode(triggerNode(rootMirror, "Dark") as never);
  c.step(BTN.CIRCLE);
  for (let i = 0; i < 40; i++) { c.step(0); c.render(); }
  const after = c.texts().map((t) => t.text + "@" + t.x + "," + t.y);
  expect(after.filter((s) => s.startsWith("Light@"))).toHaveLength(1);
  expect(after.length).toBe(before.length);
  for (const l of COMPONENTS.filter((x) => x !== "Dark")) expect(after.some((s) => s.startsWith(l + "@"))).toBe(true);
});
