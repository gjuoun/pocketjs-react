import { afterEach, expect, test } from "bun:test";
import { BTN } from "@pocketjs/framework/input";
import { useState } from "react";
import { View } from "../../src/index.ts";
import { activeField, insertText, resetTextFields } from "../../src/input/text-field.ts";
import { Input, Textarea } from "../../src/native/input.tsx";
import { harness, ROOT } from "./support.ts";

const h = harness();
afterEach(() => { resetTextFields(); h.dispose(); });

// Left border column at mid-height of the 40 px field (the field starts at 0,0).
const EDGE = { x: 0, y: 20 };
const FOCUS = "#0f172a";

function Controlled(props: { seen: string[]; placeholder?: string; multiline?: boolean; start?: string; disabled?: boolean }) {
  const [v, setV] = useState(props.start ?? "");
  const onChange = (next: string) => { props.seen.push(next); setV(next); };
  return <View className={ROOT}>{props.multiline ? <Textarea value={v} placeholder={props.placeholder} onChange={onChange} disabled={props.disabled} /> : <Input value={v} placeholder={props.placeholder} onChange={onChange} disabled={props.disabled} />}</View>;
}

test("an empty Input draws its placeholder", async () => {
  await h.boot(() => <Controlled seen={[]} placeholder="Name" />);
  expect(h.core.texts().map((t) => t.text)).toContain("Name");
});

test("a focused Input draws the focus border; unfocused it does not", async () => {
  await h.boot(() => <Controlled seen={[]} placeholder="Name" />);
  h.core.render();
  const rest = h.core.pixel(EDGE.x, EDGE.y);
  h.core.press(BTN.DOWN);
  h.core.render();
  expect(h.core.pixel(EDGE.x, EDGE.y)).toBe(FOCUS);
  expect(rest).not.toBe(FOCUS);
});

test("CIRCLE opens the field; a typed character calls onChange and draws", async () => {
  const seen: string[] = [];
  await h.boot(() => <Controlled seen={seen} placeholder="Name" />);
  h.core.press(BTN.DOWN);
  h.core.press(BTN.CIRCLE);
  const field = activeField();
  expect(field).not.toBeNull();
  insertText(field!, "a");
  h.core.step(0); h.core.step(0); h.core.render();
  expect(seen).toEqual(["a"]);
  expect(h.core.texts().map((t) => t.text)).toContain("a");
});

test("a disabled Input takes no focus and opens no field", async () => {
  await h.boot(() => <Controlled seen={[]} placeholder="Name" disabled />);
  h.core.press(BTN.DOWN);
  h.core.press(BTN.CIRCLE);
  expect(activeField()).toBeNull();
});

test("a Textarea draws each line of its value as its own run", async () => {
  await h.boot(() => <Controlled seen={[]} multiline start={"first\nsecond"} />);
  const drawn = h.core.texts().map((t) => t.text);
  expect(drawn).toContain("first");
  expect(drawn).toContain("second");
});

test("an empty Textarea draws its placeholder", async () => {
  await h.boot(() => <Controlled seen={[]} multiline placeholder="Notes" />);
  expect(h.core.texts().map((t) => t.text)).toContain("Notes");
});
