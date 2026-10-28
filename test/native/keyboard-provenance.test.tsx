// Input mode: the last input decides the on-screen keyboard (OSK). A physical key on a focused field hides the OSK
// and types; a pointer press on the field shows it again; a press on an OSK key keeps it up. The Combobox search is the
// same Field, so it follows the same rule. Real wasm core through the native harness; asserts observable behaviour only.
import { afterEach, expect, test } from "bun:test";
import { useState } from "react";
import { View } from "../../src/index.ts";
import { activeField, resetTextFields } from "../../src/input/text-field.ts";
import { Combobox } from "../../src/native/combobox.tsx";
import type { CommandGroup } from "../../src/native/command.tsx";
import { Input } from "../../src/native/input.tsx";
import type { Core } from "../harness.ts";
import { harness, ROOT } from "./support.ts";

const h = harness();
afterEach(() => { resetTextFields(); h.dispose(); });

const GROUPS: CommandGroup[] = [
  { heading: "Frontend", items: [{ value: "react", label: "React" }, { value: "vue", label: "Vue" }, { value: "svelte", label: "Svelte" }] },
];

const tick = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0));
const textQueue = (): unknown[] => ((globalThis as { __pocketText?: unknown[] }).__pocketText ??= []);
const entryFlag = (): boolean | undefined => (globalThis as { __pocketTextEntry?: boolean }).__pocketTextEntry;
const drawn = (c: Core): string[] => c.texts().map((t) => t.text);
/** The OSK draws its special keys (DEL, ENT) only while it is up. */
const panelUp = (c: Core): boolean => drawn(c).includes("DEL");

/** One frame as the host runs it: the step, then the draw (a caret placement reads the drawn runs). */
function frame(c: Core): void {
  c.step(0);
  c.render();
}

/** A press and release at one point, read by the pointer pump on the frames after each is queued. */
function tap(c: Core, x: number, y: number): void {
  const q = ((globalThis as { __pocketPointer?: unknown[] }).__pocketPointer ??= []);
  q.push({ x, y, down: true });
  frame(c);
  frame(c);
  q.push({ x, y, down: false });
  frame(c);
  frame(c);
  frame(c);
}

/** One physical key as the host queues it: a task boundary between frames, as React flushes in a task. */
async function physical(c: Core, event: unknown): Promise<void> {
  textQueue().push(event);
  frame(c);
  await tick();
  frame(c);
  frame(c);
}

/** A point inside the drawn run of `label` (a placeholder or a trigger). */
function on(c: Core, label: string): { x: number; y: number } {
  const run = c.texts().find((t) => t.text === label);
  if (!run) throw new Error("no run drawn: " + label);
  return { x: run.x + 2, y: run.y + 2 };
}

function Field(props: { seen: string[] }) {
  const [v, setV] = useState("");
  return (
    <View className={ROOT}>
      <Input value={v} placeholder="Name" onChange={(n: string) => { props.seen.push(n); setV(n); }} />
    </View>
  );
}

function Pick(props: { picked: string[] }) {
  const [v, setV] = useState("");
  return (
    <View className={ROOT}>
      <Combobox groups={GROUPS} placeholder="Pick framework" value={v} onValueChange={(n) => { props.picked.push(n); setV(n); }} />
    </View>
  );
}

// The Input is the first child at the top left: its box is 0..40 px high, so (20, 20) is inside it.
const FIELD = { x: 20, y: 20 };

test("a pointer press on the field opens the on-screen keyboard and raises the entry flag", async () => {
  const c = await h.boot(() => <Field seen={[]} />);
  tap(c, FIELD.x, FIELD.y);
  expect(panelUp(c)).toBe(true);
  expect(entryFlag()).toBe(true);
});

test("the first physical key hides the on-screen keyboard and lands in the field", async () => {
  const seen: string[] = [];
  const c = await h.boot(() => <Field seen={seen} />);
  tap(c, FIELD.x, FIELD.y);
  expect(panelUp(c)).toBe(true);
  await physical(c, { t: "ch", s: "a" });
  expect(seen).toEqual(["a"]);
  expect(panelUp(c)).toBe(false);
  expect(activeField()?.open).toBe(true);
});

test("physical keys keep typing with the keyboard hidden, and a Left arrow hides it again", async () => {
  const seen: string[] = [];
  const c = await h.boot(() => <Field seen={seen} />);
  tap(c, FIELD.x, FIELD.y);
  await physical(c, { t: "ch", s: "a" });
  await physical(c, { t: "ch", s: "b" });
  expect(seen).toEqual(["a", "ab"]);
  expect(panelUp(c)).toBe(false);
  tap(c, FIELD.x, FIELD.y);
  expect(panelUp(c)).toBe(true);
  await physical(c, { t: "key", k: "Left" });
  expect(panelUp(c)).toBe(false);
});

test("a pointer press after physical typing brings the on-screen keyboard back", async () => {
  const seen: string[] = [];
  const c = await h.boot(() => <Field seen={seen} />);
  tap(c, FIELD.x, FIELD.y);
  await physical(c, { t: "ch", s: "a" });
  expect(panelUp(c)).toBe(false);
  tap(c, FIELD.x, FIELD.y);
  expect(panelUp(c)).toBe(true);
  expect(seen).toEqual(["a"]);
});

test("a press on a key of the on-screen keyboard types into the field and keeps the keyboard up", async () => {
  const seen: string[] = [];
  const c = await h.boot(() => <Field seen={seen} />);
  tap(c, FIELD.x, FIELD.y);
  const key = on(c, "s");
  tap(c, key.x - 1, key.y - 1);
  expect(seen).toEqual(["s"]);
  expect(panelUp(c)).toBe(true);
});

test("Combobox: a pointer press on its search field shows the on-screen keyboard", async () => {
  const picked: string[] = [];
  const c = await h.boot(() => <Pick picked={picked} />);
  tap(c, ...Object.values(on(c, "Pick framework")) as [number, number]);
  expect(drawn(c)).toContain("Vue");
  tap(c, ...Object.values(on(c, "Search")) as [number, number]);
  expect(panelUp(c)).toBe(true);
});

test("Combobox: a physical key hides the keyboard, and the list filters on the typed text", async () => {
  const picked: string[] = [];
  const c = await h.boot(() => <Pick picked={picked} />);
  tap(c, ...Object.values(on(c, "Pick framework")) as [number, number]);
  tap(c, ...Object.values(on(c, "Search")) as [number, number]);
  expect(panelUp(c)).toBe(true);
  await physical(c, { t: "ch", s: "u" });
  expect(panelUp(c)).toBe(false);
  expect(drawn(c)).toContain("Vue");
  expect(drawn(c)).not.toContain("React");
  expect(drawn(c)).not.toContain("Svelte");
  expect(picked).toEqual([]);
});

test("Combobox: a press on a key of the on-screen keyboard filters the list and keeps the panel open", async () => {
  const c = await h.boot(() => <Pick picked={[]} />);
  tap(c, ...Object.values(on(c, "Pick framework")) as [number, number]);
  tap(c, ...Object.values(on(c, "Search")) as [number, number]);
  const key = on(c, "u");
  tap(c, key.x - 1, key.y - 1);
  expect(drawn(c)).toContain("Vue");
  expect(drawn(c)).not.toContain("React");
  expect(panelUp(c)).toBe(true);
});
