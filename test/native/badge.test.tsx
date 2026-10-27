import { afterEach, expect, test } from "bun:test";
import { View } from "../../src/index.ts";
import { Badge, type BadgeVariant } from "../../src/native/badge.tsx";
import { ThemeProvider } from "../../src/native/theme.tsx";
import { TOKENS } from "../../src/native/tokens.ts";
import { harness, inkOf, ROOT } from "./support.ts";

const h = harness();
afterEach(() => h.dispose());
const runOf = (text: string) => h.core.texts().find((t) => t.text === text)!;
/** The badge's fill, read in its left padding (px-2 is 8 px; x - 2 is inside the box, outside the glyphs). */
const fillOf = (text: string) => { const r = runOf(text); return h.core.pixel(r.x - 2, r.y + Math.floor(r.h / 2)); };

const CASES: Array<[BadgeVariant, string, string, string]> = [
  ["default", "Stable", "#0f172a", "#ffffff"],
  ["secondary", "Beta", "#e2e8f0", "#0f172a"],
  ["destructive", "Failed", "#dc2626", "#ffffff"],
  ["outline", "Draft", "#ffffff", "#0f172a"],
];

for (const [variant, label, fill, ink] of CASES) {
  test(variant + " draws its fill and its text ink", async () => {
    await h.boot(() => <View className={ROOT}><Badge variant={variant}>{label}</Badge></View>);
    expect(fillOf(label)).toBe(fill);
    expect(inkOf(h.core, runOf(label))).toBe(ink);
  });
}

test("the dark theme swaps the default badge to white with slate-900 text", async () => {
  await h.boot(() => <ThemeProvider theme="dark"><View className={ROOT}><Badge>Stable</Badge></View></ThemeProvider>);
  expect(fillOf("Stable")).toBe("#ffffff");
  expect(inkOf(h.core, runOf("Stable"))).toBe("#0f172a");
});

test("every variant has a rest and a text token (structure)", () => {
  for (const v of ["default", "secondary", "destructive", "outline"]) {
    expect(TOKENS[("badge." + v + ".rest") as keyof typeof TOKENS]).toBeDefined();
    expect(TOKENS[("badge." + v + ".text") as keyof typeof TOKENS]).toBeDefined();
  }
});
