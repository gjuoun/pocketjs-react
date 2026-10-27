import { afterEach, expect, test } from "bun:test";
import { BTN } from "@pocketjs/framework/input";
import { View } from "../../src/index.ts";
import { Button } from "../../src/native/button.tsx";
import { TOKENS } from "../../src/native/tokens.ts";
import { harness, ROOT } from "./support.ts";

const h = harness();
afterEach(() => h.dispose());

const VARIANTS = ["default", "secondary", "destructive", "outline", "ghost"] as const;

test("every variant and size draws its label", async () => {
  const labels = VARIANTS.map((v) => v + "-label");
  await h.boot(() => <View className={ROOT}>{VARIANTS.map((v) => <Button key={v} variant={v}>{v + "-label"}</Button>)}</View>);
  const drawn = h.core.texts().map((t) => t.text);
  for (const l of labels) expect(drawn).toContain(l);
});

test("sizes sm, md and lg each draw their label", async () => {
  await h.boot(() => <View className={ROOT}><Button size="sm">small</Button><Button size="md">medium</Button><Button size="lg">large</Button></View>);
  const drawn = h.core.texts().map((t) => t.text);
  expect(drawn).toEqual(expect.arrayContaining(["small", "medium", "large"]));
});

test("a disabled Button runs no press on CIRCLE", async () => {
  let count = 0;
  await h.boot(() => <View className={ROOT}><Button disabled onPress={() => { count++; }}>Off</Button></View>);
  h.core.press(BTN.DOWN);
  h.core.press(BTN.CIRCLE);
  expect(count).toBe(0);
});

test("an enabled Button runs onPress once on CIRCLE", async () => {
  let count = 0;
  await h.boot(() => <View className={ROOT}><Button onPress={() => { count++; }}>On</Button></View>);
  h.core.press(BTN.DOWN);
  h.core.press(BTN.CIRCLE);
  expect(count).toBe(1);
});

test("every variant has a rest, text and press token (structure)", () => {
  for (const v of VARIANTS) {
    expect(TOKENS[("button." + v + ".rest") as keyof typeof TOKENS]).toBeDefined();
    expect(TOKENS[("button." + v + ".text") as keyof typeof TOKENS]).toBeDefined();
    expect(TOKENS[("button." + v + ".press") as keyof typeof TOKENS]).toBeDefined();
  }
});
