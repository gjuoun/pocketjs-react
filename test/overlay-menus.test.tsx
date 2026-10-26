// Batch 2 menus on the vendored shadcn sources: ContextMenu (a long press or TRIANGLE opens it at the
// pointer or the trigger corner) and Menubar (LEFT and RIGHT switch the open menu; the drop is aligned by
// alignOffset -4 and sideOffset 8).
import { afterEach, describe, expect, test } from "bun:test";
import { BTN } from "../src/index.ts";
import { View } from "../src/elements.ts";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "./fixtures/shadcn-full/ui/context-menu.tsx";
import {
  Menubar,
  MenubarContent,
  MenubarItem,
  MenubarMenu,
  MenubarSeparator,
  MenubarTrigger,
} from "./fixtures/shadcn-full/ui/menubar.tsx";
import { type Booted, bootScene, frames, hold, press, tap, textAt } from "./overlay-scene.ts";
import type { Core } from "./harness.ts";

const ROW = "w-[100px] h-[30px] bg-slate-800";

let booted: Booted | undefined;
afterEach(() => {
  booted?.dispose();
  booted = undefined;
  delete (globalThis as { __pocketPointer?: unknown }).__pocketPointer;
});

function labels(c: Core): string[] {
  return c.texts().map((r) => r.text);
}

function ContextScene() {
  return (
    <View className="w-full h-full flex-col gap-2 p-2 bg-slate-100">
      <View style={{ height: 40 }} />
      <ContextMenu>
        <ContextMenuTrigger>Area</ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuItem>Copy</ContextMenuItem>
          <ContextMenuItem>Paste</ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
    </View>
  );
}

function BarScene() {
  return (
    <View className="w-full h-full flex-col gap-2 p-2 bg-slate-100">
      <Menubar>
        <MenubarMenu value="file">
          <MenubarTrigger>File</MenubarTrigger>
          <MenubarContent>
            <MenubarItem>New</MenubarItem>
            <MenubarSeparator />
            <MenubarItem>Open</MenubarItem>
          </MenubarContent>
        </MenubarMenu>
        <MenubarMenu value="edit">
          <MenubarTrigger>Edit</MenubarTrigger>
          <MenubarContent>
            <MenubarItem>Copy</MenubarItem>
          </MenubarContent>
        </MenubarMenu>
      </Menubar>
      <View className={ROW} />
    </View>
  );
}

describe("ContextMenu", () => {
  test("a long press opens the menu at the pointer, not at the trigger", async () => {
    booted = await bootScene(import.meta.path, () => <ContextScene />);
    const { c } = booted;
    const area = textAt(c, "Area");
    const px = area.x + 25;
    const py = area.y + 3;
    await hold(c, px, py, 30);
    const copy = textAt(c, "Copy");
    // The panel's padding (4) and the item's padding (8) sit between the pointer and its label.
    expect(copy.x - px).toBeGreaterThanOrEqual(10);
    expect(copy.x - px).toBeLessThanOrEqual(14);
    expect(copy.y - py).toBeGreaterThanOrEqual(0);
    expect(copy.y - py).toBeLessThanOrEqual(24);
  });

  test("a short press does not open it", async () => {
    booted = await bootScene(import.meta.path, () => <ContextScene />);
    const { c } = booted;
    const area = textAt(c, "Area");
    await tap(c, area.x + 2, area.y + 2);
    expect(labels(c)).not.toContain("Copy");
  });

  test("TRIANGLE on the focused trigger opens it at the trigger's corner", async () => {
    booted = await bootScene(import.meta.path, () => <ContextScene />);
    const { c } = booted;
    const area = textAt(c, "Area");
    await tap(c, area.x + 2, area.y + 2);
    await press(c, BTN.TRIANGLE);
    const copy = textAt(c, "Copy");
    expect(copy.x - area.x).toBeGreaterThanOrEqual(10);
    expect(copy.x - area.x).toBeLessThanOrEqual(14);
  });
});

describe("Menubar", () => {
  test("the drop sits under its trigger, aligned to the label (alignOffset -4, sideOffset 8)", async () => {
    booted = await bootScene(import.meta.path, () => <BarScene />);
    const { c } = booted;
    const file = textAt(c, "File");
    await tap(c, file.x + 2, file.y + 2);
    const item = textAt(c, "New");
    expect(Math.abs(item.x - file.x)).toBeLessThanOrEqual(2);
    expect(item.y - (file.y + file.h)).toBeGreaterThanOrEqual(12);
    expect(item.y - (file.y + file.h)).toBeLessThanOrEqual(26);
  });

  test("menubar switches with LEFT and RIGHT: one menu open at a time", async () => {
    booted = await bootScene(import.meta.path, () => <BarScene />);
    const { c } = booted;
    const file = textAt(c, "File");
    await tap(c, file.x + 2, file.y + 2);
    expect(labels(c)).toContain("New");
    expect(labels(c)).not.toContain("Copy");
    await press(c, BTN.RIGHT);
    await frames(c, 2);
    expect(labels(c)).toContain("Copy");
    expect(labels(c)).not.toContain("New");
    await press(c, BTN.LEFT);
    await frames(c, 2);
    expect(labels(c)).toContain("New");
    expect(labels(c)).not.toContain("Copy");
  });

  test("a tap outside an open menubar menu closes it", async () => {
    booted = await bootScene(import.meta.path, () => <BarScene />);
    const { c } = booted;
    const file = textAt(c, "File");
    await tap(c, file.x + 2, file.y + 2);
    expect(labels(c)).toContain("New");
    await tap(c, 200, 200);
    expect(labels(c)).not.toContain("New");
  });
});
