// Batch 2 shims: the vaul Drawer (a bottom-docked Dialog), the sonner toaster and the next-themes hook.
// The scenes import the shim modules by their src path; the package subpaths (pocketjs-react/vaul and
// friends) are the same modules, exported in the R8 step.
import { afterEach, describe, expect, test } from "bun:test";
import { getOps, hostViewport } from "@pocketjs/framework/host";
import { Text, View } from "../src/elements.ts";
import { BTN } from "../src/index.ts";
import { useTheme } from "../src/primitives/next-themes.tsx";
import { Drawer } from "../src/primitives/vaul.ts";
import { Toaster, toast } from "../src/primitives/sonner.tsx";
import { type Booted, bootScene, frame, frames, press, tap, textAt } from "./overlay-scene.ts";
import type { Core } from "./harness.ts";

const PANEL = "#1e293b"; // bg-slate-800, the drawer's and the toast's fill

let booted: Booted | undefined;
afterEach(() => {
  toast.dismiss();
  booted?.dispose();
  booted = undefined;
  delete (globalThis as { __pocketPointer?: unknown }).__pocketPointer;
});

function labels(c: Core): string[] {
  return c.texts().map((r) => r.text);
}

function DrawerScene() {
  return (
    <View className="w-full h-full flex-col gap-2 p-2 bg-slate-100">
      <Drawer.Root>
        <Drawer.Trigger>Open</Drawer.Trigger>
        <Drawer.Content>
          <Drawer.Title>Move goal</Drawer.Title>
          <Drawer.Description>Set</Drawer.Description>
        </Drawer.Content>
      </Drawer.Root>
    </View>
  );
}

function ToastScene() {
  return (
    <View className="w-full h-full flex-col gap-2 p-2 bg-slate-100">
      <View className="w-[100px] h-[30px] bg-slate-800" focusable onPress={() => pressed.push("behind")}>
        <Text className="text-sm text-white">Behind</Text>
      </View>
      <Toaster />
    </View>
  );
}

const pressed: string[] = [];

describe("drawer (vaul shim)", () => {
  test("drawer content is docked to the bottom edge at full width", async () => {
    booted = await bootScene(import.meta.path, () => <DrawerScene />);
    const { c } = booted;
    const trigger = textAt(c, "Open");
    await tap(c, trigger.x + 2, trigger.y + 2);
    await frames(c, 2);
    const vp = hostViewport(getOps());
    if (!vp) throw new Error("no viewport");
    const title = textAt(c, "Move goal");
    expect(title.y).toBeGreaterThan(vp.h / 2);
    // The panel fills the bottom row edge to edge; the top of the screen is the scrim, not the panel.
    // The bottom corners are rounded (rounded-xl), so the probes sit inside the arcs.
    expect(c.pixel(24, vp.h - 3)).toBe(PANEL);
    expect(c.pixel(vp.w - 25, vp.h - 3)).toBe(PANEL);
    expect(c.pixel(Math.floor(vp.w / 2), vp.h - 3)).toBe(PANEL);
    expect(c.pixel(Math.floor(vp.w / 2), 2)).not.toBe(PANEL);
  });

  test("CROSS closes the drawer; a tap on the scrim closes it too", async () => {
    booted = await bootScene(import.meta.path, () => <DrawerScene />);
    const { c } = booted;
    const trigger = textAt(c, "Open");
    await tap(c, trigger.x + 2, trigger.y + 2);
    await frames(c, 2);
    await press(c, BTN.CROSS);
    expect(labels(c)).not.toContain("Move goal");
    await tap(c, trigger.x + 2, trigger.y + 2);
    await frames(c, 2);
    expect(labels(c)).toContain("Move goal");
    await tap(c, 4, 4);
    expect(labels(c)).not.toContain("Move goal");
  });
});

describe("sonner (toaster shim)", () => {
  test("a toast sits in the bottom-right corner and closes after about 4000 ms (240 frames)", async () => {
    booted = await bootScene(import.meta.path, () => <ToastScene />);
    const { c } = booted;
    toast("Saved");
    await frame(c);
    const vp = hostViewport(getOps());
    if (!vp) throw new Error("no viewport");
    const saved = textAt(c, "Saved");
    expect(saved.x).toBeGreaterThan(vp.w / 2);
    expect(saved.y).toBeGreaterThan(vp.h / 2);
    let count = 0;
    while (labels(c).includes("Saved") && count < 400) {
      await frame(c);
      count++;
    }
    expect(count).toBeGreaterThanOrEqual(236);
    expect(count).toBeLessThanOrEqual(244);
  });

  test("a toast takes no focus and a press on the app behind still lands", async () => {
    booted = await bootScene(import.meta.path, () => <ToastScene />);
    const { c } = booted;
    toast("Saved");
    await frame(c);
    const behind = textAt(c, "Behind");
    await tap(c, behind.x + 2, behind.y + 2);
    expect(pressed).toEqual(["behind"]);
    expect(labels(c)).toContain("Saved");
  });
});

describe("next-themes shim", () => {
  test("useTheme is a constant light theme, and setTheme writes nothing", () => {
    const theme = useTheme();
    expect(theme.theme).toBe("light");
    expect(theme.resolvedTheme).toBe("light");
    expect(theme.themes).toEqual(["light"]);
    expect(() => theme.setTheme("dark")).not.toThrow();
  });
});
