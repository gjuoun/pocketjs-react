// tools/build.ts against the real wasm core: compiled class literals draw their focus:
// variant, the font-slot cross product draws runtime combinations, and Pocket3D-licensed
// inputs fail the build.
import { afterEach, expect, test } from "bun:test";
import { BTN } from "@pocketjs/framework/input";
import { NODE_TYPE, PROP } from "../src/internal/pocket.ts";
import { fontSlotFor, unpack } from "../src/internal/pocket-build.ts";
import { build } from "../tools/build.ts";
import { bootApp, type Core } from "./harness.ts";

const OUT = "/tmp/pocketjs-react-test/build";
let core: Core | undefined;
afterEach(() => core?.dispose());

test("a compiled focus: variant redraws the row the d-pad focuses", async () => {
  core = await bootApp(
    await build("test/fixtures/styled/main.tsx", { outdir: OUT }),
  );
  const row = core.texts().find((r) => r.text === "One")!;
  const before = core.pixel(row.x - 4, row.y + 2);
  core.press(BTN.DOWN);
  core.texts();
  const after = core.pixel(row.x - 4, row.y + 2);
  expect(after).not.toBe(before);
  const other = core.texts().find((r) => r.text === "Two")!;
  expect(core.pixel(other.x - 4, other.y + 2)).toBe(before);
});

test("the font-slot cross product draws a size + weight pair no literal spells out", async () => {
  const built = await build("test/fixtures/slots/main.tsx", { outdir: OUT });
  expect(built.fontSlots).toContain(fontSlotFor(14, true));
  core = await bootApp(built);
  const drawn = (slot: number, text: string) => {
    const ops = core!.ops;
    const id = ops.createNode(NODE_TYPE.text);
    ops.setText(id, text);
    ops.setProp(id, PROP.fontSlot, slot);
    ops.insertBefore(1, id, 0);
    core!.step(0);
    return core!.texts().some((r) => r.text === text);
  };
  expect(drawn(fontSlotFor(14, true), "Bold")).toBe(true);
  expect(drawn(fontSlotFor(24, true), "Plain")).toBe(false);
});

test("the pak carries every baked icon variant as an IMG entry, within the size budget", async () => {
  const built = await build("test/fixtures/styled/main.tsx", { outdir: OUT });
  // 1903 canonical lucide icons x 3 colours at 16 px, plus the circle's 8 px filled variant x 3.
  expect(built.icons.length).toBe(1903 * 3 + 3);
  const bytes = new Uint8Array(await Bun.file(built.pak).arrayBuffer());
  const keys = new Set(unpack(bytes).map((b) => b.key));
  for (const key of built.icons) expect(keys.has(key)).toBe(true);
  expect(keys.has("ui:img.icon.chevron-down.16.slate-500")).toBe(true);
  expect(keys.has("ui:img.icon.circle.8.white")).toBe(true);
  expect(bytes.length).toBeLessThanOrEqual(4 * 1024 * 1024);
}, 60000);

test("a Pocket3D-licensed input fails the build", async () => {
  const run = Bun.spawnSync([
    "bun",
    "tools/build.ts",
    "test/fixtures/p3d-import/main.tsx",
    "--outdir=" + OUT,
  ]);
  expect(run.exitCode).toBe(1);
  expect(run.stderr.toString()).toContain(
    "node_modules/@pocketjs/framework/devices/LICENSE",
  );
});
