// Icon colour: an icon Image draws the baked variant of the colour it inherits, a focused node's
// focus: colour reaches its icons, and a missing variant falls back to the placeholder and counts iconMiss.
import { afterEach, beforeEach, expect, test } from "bun:test";
import { BTN, getFocused } from "@pocketjs/framework/input";
import { compatStats, mount, resetCompatStats } from "../src/index.ts";
import { NODE_TYPE, type NodeMirror, rootMirror } from "../src/internal/pocket.ts";
import { installBuildStyles } from "../src/style/build-styles.ts";
import { iconVariantOf } from "../src/style/icon-colour.ts";
import { ChevronDownIcon, GlyphIcon } from "../src/primitives/glyph-icons.tsx";
import { build } from "../tools/build.ts";
import { unpack } from "../src/internal/pocket-build.ts";
import { bootCore, type Core } from "./harness.ts";

const OUT = "/tmp/pocketjs-react-test/icon-colour";
let core: Core | undefined;
let unmount: (() => void) | undefined;
let pak: ArrayBuffer | undefined;
let builtTokens: string[] = [];
let styleBin: Uint8Array = new Uint8Array(0);

beforeEach(async () => {
  if (!pak) {
    const built = await build("test/fixtures/icons/main.tsx", { outdir: OUT });
    pak = await Bun.file(built.pak).arrayBuffer();
    builtTokens = built.tokens;
    styleBin = unpack(new Uint8Array(pak)).find((b) => b.key === "ui:styles")!.data;
  }
  // The build's table and tokens, as the bundle installs them before mount (see tools/build.ts).
  installBuildStyles({}, styleBin, builtTokens);
  resetCompatStats();
});
afterEach(() => {
  unmount?.();
  unmount = undefined;
  core?.dispose();
  core = undefined;
  resetCompatStats();
});

async function boot(app: unknown): Promise<Core> {
  core = await bootCore({ pak });
  unmount = mount(app as never, { compat: { classMiss: "drop" } });
  core.step(0);
  return core;
}

/** Every icon Image in the mounted tree, in tree order. */
function icons(): NodeMirror[] {
  const out: NodeMirror[] = [];
  const walk = (n: NodeMirror) => {
    if (n.type === NODE_TYPE.image) out.push(n);
    for (const k of n.children) walk(k);
  };
  walk(rootMirror);
  return out;
}

test("an icon with no coloured ancestor draws the default-colour variant", async () => {
  await boot(<div className="flex p-2 bg-white"><ChevronDownIcon /></div>);
  expect(icons().map(iconVariantOf)).toEqual(["icon.chevron-down.16.slate-900"]);
});

test("an icon inherits its ancestor's text colour: slate-500 on a muted row", async () => {
  await boot(<div className="flex p-2 text-slate-500"><ChevronDownIcon /></div>);
  expect(icons().map(iconVariantOf)).toEqual(["icon.chevron-down.16.slate-500"]);
});

test("an icon on a dark surface draws the white variant", async () => {
  await boot(<div className="flex p-2 bg-slate-900 text-white"><ChevronDownIcon /></div>);
  expect(icons().map(iconVariantOf)).toEqual(["icon.chevron-down.16.white"]);
});

test("a focused button's focus: colour reaches its icon, and the colour returns when focus moves on", async () => {
  const c = await boot(
    <div className="flex flex-col gap-4 p-4 bg-white">
      <button className="flex w-[120px] h-[40px] bg-slate-900 focus:text-white"><ChevronDownIcon /></button>
      <button className="flex w-[120px] h-[40px] bg-white" />
    </div>,
  );
  const [first, second] = [...rootMirror.children[0].children[0].children] as NodeMirror[];
  const icon = icons()[0];
  expect(iconVariantOf(icon)).toBe("icon.chevron-down.16.slate-900");
  for (let i = 0; i < 6 && getFocused() !== first; i++) c.press(BTN.DOWN);
  expect(getFocused()).toBe(first);
  c.step(0);
  expect(iconVariantOf(icon)).toBe("icon.chevron-down.16.white");
  for (let i = 0; i < 6 && getFocused() !== second; i++) c.press(BTN.DOWN);
  expect(getFocused()).toBe(second);
  c.step(0);
  expect(iconVariantOf(icon)).toBe("icon.chevron-down.16.slate-900");
});

test("a glyph whose variant the pak lacks draws the placeholder and counts an iconMiss", async () => {
  const c = await boot(<div className="flex p-2 bg-white"><GlyphIcon name="no-such-icon" px={16} char="?" /></div>);
  expect(icons().length).toBe(0);
  expect(c.texts().some((r) => r.text === "?")).toBe(true);
  expect(compatStats().iconMiss).toBe(1);
});
