import { afterEach, expect, test } from "bun:test";
import { BTN, focusNode, getFocused } from "@pocketjs/framework/input";
import { useState } from "react";
import { View } from "../../src/index.ts";
import { rootMirror, type NodeMirror } from "../../src/internal/pocket.ts";
import { Button } from "../../src/native/button.tsx";
import { clearToasts, toast, Toaster, toastState } from "../../src/native/toast.tsx";
import { Label } from "../../src/native/label.tsx";
import { topLayer } from "../../src/primitives/layer-stack.ts";
import { geometryFor, walk, type Rect } from "../../tools/qa/acceptance/geometry.ts";
import { triggerNode } from "../../tools/qa/acceptance/interaction.ts";
import { harness, ROOT } from "./support.ts";
import { SCREEN_H } from "../../src/internal/pocket.ts";

const h = harness();
afterEach(() => { clearToasts(); h.dispose(); });
const drawn = () => h.core.texts().map((t) => t.text);
/** A React state update made outside a frame is scheduled as a microtask: let it run before the frames step. */
const flush = () => new Promise<void>((resolve) => setTimeout(resolve, 0));
function frames(n = 1): void { for (let i = 0; i < n; i++) { h.core.step(0); h.core.render(); } }
function rectOfText(text: string): Rect {
  let host: NodeMirror | undefined;
  walk(rootMirror, (n) => { if (!host && (n as unknown as { text?: string }).text === text) host = n.parent ?? undefined; });
  if (!host) throw new Error("no text " + text);
  return geometryFor(h.core).rect(host)!;
}

function App(props: { limit?: number }) {
  const [n, setN] = useState(0);
  return (
    <View className={ROOT}>
      <Button onPress={() => { setN(n + 1); toast("Saved " + (n + 1)); }}>Notify</Button>
      <Label>{"Notified " + n}</Label>
      <Toaster limit={props.limit} />
    </View>
  );
}

test("a toast is drawn in the bottom half of the screen, in the overlay host", async () => {
  await h.boot(() => <App />);
  toast("Saved 1");
  await flush();
  frames(2);
  expect(drawn()).toContain("Saved 1");
  expect(rectOfText("Saved 1").y).toBeGreaterThan(SCREEN_H / 2);
});

test("the toaster is outside the page flow: a page label keeps its place when toasts appear", async () => {
  await h.boot(() => <App />);
  const before = rectOfText("Notified 0");
  toast("Saved 1");
  toast("Saved 2");
  await flush();
  frames(2);
  expect(rectOfText("Notified 0")).toEqual(before);
});

test("the stack limit holds: with limit 2, a third message waits until a slot frees", async () => {
  await h.boot(() => <App limit={2} />);
  toast("one", { frames: 100 });
  toast("two", { frames: 100 });
  toast("three", { frames: 100 });
  await flush();
  frames(2);
  expect(toastState()).toEqual({ shown: ["one", "two"], waiting: ["three"] });
  expect(drawn()).not.toContain("three");
});

test("a message is dismissed after exactly its frame count, and the next waiting message takes the slot", async () => {
  await h.boot(() => <App limit={1} />);
  toast("short", { frames: 10 });
  toast("next", { frames: 10 });
  await flush();
  frames(9);
  expect(drawn()).toContain("short");
  frames(1);
  expect(drawn()).not.toContain("short");
  expect(toastState().shown).toEqual(["next"]);
  frames(9);
  expect(drawn()).toContain("next");
  frames(1);
  expect(drawn()).not.toContain("next");
  expect(toastState()).toEqual({ shown: [], waiting: [] });
});

test("the toaster takes no focus: the trigger keeps focus while a toast is up", async () => {
  await h.boot(() => <App />);
  const notify = triggerNode(rootMirror, "Notify") as NodeMirror;
  focusNode(notify as never);
  h.core.press(BTN.CIRCLE);
  frames(2);
  expect(drawn()).toContain("Saved 1");
  expect(getFocused()).toBe(notify as never);
  expect(topLayer()).toBeUndefined();
});

test("a press on the page reaches the page while a toast is up: the Notify button still presses", async () => {
  await h.boot(() => <App />);
  focusNode(triggerNode(rootMirror, "Notify") as never);
  h.core.press(BTN.CIRCLE);
  frames(2);
  h.core.press(BTN.CIRCLE);
  frames(2);
  expect(drawn()).toContain("Notified 2");
  expect(drawn()).toContain("Saved 2");
});
