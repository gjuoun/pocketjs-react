import { afterEach, expect, test } from "bun:test";
import { View } from "../../src/index.ts";
import { Separator } from "../../src/native/separator.tsx";
import { ThemeProvider } from "../../src/native/theme.tsx";
import { harness, ROOT } from "./support.ts";

const h = harness();
afterEach(() => h.dispose());
const RULE = "#e2e8f0";
const runOf = (text: string) => h.core.texts().find((t) => t.text === text)!;

test("a horizontal separator draws a single 1 px rule between its neighbours", async () => {
  await h.boot(() => (
    <View className={ROOT}>
      <Separator />
    </View>
  ));
  // The rule is the only row in column 240 that carries the rule colour.
  let rows = 0;
  for (let y = 0; y < 272; y++) if (h.core.pixel(240, y) === RULE) rows++;
  expect(rows).toBe(1);
});

test("a vertical separator draws a single 1 px column in a row of height 32", async () => {
  await h.boot(() => (
    <View className={ROOT}>
      <View className="flex-row items-center h-8"><View className="w-4 h-4 bg-slate-900" /><Separator orientation="vertical" /><View className="w-4 h-4 bg-slate-900" /></View>
    </View>
  ));
  let cols = 0;
  for (let x = 0; x < 480; x++) if (h.core.pixel(x, 2) === RULE) cols++;
  expect(cols).toBe(1);
});

test("the dark theme draws the rule in slate-700", async () => {
  await h.boot(() => <ThemeProvider theme="dark"><View className={ROOT}><Separator /></View></ThemeProvider>);
  let rows = 0;
  for (let y = 0; y < 272; y++) if (h.core.pixel(240, y) === "#334155") rows++;
  expect(rows).toBe(1);
});
