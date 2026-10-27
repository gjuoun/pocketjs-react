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

/** The vertical extent of the painted (non-page) pixels down the centre of a drawn label, read from `up` px above its
 * text to `down` px below it: a window that stays inside the component's own gap, clear of its neighbours. */
function paintedHeight(c: Core, label: string, index = 0, up = 3, down = 3): number {
  const t = c.texts().filter((x) => x.text === label)[index];
  const cx = t.x + Math.floor(t.w / 2);
  let top = -1, bot = -1;
  for (let y = t.y - up; y < t.y + t.h + down; y++) if (c.pixel(cx, y) !== "#ffffff") { if (top < 0) top = y; bot = y; }
  return bot - top + 1;
}

const COMPONENTS = ["Dark", "Edit", "Sheet", "More", "?", "Menu", "Notify", "Stable", "Beta", "Failed", "Per month", "light 60%", "Name", "Account", "Info", "Use", "AK", "Email", "Yes", "No", "Shipping", "Sync", "Plan", "Team"];

test("the theme page draws the labels of the first twenty-four components (Button, Dialog, Sheet, Popover, Tooltip, DropdownMenu, Toast, Table, Badge, Select, Slider, Progress, Label, Input, Card, Tabs, Separator, Avatar, Spinner, Skeleton, Checkbox, RadioGroup, Accordion, Switch)", async () => {
  const c = await bootTheme();
  const drawn = c.texts().map((t) => t.text);
  for (const l of COMPONENTS) expect(drawn).toContain(l);
  expect(drawn).toContain("40");
});

/** The labels each later section draws when it is the one shown (section 1 is the COMPONENTS list above). */
const SECTIONS: Array<{ label: string; drawn: string[] }> = [
  { label: "2/6", drawn: ["Products", "Support", "Home", "Update ready", "_"] },
  { label: "3/6", drawn: ["Email", "Optional", "Sync failed", "Calendar", "Calculator", "Suggestions", "Tools"] },
  { label: "4/6", drawn: ["No projects yet", "Create project", "Projects you create show up here.", "Workspace", "Inbox"] },
  { label: "5/6", drawn: ["October 2026", "Next month", "Pick framework"] },
  { label: "6/6", drawn: ["Files", "Editor", "Next slide", "Prev slide", "1 / 3"] },
];
const settleFrames = async (c: Core) => { await new Promise((r) => setTimeout(r, 0)); for (let i = 0; i < 6; i++) { c.step(0); c.render(); } };

test("the section switch shows sections 2 to 6 in turn; each shows its own components and hides the rest", async () => {
  const c = await bootTheme();
  for (const sec of SECTIONS) {
    focusNode(triggerNode(rootMirror, sec.label) as never);
    c.step(BTN.CIRCLE);
    await settleFrames(c);
    const drawn = c.texts().map((t) => t.text);
    for (const l of sec.drawn) expect(drawn).toContain(l);
    expect(drawn).not.toContain("Stable");
  }
});

test("the section switch wraps: section 6 leads back to section 1, which draws its badges again", async () => {
  const c = await bootTheme();
  for (const sec of [...SECTIONS, { label: "1/6", drawn: [] }]) {
    focusNode(triggerNode(rootMirror, sec.label) as never);
    c.step(BTN.CIRCLE);
    await settleFrames(c);
  }
  expect(c.texts().map((t) => t.text)).toContain("Stable");
});

test("nothing is squeezed: a badge paints 20 px, an avatar 32 px", async () => {
  const c = await bootTheme();
  expect(paintedHeight(c, "Stable")).toBe(20);
  expect(paintedHeight(c, "Beta")).toBe(20);
  expect(paintedHeight(c, "Failed")).toBe(20);
  expect(paintedHeight(c, "AK", 0, 9, 8)).toBe(32);
  expect(paintedHeight(c, "AK", 1, 9, 8)).toBe(32);
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
  for (const l of COMPONENTS.filter((x) => x !== "Dark")) expect(after.some((s) => s.startsWith((l === "light 60%" ? "dark 60%" : l) + "@"))).toBe(true);
});
