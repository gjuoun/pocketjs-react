import { afterEach, expect, test } from "bun:test";
import { BTN, getFocused } from "@pocketjs/framework/input";
import { useState } from "react";
import { View } from "../../src/index.ts";
import { rootMirror, type NodeMirror } from "../../src/internal/pocket.ts";
import { triggerNode } from "../../tools/qa/acceptance/interaction.ts";
import { Combobox, comboboxLabel } from "../../src/native/combobox.tsx";
import type { CommandGroup } from "../../src/native/command.tsx";
import { harness, ROOT } from "./support.ts";

const h = harness();
afterEach(() => h.dispose());

const GROUPS: CommandGroup[] = [
  { heading: "Frontend", items: [{ value: "react", label: "React" }, { value: "vue", label: "Vue" }, { value: "svelte", label: "Svelte" }] },
];

function frames(n: number) { for (let i = 0; i < n; i++) { h.core.step(0); h.core.render(); } }
function drawn(): string[] { return h.core.texts().map((t) => t.text); }
function focusedIs(label: string): boolean {
  const n = triggerNode(rootMirror, label);
  return !!n && getFocused() === (n as unknown as NodeMirror);
}

test("the label of a value is the item's label, or undefined when no item has it", () => {
  expect(comboboxLabel(GROUPS, "vue")).toBe("Vue");
  expect(comboboxLabel(GROUPS, "cobol")).toBeUndefined();
});

test("the trigger shows the placeholder until a value is chosen, and the value's label after", async () => {
  function App() {
    const [v, setV] = useState("");
    return <View className={ROOT}><Combobox groups={GROUPS} placeholder="Pick framework" value={v} onValueChange={setV} /></View>;
  }
  await h.boot(() => <App />);
  frames(3);
  expect(drawn()).toContain("Pick framework");
  expect(drawn()).not.toContain("Svelte");
});

test("a defaultValue shows its label on the trigger", async () => {
  await h.boot(() => <View className={ROOT}><Combobox groups={GROUPS} defaultValue="svelte" /></View>);
  frames(3);
  expect(drawn()).toContain("Svelte");
});

test("a press opens the panel; from the search input DOWN enters the list; CIRCLE chooses and closes it; focus returns to the trigger", async () => {
  const picked: string[] = [];
  function App() {
    const [v, setV] = useState("");
    return <View className={ROOT}><Combobox groups={GROUPS} placeholder="Pick framework" value={v} onValueChange={(n) => { picked.push(n); setV(n); }} /></View>;
  }
  await h.boot(() => <App />);
  frames(3);
  // Focus the trigger, then press it.
  h.core.press(BTN.DOWN);
  expect(focusedIs("Pick framework")).toBe(true);
  h.core.press(BTN.CIRCLE);
  frames(4);
  expect(drawn()).toContain("Vue");
  expect(drawn()).toContain("Svelte");
  // Focus is on the search input; DOWN enters the list at its first item, DOWN again moves to Vue.
  h.core.press(BTN.DOWN);
  h.core.press(BTN.DOWN);
  h.core.press(BTN.CIRCLE);
  frames(4);
  expect(picked).toEqual(["vue"]);
  expect(drawn()).not.toContain("Svelte");
  expect(drawn()).toContain("Vue");
  expect(focusedIs("Vue")).toBe(true);
});

test("CROSS closes the panel with no change", async () => {
  const picked: string[] = [];
  function App() {
    const [v, setV] = useState("");
    return <View className={ROOT}><Combobox groups={GROUPS} placeholder="Pick framework" value={v} onValueChange={(n) => { picked.push(n); setV(n); }} /></View>;
  }
  await h.boot(() => <App />);
  frames(3);
  h.core.press(BTN.DOWN);
  h.core.press(BTN.CIRCLE);
  frames(4);
  expect(drawn()).toContain("Svelte");
  h.core.press(BTN.CROSS);
  frames(4);
  expect(picked).toEqual([]);
  expect(drawn()).not.toContain("Svelte");
  expect(drawn()).toContain("Pick framework");
});
