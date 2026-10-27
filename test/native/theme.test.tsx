import { afterEach, expect, test } from "bun:test";
import { BTN } from "@pocketjs/framework/input";
import { useState, type ReactNode } from "react";
import { View } from "../../src/index.ts";
import { Button } from "../../src/native/button.tsx";
import { Card, CardTitle } from "../../src/native/card.tsx";
import { ThemeProvider, useTheme, useTokens } from "../../src/native/theme.tsx";
import { THEMES, type TokenTable } from "../../src/native/tokens.ts";
import { harness, ROOT } from "./support.ts";

const h = harness();
afterEach(() => h.dispose());

/** The most common colour in a run's box that is not the box's own fill: the ink of the glyphs. */
function ink(run: { x: number; y: number; w: number; h: number }): string {
  const m = new Map<string, number>();
  for (let y = run.y; y < run.y + run.h; y++) for (let x = run.x; x < run.x + run.w; x++) m.set(h.core.pixel(x, y), (m.get(h.core.pixel(x, y)) ?? 0) + 1);
  const sorted = [...m.entries()].sort((a, b) => b[1] - a[1]);
  return sorted[1]?.[0] ?? sorted[0][0];
}
const titleInk = () => ink(h.core.texts().find((t) => t.text === "Account")!);

function Probe(props: { into: { table?: TokenTable } }) {
  props.into.table = useTokens();
  return null;
}

function Switch(props: { label: string }) {
  const { theme, setTheme } = useTheme();
  return <Button onPress={() => setTheme(theme === "light" ? "dark" : "light")}>{props.label}</Button>;
}

const card = (): ReactNode => <Card><CardTitle>Account</CardTitle></Card>;

test("outside a ThemeProvider the light table is in force", async () => {
  const into: { table?: TokenTable } = {};
  await h.boot(() => <View className={ROOT}><Probe into={into} /></View>);
  expect(into.table).toBe(THEMES.light);
});

test("a ThemeProvider carries its table: dark draws the card title in white", async () => {
  await h.boot(() => <ThemeProvider theme="dark"><View className={ROOT}>{card()}</View></ThemeProvider>);
  expect(titleInk()).toBe("#ffffff");
});

test("the light table draws the card title in slate-900", async () => {
  await h.boot(() => <View className={ROOT}>{card()}</View>);
  expect(titleInk()).toBe("#0f172a");
});

test("a theme switch is a state change: the same mount redraws from light to dark on CIRCLE", async () => {
  function App() {
    const [theme, setTheme] = useState<"light" | "dark">("light");
    return (
      <ThemeProvider theme={theme} onThemeChange={setTheme}>
        <View className={ROOT}>
          <Switch label="Switch" />
          {card()}
        </View>
      </ThemeProvider>
    );
  }
  await h.boot(() => <App />);
  const before = titleInk();
  h.core.press(BTN.DOWN);
  h.core.press(BTN.CIRCLE);
  expect(before).toBe("#0f172a");
  expect(titleInk()).toBe("#ffffff");
});
