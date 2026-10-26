// Batch 2 floating panels on the vendored shadcn sources: Popover (this file's first block), Tooltip and
// HoverCard. The scenes import the vendored ui/ files, so the Radix member names are the real ones.
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { focusNode, getFocused } from "@pocketjs/framework/input";
import { getOverlayLayer } from "../src/renderer/mount.ts";
import type { NodeMirror } from "../src/internal/pocket.ts";
import { Text, View } from "../src/elements.ts";
import { BTN } from "../src/index.ts";
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverTitle,
  PopoverTrigger,
} from "./fixtures/shadcn-full/ui/popover.tsx";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "./fixtures/shadcn-full/ui/hover-card.tsx";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./fixtures/shadcn-full/ui/tooltip.tsx";
import {
  type Booted,
  bootScene,
  frame,
  frames,
  leave,
  move,
  press,
  tap,
  textAt,
} from "./overlay-scene.ts";
import type { Core } from "./harness.ts";

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
    await tap(c, trigger.x + 2, trigger.y + 2);
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
    await tap(c, trigger.x + 2, trigger.y + 2);
    const title = textAt(c, "Dimensions");
    expect(title.y + title.h).toBeLessThan(trigger.y);
  });

  test("a tap outside an open popover closes it and presses nothing behind", async () => {
    booted = await bootScene(import.meta.path, () => <PopoverScene />);
    const { c } = booted;
    const trigger = textAt(c, "Open");
    await tap(c, trigger.x + 2, trigger.y + 2);
    expect(c.texts().map((r) => r.text)).toContain("Dimensions");
    const behind = textAt(c, "Behind");
    await tap(c, behind.x + 2, behind.y + 2);
    expect(c.texts().map((r) => r.text)).not.toContain("Dimensions");
    expect(pressed).toEqual([]);
  });

  test("a second press on the trigger closes the popover", async () => {
    booted = await bootScene(import.meta.path, () => <PopoverScene />);
    const { c } = booted;
    const trigger = textAt(c, "Open");
    await tap(c, trigger.x + 2, trigger.y + 2);
    await tap(c, trigger.x + 2, trigger.y + 2);
    expect(c.texts().map((r) => r.text)).not.toContain("Dimensions");
  });

  test("opening takes no focus when the panel has nothing focusable; CROSS closes it", async () => {
    booted = await bootScene(import.meta.path, () => <PopoverScene />);
    const { c } = booted;
    const trigger = textAt(c, "Open");
    await tap(c, trigger.x + 2, trigger.y + 2);
    expect(focusedLabel()).toBe("Open");
    await press(c, BTN.CROSS);
    expect(c.texts().map((r) => r.text)).not.toContain("Dimensions");
  });
});

// ---- helpers for Tooltip and HoverCard ----------------------------------------------------------------

/** Press d-pad DOWN or UP until the focused label is `label` (at most four presses). */
async function focusOn(c: Core, label: string): Promise<void> {
  for (let i = 0; i < 4 && focusedLabel() !== label; i++) {
    await press(c, BTN.DOWN);
    if (focusedLabel() !== label) await press(c, BTN.UP);
  }
  expect(focusedLabel()).toBe(label);
}

function visibleTexts(c: Core): string[] {
  return c.texts().map((r) => r.text);
}

/** Steps frames until `pred` holds; returns the frame count, or -1 past the cap. */
async function framesUntil(c: Core, pred: () => boolean, cap = 120): Promise<number> {
  for (let i = 0; i <= cap; i++) {
    if (pred()) return i;
    await frame(c);
  }
  return -1;
}

/** The first focusable node inside the overlay layer (a panel's own control). */
function overlayFocusable(): NodeMirror {
  const walk = (node: NodeMirror): NodeMirror | null => {
    for (const child of node.children) {
      if (child.focusable) return child;
      const deeper = walk(child);
      if (deeper) return deeper;
    }
    return null;
  };
  const found = walk(getOverlayLayer());
  if (!found) throw new Error("no focusable in the overlay");
  return found;
}


function TipScene() {
  return (
    <View className="w-full h-full flex-col gap-2 p-2 bg-slate-900">
      <View className={ROW} focusable onPress={() => pressed.push("behind")}>
        <Text className={TXT}>Behind</Text>
      </View>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger>Hover</TooltipTrigger>
          <TooltipContent>Add</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </View>
  );
}

function CardScene() {
  return (
    <View className="w-full h-full flex-col gap-2 p-2 bg-slate-900">
      <View className={ROW} focusable onPress={() => pressed.push("behind")}>
        <Text className={TXT}>Behind</Text>
      </View>
      <HoverCard>
        <HoverCardTrigger>@jun</HoverCardTrigger>
        <HoverCardContent>
          <Text className={TXT}>Joined 2023</Text>
          <View className={ROW} focusable onPress={() => pressed.push("follow")}>
            <Text className={TXT}>Follow</Text>
          </View>
        </HoverCardContent>
      </HoverCard>
    </View>
  );
}

describe("Tooltip", () => {
  test("tooltip never takes focus: it opens on focus with no delay", async () => {
    booted = await bootScene(import.meta.path, () => <TipScene />);
    const { c } = booted;
    await focusOn(c, "Hover");
    expect(await framesUntil(c, () => visibleTexts(c).includes("Add"), 3)).toBeGreaterThanOrEqual(0);
    expect(focusedLabel()).toBe("Hover");
  });

  test("the tooltip closes when focus leaves the trigger", async () => {
    booted = await bootScene(import.meta.path, () => <TipScene />);
    const { c } = booted;
    await focusOn(c, "Hover");
    await framesUntil(c, () => visibleTexts(c).includes("Add"), 3);
    await focusOn(c, "Behind");
    expect(visibleTexts(c)).not.toContain("Add");
  });

  test("a tooltip is not a layer: a press on the app behind still lands", async () => {
    booted = await bootScene(import.meta.path, () => <TipScene />);
    const { c } = booted;
    await focusOn(c, "Hover");
    await framesUntil(c, () => visibleTexts(c).includes("Add"), 3);
    const behind = textAt(c, "Behind");
    await tap(c, behind.x + 2, behind.y + 2);
    expect(pressed).toEqual(["behind"]);
  });

  test("a press on the trigger closes it, and it stays closed while focus stays", async () => {
    booted = await bootScene(import.meta.path, () => <TipScene />);
    const { c } = booted;
    await focusOn(c, "Hover");
    await framesUntil(c, () => visibleTexts(c).includes("Add"), 3);
    const trigger = textAt(c, "Hover");
    await tap(c, trigger.x + 2, trigger.y + 2);
    await frames(c, 60);
    expect(visibleTexts(c)).not.toContain("Add");
  });

  test("web hover opens the tooltip over the trigger and leave closes it", async () => {
    booted = await bootScene(import.meta.path, () => <TipScene />);
    const { c } = booted;
    const trigger = textAt(c, "Hover");
    await move(c, trigger.x + 2, trigger.y + 2);
    expect(await framesUntil(c, () => visibleTexts(c).includes("Add"), 3)).toBeGreaterThanOrEqual(0);
    await leave(c);
    expect(visibleTexts(c)).not.toContain("Add");
  });
});

describe("HoverCard", () => {
  test("opens after about 700 ms (42 frames) of focus, not before", async () => {
    booted = await bootScene(import.meta.path, () => <CardScene />);
    const { c } = booted;
    await focusOn(c, "@jun");
    const count = await framesUntil(c, () => visibleTexts(c).includes("Joined 2023"));
    expect(count).toBeGreaterThanOrEqual(40);
    expect(count).toBeLessThanOrEqual(46);
  });

  test("a tap outside closes it, and the close holds while focus stays on the trigger", async () => {
    booted = await bootScene(import.meta.path, () => <CardScene />);
    const { c } = booted;
    await focusOn(c, "@jun");
    await framesUntil(c, () => visibleTexts(c).includes("Joined 2023"));
    // The card is placed on the frame after it mounts (it is hidden at the corner until then).
    await frames(c, 2);
    const behind = textAt(c, "Behind");
    await tap(c, behind.x + 2, behind.y + 2);
    expect(visibleTexts(c)).not.toContain("Joined 2023");
    await frames(c, 60);
    expect(visibleTexts(c)).not.toContain("Joined 2023");
    expect(pressed).toEqual([]);
  });

  test("focus inside the card keeps it open; leaving closes it after about 300 ms (18 frames)", async () => {
    booted = await bootScene(import.meta.path, () => <CardScene />);
    const { c } = booted;
    await focusOn(c, "Behind");
    const behind = getFocused();
    await focusOn(c, "@jun");
    await framesUntil(c, () => visibleTexts(c).includes("Joined 2023"));
    focusNode(overlayFocusable());
    await frames(c, 60);
    expect(visibleTexts(c)).toContain("Joined 2023");
    focusNode(behind);
    const count = await framesUntil(c, () => !visibleTexts(c).includes("Joined 2023"));
    expect(count).toBeGreaterThanOrEqual(16);
    expect(count).toBeLessThanOrEqual(20);
  });

  test("web hover opens after the open delay and closes after the close delay", async () => {
    booted = await bootScene(import.meta.path, () => <CardScene />);
    const { c } = booted;
    const trigger = textAt(c, "@jun");
    await move(c, trigger.x + 2, trigger.y + 2);
    const opened = await framesUntil(c, () => visibleTexts(c).includes("Joined 2023"));
    expect(opened).toBeGreaterThanOrEqual(40);
    expect(opened).toBeLessThanOrEqual(46);
    await leave(c);
    const closed = await framesUntil(c, () => !visibleTexts(c).includes("Joined 2023"));
    expect(closed).toBeGreaterThanOrEqual(16);
    expect(closed).toBeLessThanOrEqual(20);
  });
});
