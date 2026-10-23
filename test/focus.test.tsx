// FocusScope + useButton against the real wasm core: focus is read from what the core drew
// (only the focused row paints its focus:bg-blue-600 variant).
import { afterEach, expect, test } from "bun:test";
import { BTN } from "@pocketjs/framework/input";
import { type ReactNode, useState } from "react";
import { FocusScope, mount, Text, useButton, View } from "../src/index.ts";
import { bootCore, type Core } from "./harness.ts";

const ROW = "px-2 py-1 bg-slate-800 focus:bg-blue-600";
const TXT = "text-sm text-white";
const PANEL = "flex-col gap-1 p-2 bg-slate-700";
const CLASSES = [
  ROW,
  TXT,
  PANEL,
  "w-full h-full flex-col gap-1 p-2 bg-slate-900",
  "w-[100px] h-[10px] bg-blue-600",
];
let core: Core | undefined;
afterEach(() => core?.dispose());

function Item(props: { label: string; onPress?: () => void }) {
  return (
    <View className={ROW} focusable onPress={props.onPress}>
      <Text className={TXT}>{props.label}</Text>
    </View>
  );
}

function Scope(props: {
  label: string;
  onClose: () => void;
  children: ReactNode;
}) {
  useButton(BTN.CROSS, props.onClose);
  return (
    <FocusScope className={PANEL}>
      <Text className={TXT}>{props.label}</Text>
      {props.children}
    </FocusScope>
  );
}

function App() {
  const [outer, setOuter] = useState(false);
  const [inner, setInner] = useState(false);
  return (
    <View className="w-full h-full flex-col gap-1 p-2 bg-slate-900">
      <View className="w-[100px] h-[10px] bg-blue-600" />
      <Item label="Alpha" />
      <Item label="Open" onPress={() => setOuter(true)} />
      {outer ? (
        <Scope label="Outer" onClose={() => setOuter(false)}>
          <Item label="Keep" />
          <Item label="More" onPress={() => setInner(true)} />
          {inner ? (
            <Scope label="Inner" onClose={() => setInner(false)}>
              <Item label="Deep" />
            </Scope>
          ) : null}
        </Scope>
      ) : null}
    </View>
  );
}

async function start(): Promise<Core> {
  core = await bootCore({ classes: CLASSES });
  mount(<App />);
  core.step(0);
  return core;
}

/** Labels whose row is currently drawn in the focus color (the blue reference bar at the top). */
function focusedLabels(c: Core): string[] {
  const runs = c.texts();
  const blue = c.pixel(12, 12);
  return runs
    .filter((r) => c.pixel(r.x - 4, r.y + 2) === blue)
    .map((r) => r.text);
}
const visible = (c: Core) => c.texts().map((r) => r.text);

test("opening a scope focuses its first focusable", async () => {
  const c = await start();
  c.press(BTN.DOWN);
  c.press(BTN.DOWN);
  expect(focusedLabels(c)).toEqual(["Open"]);
  c.press(BTN.CIRCLE);
  expect(focusedLabels(c)).toEqual(["Keep"]);
});

test("the d-pad cannot leave an open scope", async () => {
  const c = await start();
  c.press(BTN.DOWN);
  c.press(BTN.DOWN);
  c.press(BTN.CIRCLE);
  for (let i = 0; i < 4; i++) c.press(BTN.DOWN);
  expect(focusedLabels(c)).toEqual(["More"]);
  for (let i = 0; i < 4; i++) c.press(BTN.UP);
  expect(focusedLabels(c)).toEqual(["Keep"]);
});

test("CROSS closes the scope through useButton and restores focus to the opener", async () => {
  const c = await start();
  c.press(BTN.DOWN);
  c.press(BTN.DOWN);
  c.press(BTN.CIRCLE);
  c.press(BTN.CROSS);
  expect(visible(c)).not.toContain("Outer");
  expect(focusedLabels(c)).toEqual(["Open"]);
});

test("nested scopes restore focus in LIFO order", async () => {
  const c = await start();
  c.press(BTN.DOWN);
  c.press(BTN.DOWN);
  c.press(BTN.CIRCLE); // Outer, focus Keep
  c.press(BTN.DOWN); // More
  c.press(BTN.CIRCLE); // Inner, focus Deep
  expect(focusedLabels(c)).toEqual(["Deep"]);
  c.press(BTN.CROSS); // only the innermost handler runs
  expect(visible(c)).toContain("Outer");
  expect(visible(c)).not.toContain("Inner");
  expect(focusedLabels(c)).toEqual(["More"]);
  c.press(BTN.CROSS);
  expect(visible(c)).not.toContain("Outer");
  expect(focusedLabels(c)).toEqual(["Open"]);
});
