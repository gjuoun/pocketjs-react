import { afterEach, expect, test } from "bun:test";
import { BTN, focusNode, getFocused } from "@pocketjs/framework/input";
import { useState } from "react";
import { View } from "../../src/index.ts";
import { rootMirror, type NodeMirror } from "../../src/internal/pocket.ts";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "../../src/native/alert-dialog.tsx";
import { Button } from "../../src/native/button.tsx";
import { Dialog, DialogContent, DialogTitle } from "../../src/native/dialog.tsx";
import { geometryFor, walk, type Rect } from "../../tools/qa/acceptance/geometry.ts";
import { triggerNode } from "../../tools/qa/acceptance/interaction.ts";
import { harness, ROOT } from "./support.ts";

const h = harness();
afterEach(() => h.dispose());

function nodeNamed(name: string): NodeMirror | undefined {
  let found: NodeMirror | undefined;
  walk(rootMirror, (n) => { if (!found && n.debugName === name) found = n; });
  return found;
}
function rectOf(name: string): Rect {
  const n = nodeNamed(name);
  if (!n) throw new Error("no node " + name);
  const r = geometryFor(h.core).rect(n);
  if (!r) throw new Error("no rect for " + name);
  return r;
}
function drawn(): string[] { return h.core.texts().map((t) => t.text); }
function frames(n = 6): void { for (let i = 0; i < n; i++) { h.core.step(0); h.core.render(); } }
/** The pixels of a box, in reading order: an outside tap must not change one of them. */
function shot(r: Rect): string {
  const out: string[] = [];
  for (let y = r.y; y < r.y + r.h; y++) for (let x = r.x; x < r.x + r.w; x++) out.push(h.core.pixel(x, y));
  return out.join(",");
}
/** A tap at (x, y): press down, release, settle, as a mouse click does (the queue the pointer pump drains). */
function tap(x: number, y: number): void {
  const q = ((globalThis as { __pocketPointer?: unknown[] }).__pocketPointer ??= []);
  q.push({ x, y, down: true });
  h.core.step(0);
  q.push({ x, y, down: false });
  h.core.step(0);
  h.core.step(0);
}

function App(props: { behind: { n: number }; deleted: { n: number }; open?: boolean }) {
  return (
    <View className={ROOT}>
      <Button onPress={() => { props.behind.n++; }}>Behind</Button>
      <AlertDialog defaultOpen={props.open}>
        <AlertDialogTrigger>Delete file</AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogTitle>Delete this file?</AlertDialogTitle>
          <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction destructive onPress={() => { props.deleted.n++; }}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </View>
  );
}

test("the trigger opens the panel and draws its title and description", async () => {
  const counts = { behind: { n: 0 }, deleted: { n: 0 } };
  await h.boot(() => <App {...counts} />);
  expect(drawn()).not.toContain("Delete this file?");
  focusNode(triggerNode(rootMirror, "Delete file") as never);
  h.core.press(BTN.CIRCLE);
  frames();
  expect(drawn()).toContain("Delete this file?");
  expect(drawn()).toContain("This cannot be undone.");
  expect(drawn()).toContain("Cancel");
  expect(drawn()).toContain("Delete");
});

test("an outside tap is swallowed and closes nothing: the panel ink is unchanged and the button behind does not press", async () => {
  const counts = { behind: { n: 0 }, deleted: { n: 0 } };
  await h.boot(() => <App {...counts} />);
  focusNode(triggerNode(rootMirror, "Delete file") as never);
  h.core.press(BTN.CIRCLE);
  frames();
  const before = shot(rectOf("alert-dialog-panel"));
  tap(5, 5); // the Behind button, outside the panel and under the scrim
  frames();
  expect(drawn()).toContain("Delete this file?");
  expect(counts.behind.n).toBe(0);
  expect(shot(rectOf("alert-dialog-panel"))).toBe(before);
});

test("CROSS does nothing: the panel stays open", async () => {
  const counts = { behind: { n: 0 }, deleted: { n: 0 } };
  await h.boot(() => <App {...counts} />);
  focusNode(triggerNode(rootMirror, "Delete file") as never);
  h.core.press(BTN.CIRCLE);
  frames();
  h.core.press(BTN.CROSS);
  frames();
  expect(drawn()).toContain("Delete this file?");
});

test("Cancel closes it and gives focus back to the trigger", async () => {
  const counts = { behind: { n: 0 }, deleted: { n: 0 } };
  await h.boot(() => <App {...counts} />);
  const trigger = triggerNode(rootMirror, "Delete file") as NodeMirror;
  focusNode(trigger as never);
  h.core.press(BTN.CIRCLE);
  frames();
  focusNode(triggerNode(rootMirror, "Cancel") as never);
  h.core.press(BTN.CIRCLE);
  frames();
  expect(drawn()).not.toContain("Delete this file?");
  expect(getFocused()).toBe(trigger as never);
  expect(counts.deleted.n).toBe(0);
});

test("the destructive action reports and closes", async () => {
  const counts = { behind: { n: 0 }, deleted: { n: 0 } };
  await h.boot(() => <App {...counts} />);
  focusNode(triggerNode(rootMirror, "Delete file") as never);
  h.core.press(BTN.CIRCLE);
  frames();
  focusNode(triggerNode(rootMirror, "Delete") as never);
  h.core.press(BTN.CIRCLE);
  frames();
  expect(counts.deleted.n).toBe(1);
  expect(drawn()).not.toContain("Delete this file?");
});

test("mutant: a dialog that still dismisses outside closes on the same tap (the check above fails on it)", async () => {
  // The defect body: the Dialog shell (dismissOutside true) with the same content.
  function Loose() {
    return (
      <View className={ROOT}>
        <Button>Behind</Button>
        <Dialog defaultOpen>
          <DialogContent><DialogTitle>Delete this file?</DialogTitle></DialogContent>
        </Dialog>
      </View>
    );
  }
  await h.boot(() => <Loose />);
  frames();
  expect(drawn()).toContain("Delete this file?");
  tap(5, 5);
  frames();
  expect(drawn()).not.toContain("Delete this file?");
});

test("mutant: a Cancel that closes nothing leaves the panel open (the close check above fails on it)", async () => {
  // The defect body: the cancel slot is a plain Button, so the answer never closes the dialog.
  function Dead() {
    const [open, setOpen] = useState(true);
    return (
      <View className={ROOT}>
        <AlertDialog open={open} onOpenChange={setOpen}>
          <AlertDialogContent>
            <AlertDialogTitle>Delete this file?</AlertDialogTitle>
            <AlertDialogFooter><Button variant="outline">Cancel</Button></AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </View>
    );
  }
  await h.boot(() => <Dead />);
  frames();
  focusNode(triggerNode(rootMirror, "Cancel") as never);
  h.core.press(BTN.CIRCLE);
  frames();
  expect(drawn()).toContain("Delete this file?");
});
