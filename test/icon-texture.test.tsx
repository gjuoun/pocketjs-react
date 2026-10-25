// The mount uploads every baked icon variant from the pak and registers it under its name, so an
// <Image src="icon.<name>.<px>.<colour>"/> resolves to a texture handle.
import { afterEach, expect, test } from "bun:test";
import { mount } from "../src/index.ts";
import { View } from "../src/elements.ts";
import { resolveTexture } from "../src/internal/pocket.ts";
import { bakeIcons } from "../tools/icon-bake.ts";
import { build } from "../tools/build.ts";
import { bootCore, type Core } from "./harness.ts";

const OUT = "/tmp/pocketjs-react-test/icon-texture";
let core: Core | undefined;
let unmount: (() => void) | undefined;
afterEach(() => {
  unmount?.();
  unmount = undefined;
  core?.dispose();
  core = undefined;
});

test("the mount registers every baked icon variant as a texture", async () => {
  const built = await build("test/fixtures/styled/main.tsx", { outdir: OUT });
  core = await bootCore({ pak: await Bun.file(built.pak).arrayBuffer() });
  unmount = mount(<View />);
  core.step(0);
  const ids = (await bakeIcons()).map((e) => e.id);
  const handles = ids.map((id) => resolveTexture(id));
  for (const h of handles) expect(h).toBeDefined();
  expect(new Set(handles).size).toBe(ids.length);
});
