// C8 descendant rules: [&_svg:not([class*='text-'])]:text-* (and [&_svg]:) colour the icons below
// their node. An icon with its own text- class keeps it; with no rule, the default colour stays.
import { afterEach, beforeEach, expect, test } from "bun:test";
import { mount, resetCompatStats } from "../src/index.ts";
import { NODE_TYPE, type NodeMirror, rootMirror } from "../src/internal/pocket.ts";
import { installBuildStyles } from "../src/style/build-styles.ts";
import { iconVariantOf } from "../src/style/icon-colour.ts";
import { ChevronDownIcon } from "../src/primitives/glyph-icons.tsx";
import { build } from "../tools/build.ts";
import { unpack } from "../src/internal/pocket-build.ts";
import { bootCore, type Core } from "./harness.ts";

const OUT = "/tmp/pocketjs-react-test/compat-c8-descendant";
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
  core.step(0);
  return core;
}

function icons(): NodeMirror[] {
  const out: NodeMirror[] = [];
  const walk = (n: NodeMirror) => {
    if (n.type === NODE_TYPE.image) out.push(n);
    for (const k of n.children) walk(k);
  };
  walk(rootMirror);
  return out;
}

test("a [&_svg:not([class*='text-'])]:text-slate-500 rule colours an icon with no text class of its own", async () => {
  await boot(
    <div className="flex p-2 bg-white [&_svg:not([class*='text-'])]:text-slate-500">
      <ChevronDownIcon />
    </div>,
  );
  expect(icons().map(iconVariantOf)).toEqual(["icon.chevron-down.16.slate-500"]);
});

test("the rule does not reach an icon that carries its own text colour", async () => {
  await boot(
    <div className="flex p-2 bg-white [&_svg:not([class*='text-'])]:text-slate-500">
      <ChevronDownIcon className="text-white" />
    </div>,
  );
  expect(icons().map(iconVariantOf)).toEqual(["icon.chevron-down.16.white"]);
});

test("[&_svg]: is a descendant rule: it colours the icon and never the node itself", async () => {
  await boot(
    <div className="flex p-2 bg-white [&_svg]:text-slate-500">
      <ChevronDownIcon />
    </div>,
  );
  expect(icons().map(iconVariantOf)).toEqual(["icon.chevron-down.16.slate-500"]);
});

test("a node with no descendant rule leaves its icon on the default colour", async () => {
  await boot(
    <div className="flex p-2 bg-white">
      <ChevronDownIcon />
    </div>,
  );
  expect(icons().map(iconVariantOf)).toEqual(["icon.chevron-down.16.slate-900"]);
});
