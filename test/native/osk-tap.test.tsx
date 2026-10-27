// The on-screen keyboard: a tap on a key (touch or mouse, the same pointer queue) inserts its character into the open field.
// Keys are focusable views; a non-focusable key is invisible to the tap hit test, so its press is dropped.
import { afterEach, expect, test } from "bun:test";
import { useState } from "react";
import { View } from "../../src/index.ts";
import { activeField, resetTextFields } from "../../src/input/text-field.ts";
import { Input } from "../../src/native/input.tsx";
import { harness, ROOT } from "./support.ts";

const h = harness();
afterEach(() => { resetTextFields(); h.dispose(); });

function Controlled(props: { seen: string[] }) {
  const [v, setV] = useState("");
  return (
    <View className={ROOT}>
      <Input value={v} placeholder="Name" onChange={(n: string) => { props.seen.push(n); setV(n); }} />
    </View>
  );
}

/** A press and release at one point, read by the pointer pump on the frames after each is queued. */
function tap(c: { step(b: number): void }, x: number, y: number) {
  const q = ((globalThis as { __pocketPointer?: unknown[] }).__pocketPointer ??= []);
  q.push({ x, y, down: true });
  c.step(0);
  c.step(0);
  q.push({ x, y, down: false });
  c.step(0);
  c.step(0);
  c.step(0);
}

test("a tap on the field opens the keyboard; taps on its keys type into the field", async () => {
  const seen: string[] = [];
  const c = await h.boot(() => <Controlled seen={seen} />);
  const name = c.texts().find((t) => t.text === "Name")!;
  tap(c, name.x + 2, name.y + 2);
  expect(activeField()).not.toBeNull();
  for (const label of ["a", "s"]) {
    const key = c.texts().find((t) => t.text === label)!;
    tap(c, key.x + 1, key.y + 1);
  }
  expect(seen).toEqual(["a", "as"]);
  expect(activeField()?.open).toBe(true);
});
