// Batch 2 overlays: a modal that does not dismiss on an outside press (AlertDialog's contract). The
// scene uses ModalLayer directly; the vendored AlertDialog is covered once it exists.
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { useState } from "react";
import { Text, View } from "../src/elements.ts";
import { BTN } from "../src/index.ts";
import { ModalLayer } from "../src/primitives/modal-layer.tsx";
import { getFocused } from "@pocketjs/framework/input";
import { type Booted, bootScene, frames, press, tap, textAt } from "./overlay-scene.ts";
import type { Core } from "./harness.ts";

const TXT = "text-sm text-white";
const ROW = "w-[100px] h-[30px] bg-slate-800";
const PANEL = "flex-col p-3 rounded-xl bg-slate-800 w-[200px]";

let closes = 0;
const pressed: string[] = [];
let booted: Booted | undefined;
beforeEach(() => {
  closes = 0;
  pressed.length = 0;
});
afterEach(() => {
  booted?.dispose();
  booted = undefined;
});

function Scene() {
  const [open, setOpen] = useState(true);
  return (
    <View className="w-full h-full flex-col p-2 bg-slate-900">
      <View className={ROW} focusable onPress={() => pressed.push("behind")}>
        <Text className={TXT}>Behind</Text>
      </View>
      <ModalLayer
        open={open}
        dismissOutside={false}
        onClose={() => {
          closes++;
          setOpen(false);
        }}
        panelClassName={PANEL}
      >
        <Text className={TXT}>Inside</Text>
      </ModalLayer>
    </View>
  );
}

test("an outside tap on a modal that does not dismiss outside closes nothing and presses nothing behind", async () => {
  booted = await bootScene(import.meta.path, () => <Scene />);
  const { c } = booted;
  const behind = textAt(c, "Behind");
  await await tap(c, behind.x + 2, behind.y + 2);
  expect(closes).toBe(0);
  expect(pressed).toEqual([]);
});

test("CROSS still closes a modal that does not dismiss outside", async () => {
  booted = await bootScene(import.meta.path, () => <Scene />);
  await press(booted.c, BTN.CROSS);
  expect(closes).toBe(1);
});

// ---- AlertDialog (vendored shadcn alert-dialog) -------------------------------------------------------

// The vendored shadcn alert-dialog is loaded by a computed path: its own Button asChild is outside the root
// types (the generated tree is kept out of the root typecheck), so the static import would pull it in.
const VENDORED = "./fixtures/shadcn-full/ui/alert-dialog.tsx";
const vendored = (await import(VENDORED)) as Record<string, any>;
const {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} = vendored;

let actions = 0;

// A light page: the scrim (slate-950 at 60%) must be visible against it.
function AlertScene() {
  return (
    <View className="w-full h-full flex-col gap-2 p-2 bg-slate-100">
      <AlertDialog>
        <AlertDialogTrigger>Delete</AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sure?</AlertDialogTitle>
            <AlertDialogDescription>This cannot be undone</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => actions++}>Continue</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </View>
  );
}

function labels(c: Core): string[] {
  return c.texts().map((r) => r.text);
}

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

describe("AlertDialog", () => {
  test("an alert dialog ignores an outside tap and closes on CROSS", async () => {
    actions = 0;
    booted = await bootScene(import.meta.path, () => <AlertScene />, undefined, ["test/" + VENDORED.slice(2)]);
    const { c } = booted;
    const page = (c.texts(), c.pixel(4, 4));
    expect(page).toBe("#f1f5f9");
    const trigger = textAt(c, "Delete");
    await tap(c, trigger.x + 2, trigger.y + 2);
    await frames(c, 2);
    expect(labels(c)).toContain("Sure?");
    // The scrim dims the page behind the panel.
    expect(c.pixel(4, 4)).not.toBe(page);
    await tap(c, 4, 4);
    expect(labels(c)).toContain("Sure?");
    await press(c, BTN.CROSS);
    expect(labels(c)).not.toContain("Sure?");
    expect(actions).toBe(0);
  });

  test("Cancel has focus on open; Continue runs its handler once and closes; Cancel closes without it", async () => {
    actions = 0;
    booted = await bootScene(import.meta.path, () => <AlertScene />, undefined, ["test/" + VENDORED.slice(2)]);
    const { c } = booted;
    const trigger = textAt(c, "Delete");
    await tap(c, trigger.x + 2, trigger.y + 2);
    await frames(c, 2);
    expect(focusedLabel()).toBe("Cancel");
    const cont = textAt(c, "Continue");
    await tap(c, cont.x + 2, cont.y + 2);
    expect(actions).toBe(1);
    expect(labels(c)).not.toContain("Sure?");
    const again = textAt(c, "Delete");
    await tap(c, again.x + 2, again.y + 2);
    await frames(c, 2);
    const cancel = textAt(c, "Cancel");
    await tap(c, cancel.x + 2, cancel.y + 2);
    expect(actions).toBe(1);
    expect(labels(c)).not.toContain("Sure?");
  });
});
