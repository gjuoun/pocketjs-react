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

/** The painted extent down one column (the first and last non-page pixel), in device pixels. */
function paintedAt(x: number, y0: number, y1: number): number {
  let top = -1, bot = -1;
  for (let y = y0; y < y1; y++) if (h.core.pixel(x, y) !== "#ffffff") { if (top < 0) top = y; bot = y; }
  return top < 0 ? 0 : bot - top + 1;
}

test("the four variants paint the same height: 20 px at the centre column, 18 px on the rounded edge", async () => {
  await h.boot(() => (
    <View className={ROOT}>
      <View className="p-2 flex-row gap-2">
        <Badge>Stable</Badge>
        <Badge variant="secondary">Beta</Badge>
        <Badge variant="destructive">Failed</Badge>
        <Badge variant="outline">Draft</Badge>
      </View>
    </View>
  ));
  const centre: number[] = [];
  const edge: number[] = [];
  for (const label of ["Stable", "Beta", "Failed", "Draft"]) {
    const r = runOf(label);
    const left = r.x - 8; // px-2: the box starts 8 px left of the text
    centre.push(paintedAt(r.x + Math.floor(r.w / 2), r.y - 8, r.y + r.h + 8));
    edge.push(paintedAt(left + 1, r.y - 8, r.y + r.h + 8));
  }
  expect(centre).toEqual([20, 20, 20, 20]);
  expect(edge).toEqual([18, 18, 18, 18]);
});

test("every variant has one border width, one height and one padding; only the colours differ", () => {
  const rests = ["default", "secondary", "destructive", "outline"].map((v) => TOKENS[("badge." + v + ".rest") as keyof typeof TOKENS]);
  for (const r of rests) {
    expect(r).toMatch(/border-(?!transparent)/);
    expect(r).not.toMatch(/\bh-|\bpx-|\bborder-\d|\bborder-\[/);
  }
  expect(TOKENS["badge.base"]).toContain("h-5 px-2");
  expect(TOKENS["badge.base"]).toContain("border");
});

test("every variant has a rest and a text token (structure)", () => {
  for (const v of ["default", "secondary", "destructive", "outline"]) {
    expect(TOKENS[("badge." + v + ".rest") as keyof typeof TOKENS]).toBeDefined();
    expect(TOKENS[("badge." + v + ".text") as keyof typeof TOKENS]).toBeDefined();
  }
});
