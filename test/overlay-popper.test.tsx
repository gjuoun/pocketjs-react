// Batch 2 floating panels on the vendored shadcn sources: Popover (this file's first block), Tooltip and
// HoverCard. The scenes import the vendored ui/ files, so the Radix member names are the real ones.
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { getFocused } from "@pocketjs/framework/input";
import { Text, View } from "../src/elements.ts";
import { BTN } from "../src/index.ts";
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverTitle,
  PopoverTrigger,
} from "./fixtures/shadcn-full/ui/popover.tsx";
import { type Booted, bootScene, tap, textAt } from "./overlay-scene.ts";

const TXT = "text-sm text-white";
const PAGE = "#0f172a"; // bg-slate-900
const PANEL = "#1e293b"; // bg-slate-800
const ROW = "w-[100px] h-[30px] bg-slate-800";

let booted: Booted | undefined;
const pressed: string[] = [];
beforeEach(() => {
  pressed.length = 0;
});
afterEach(() => {
  booted?.dispose();
  booted = undefined;
  delete (globalThis as { __pocketPointer?: unknown }).__pocketPointer;
});

/** Text of the focused node's first text run, or undefined (the labels the scenes use). */
function focusedLabel(): string | undefined {
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

function PopoverScene(props: { spacer?: number }) {
  return (
    <View className="w-full h-full flex-col gap-2 p-2 bg-slate-900">
      <View style={{ height: props.spacer ?? 0 }} />
      <View className={ROW} focusable onPress={() => pressed.push("behind")}>
        <Text className={TXT}>Behind</Text>
      </View>
      <Popover>
        <PopoverTrigger>Open</PopoverTrigger>
        <PopoverContent>
          <PopoverTitle>Dimensions</PopoverTitle>
          <PopoverDescription>Set the size</PopoverDescription>
        </PopoverContent>
      </Popover>
    </View>
  );
}

describe("Popover", () => {
  test("popover sits below its anchor and does not cover it", async () => {
    booted = await bootScene(import.meta.path, () => <PopoverScene />);
    const { c } = booted;
    const trigger = textAt(c, "Open");
    tap(c, trigger.x + 2, trigger.y + 2);
    const title = textAt(c, "Dimensions");
    const bottom = trigger.y + trigger.h;
    // The panel's top sits below the trigger: the title's line is past the trigger's bottom edge.
    expect(title.y).toBeGreaterThan(bottom);
    // The gap is sideOffset (4) plus the panel padding (12) and a line of slack.
    expect(title.y - bottom).toBeGreaterThanOrEqual(4);
    expect(title.y - bottom).toBeLessThanOrEqual(24);
    // The trigger is still drawn where it was.
    expect(textAt(c, "Open")).toMatchObject({ x: trigger.x, y: trigger.y });
    // Pixels: the gap under the trigger is the page (slate-900), the panel's padding is its fill (slate-800).
    expect(c.pixel(trigger.x + 2, bottom + 2)).toBe(PAGE);
    expect(c.pixel(title.x - 4, title.y + 2)).toBe(PANEL);
  });

  test("popover flips above its trigger when the bottom has no room", async () => {
    booted = await bootScene(import.meta.path, () => <PopoverScene spacer={190} />);
    const { c } = booted;
    const trigger = textAt(c, "Open");
    tap(c, trigger.x + 2, trigger.y + 2);
    const title = textAt(c, "Dimensions");
    expect(title.y + title.h).toBeLessThan(trigger.y);
  });

  test("a tap outside an open popover closes it and presses nothing behind", async () => {
    booted = await bootScene(import.meta.path, () => <PopoverScene />);
    const { c } = booted;
    const trigger = textAt(c, "Open");
    tap(c, trigger.x + 2, trigger.y + 2);
    expect(c.texts().map((r) => r.text)).toContain("Dimensions");
    const behind = textAt(c, "Behind");
    tap(c, behind.x + 2, behind.y + 2);
    expect(c.texts().map((r) => r.text)).not.toContain("Dimensions");
    expect(pressed).toEqual([]);
  });

  test("a second press on the trigger closes the popover", async () => {
    booted = await bootScene(import.meta.path, () => <PopoverScene />);
    const { c } = booted;
    const trigger = textAt(c, "Open");
    tap(c, trigger.x + 2, trigger.y + 2);
    tap(c, trigger.x + 2, trigger.y + 2);
    expect(c.texts().map((r) => r.text)).not.toContain("Dimensions");
  });

  test("opening takes no focus when the panel has nothing focusable; CROSS closes it", async () => {
    booted = await bootScene(import.meta.path, () => <PopoverScene />);
    const { c } = booted;
    const trigger = textAt(c, "Open");
    tap(c, trigger.x + 2, trigger.y + 2);
    expect(focusedLabel()).toBe("Open");
    c.press(BTN.CROSS);
    expect(c.texts().map((r) => r.text)).not.toContain("Dimensions");
  });
});
