import { afterEach, expect, test } from "bun:test";
import { BTN, focusNode } from "@pocketjs/framework/input";
import { rootMirror } from "../../src/internal/pocket.ts";
import { View } from "../../src/index.ts";
import { ThemeProvider } from "../../src/native/theme.tsx";
import { triggerNode } from "../../tools/qa/acceptance/interaction.ts";
import { harness, inkAgainst, ROOT, settle, tick } from "./support.ts";

const h = harness();
afterEach(() => h.dispose());
const runOf = (text: string) => h.core.texts().find((t) => t.text === text)!;
const control = (label: string) => triggerNode(rootMirror, label);
async function press(key: number) { h.core.press(key); await tick(); await settle(h.core); }
/** WCAG contrast ratio of two #rrggbb colours. */
function ratio(a: string, b: string): number {
  const lum = (hex: string) => {
    const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  };
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}
import { Button } from "../../src/native/button.tsx";
import { Empty } from "../../src/native/empty.tsx";

test("the icon well, title and description are drawn; the title is centred on the icon well", async () => {
  await h.boot(() => <View className={ROOT}><Empty icon={<View className="w-4 h-4 bg-slate-900" />} title="No projects">Create one to start.</Empty></View>);
  const title = runOf("No projects");
  expect(h.core.texts().map((t) => t.text)).toContain("Create one to start.");
  // The icon well is slate-100 (#f1f5f9): its painted span on its centre row gives its centre.
  const row = 40;
  let lo = -1, hi = -1;
  for (let x = 0; x < 480; x++) if (h.core.pixel(x, row) === "#f1f5f9") { if (lo < 0) lo = x; hi = x; }
  expect(lo).toBeGreaterThanOrEqual(0);
  const well = (lo + hi) / 2;
  expect(Math.abs(title.x + title.w / 2 - well)).toBeLessThanOrEqual(1);
});

test("the description is slate-500 on white: 4.76:1, above the text floor", async () => {
  await h.boot(() => <View className={ROOT}><Empty title="Nothing">Create one.</Empty></View>);
  expect(ratio(inkAgainst(h.core, runOf("Create one.")), "#ffffff")).toBeGreaterThanOrEqual(4.5);
});

test("the action slot holds a live control: CIRCLE on it reaches the caller", async () => {
  let made = 0;
  await h.boot(() => <View className={ROOT}><Empty title="Nothing" action={<Button onPress={() => made++}>Create project</Button>} /></View>);
  focusNode(control("Create project") as never);
  await press(BTN.CIRCLE);
  expect(made).toBe(1);
});

test("the dark theme draws the title in white on a slate-800 block", async () => {
  await h.boot(() => <ThemeProvider theme="dark"><View className={ROOT}><Empty title="Nothing" /></View></ThemeProvider>);
  expect(inkAgainst(h.core, runOf("Nothing"))).toBe("#ffffff");
});
