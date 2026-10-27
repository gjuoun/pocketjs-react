import { afterEach, expect, test } from "bun:test";
import { BTN } from "@pocketjs/framework/input";
import { mount, Text, View } from "../../src/index.ts";
import { bootCore, type Core } from "../harness.ts";
import { compileClasses } from "../../src/internal/pocket-build.ts";
import { installBuildStyles } from "../../src/style/build-styles.ts";
import { Focusable } from "../../src/native/focusable.tsx";
import { TOKENS } from "../../src/native/tokens.ts";

const ROOT = "w-full h-full flex-col bg-white";
const UTILITIES = [...Object.values(TOKENS).flatMap((l) => l.split(/\s+/)), ...ROOT.split(" ")].filter(Boolean);
const LOOK = [TOKENS["button.base"], TOKENS["button.size.md"], TOKENS["button.default.rest"], TOKENS["button.focus"]].join(" ");
const LABEL = [TOKENS["button.label.sm"], TOKENS["button.default.text"]].join(" ");
const FOCUS = "#2563eb";
// The left border column at mid-height: clear of the rounded corner (rounded-md clips (0,0)).
const EDGE = { x: 0, y: 18 };
let core: Core | undefined;
afterEach(() => { core?.dispose(); core = undefined; });
const STRICT = { compat: { classMiss: "throw" as const, tokenMap: false } };

async function boot(app: () => unknown) {
  core = await bootCore({ classes: UTILITIES });
  installBuildStyles({}, compileClasses([]).bin, UTILITIES);
  const unmount = mount(app() as never, STRICT);
  core.step(0); core.step(0); core.render();
  return unmount;
}
function edge(): string { core!.render(); return core!.pixel(EDGE.x, EDGE.y); }

test("a focused Focusable draws its focus border colour; unfocused it does not", async () => {
  const unmount = await boot(() => <View className={ROOT}><Focusable look={LOOK} onPress={() => {}}><Text className={LABEL}>Go</Text></Focusable></View>);
  const rest = edge();
  core!.press(BTN.DOWN);
  expect(edge()).toBe(FOCUS);
  expect(rest).not.toBe(FOCUS);
  unmount();
});

test("CIRCLE runs onPress once on a focused Focusable", async () => {
  let count = 0;
  const unmount = await boot(() => <View className={ROOT}><Focusable look={LOOK} onPress={() => { count++; }}><Text className={LABEL}>Go</Text></Focusable></View>);
  core!.press(BTN.DOWN);
  core!.press(BTN.CIRCLE);
  expect(count).toBe(1);
  unmount();
});

test("a disabled Focusable takes no focus and runs no press", async () => {
  let count = 0;
  const unmount = await boot(() => <View className={ROOT}><Focusable look={LOOK} disabled onPress={() => { count++; }}><Text className={LABEL}>Go</Text></Focusable></View>);
  const rest = edge();
  core!.press(BTN.DOWN);
  expect(edge()).toBe(rest);
  core!.press(BTN.CIRCLE);
  expect(count).toBe(0);
  unmount();
});
