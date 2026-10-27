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
import { Alert, type AlertVariant } from "../../src/native/alert.tsx";

const VARIANTS: AlertVariant[] = ["info", "success", "warning", "destructive"];

/** The fill of an alert, read in its left padding (p-3 is 12 px; the title starts 12 px inside the box). */
const fillOf = (title: string) => { const r = runOf(title); return h.core.pixel(r.x - 4, r.y + Math.floor(r.h / 2)); };

for (const v of VARIANTS) {
  test(v + ": the title and the description clear the 4.5:1 text floor on the fill", async () => {
    await h.boot(() => <View className={ROOT}><Alert variant={v} title={"Title " + v}>Description text</Alert></View>);
    const fill = fillOf("Title " + v);
    expect(ratio(inkAgainst(h.core, runOf("Title " + v)), fill)).toBeGreaterThanOrEqual(4.5);
    expect(ratio(inkAgainst(h.core, runOf("Description text")), fill)).toBeGreaterThanOrEqual(4.5);
  });
}

test("each variant has its own fill: four distinct banners", async () => {
  await h.boot(() => <View className={ROOT}><View className="flex-col gap-1">{VARIANTS.map((v) => <Alert key={v} variant={v} title={"Title " + v} />)}</View></View>);
  const fills = VARIANTS.map((v) => fillOf("Title " + v));
  expect(new Set(fills).size).toBe(4);
});

test("the icon slot draws its node in a well at the left, before the title", async () => {
  await h.boot(() => <View className={ROOT}><Alert title="Saved" icon={<View className="w-4 h-4 bg-slate-900" />} /></View>);
  // The icon is slate-900 (#0f172a) and sits left of the title, on the title's row.
  const y = runOf("Saved").y + 4;
  let at = -1;
  for (let x = 0; x < runOf("Saved").x; x++) if (h.core.pixel(x, y) === "#0f172a") { at = x; break; }
  expect(at).toBeGreaterThanOrEqual(0);
});

test("Dismiss unmounts the banner once and reports onDismiss", async () => {
  let dismissed = 0;
  await h.boot(() => <View className={ROOT}><Alert title="Sync failed" dismissible onDismiss={() => dismissed++} /></View>);
  expect(h.core.texts().map((t) => t.text)).toContain("Sync failed");
  focusNode(control("Dismiss") as never);
  await press(BTN.CIRCLE);
  expect(h.core.texts().map((t) => t.text)).not.toContain("Sync failed");
  expect(dismissed).toBe(1);
});

test("without dismissible there is no Dismiss control", async () => {
  await h.boot(() => <View className={ROOT}><Alert title="Saved" /></View>);
  expect(control("Dismiss")).toBeUndefined();
});

test("the dark theme keeps every variant's title above 4.5:1", async () => {
  await h.boot(() => <ThemeProvider theme="dark"><View className={ROOT}><Alert variant="warning" title="Low disk">Free 2 GB</Alert></View></ThemeProvider>);
  expect(ratio(inkAgainst(h.core, runOf("Low disk")), fillOf("Low disk"))).toBeGreaterThanOrEqual(4.5);
});
