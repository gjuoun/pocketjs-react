import { afterEach, expect, test } from "bun:test";
import { BTN, focusNode } from "@pocketjs/framework/input";
import { rootMirror } from "../../src/internal/pocket.ts";
import { View } from "../../src/index.ts";
import { Breadcrumb, collapse } from "../../src/native/breadcrumb.tsx";
import { ThemeProvider } from "../../src/native/theme.tsx";
import { triggerNode } from "../../tools/qa/acceptance/interaction.ts";
import { walk } from "../../tools/qa/acceptance/geometry.ts";
import { harness, inkAgainst, ROOT, settle, tick } from "./support.ts";

const h = harness();
afterEach(() => h.dispose());
const runOf = (text: string) => h.core.texts().find((t) => t.text === text)!;
/** The mirror node with a debug name (the non-focusable parts carry one). */
function nodeNamed(name: string) { let f: { focusable: boolean } | undefined; walk(rootMirror, (n) => { if (!f && n.debugName === name) f = n as never; }); return f; }
/** The control (focusable node) a label belongs to; its focusable flag says whether it can take focus. */
const control = (label: string) => triggerNode(rootMirror, label);
const TRAIL = ["Home", "Docs", "Guides", "Setup", "Billing", "Invoices"];

async function press(key: number) { h.core.press(key); await tick(); await settle(h.core); }

test("collapse keeps every item when the trail fits, else the first, an ellipsis and the last maxItems - 2", () => {
  expect(collapse(3, 4, false)).toEqual([0, 1, 2]);
  expect(collapse(6, 4, false)).toEqual([0, -1, 4, 5]);
  expect(collapse(6, 4, true)).toEqual([0, 1, 2, 3, 4, 5]);
});

test("a short trail draws every item and one separator between each pair", async () => {
  await h.boot(() => <View className={ROOT}><Breadcrumb items={TRAIL.slice(0, 3)} /></View>);
  const drawn = h.core.texts().map((t) => t.text);
  for (const t of TRAIL.slice(0, 3)) expect(drawn).toContain(t);
  expect(drawn.filter((t) => t === "/")).toHaveLength(2);
});

test("a long trail collapses its middle to an ellipsis; the first and the last two items stay", async () => {
  await h.boot(() => <View className={ROOT}><Breadcrumb items={TRAIL} /></View>);
  const drawn = h.core.texts().map((t) => t.text);
  expect(drawn).toContain("…");
  expect(drawn).toContain("Home");
  expect(drawn).toContain("Billing");
  expect(drawn).toContain("Invoices");
  expect(drawn).not.toContain("Docs");
  expect(drawn).not.toContain("Guides");
});

test("the ellipsis expands the full trail: every item is reachable after it", async () => {
  const picked: number[] = [];
  await h.boot(() => <View className={ROOT}><Breadcrumb items={TRAIL} onSelect={(i) => picked.push(i)} /></View>);
  focusNode(control("…") as never);
  await press(BTN.CIRCLE);
  expect(h.core.texts().map((t) => t.text)).toContain("Guides");
  focusNode(control("Guides") as never);
  await press(BTN.CIRCLE);
  expect(picked).toEqual([2]);
});

test("the current item is the last one, drawn in ink, not a control; CIRCLE on it reports nothing", async () => {
  const picked: number[] = [];
  await h.boot(() => <View className={ROOT}><Breadcrumb items={["Home", "Docs", "Guides"]} onSelect={(i) => picked.push(i)} /></View>);
  expect(nodeNamed("breadcrumb-page")?.focusable).toBeFalsy();
  expect(control("Docs")?.focusable).toBeTruthy();
  expect(inkAgainst(h.core, runOf("Guides"))).toBe("#0f172a");
  focusNode(control("Docs") as never);
  await press(BTN.CIRCLE);
  expect(picked).toEqual([1]);
});

test("link ink is slate-500 on white (4.76:1, above the 4.5:1 text floor)", async () => {
  await h.boot(() => <View className={ROOT}><Breadcrumb items={["Home", "Docs"]} /></View>);
  expect(inkAgainst(h.core, runOf("Home"))).toBe("#64748b");
});

test("the dark theme draws the current item in white", async () => {
  await h.boot(() => <ThemeProvider theme="dark"><View className={ROOT}><Breadcrumb items={["Home", "Docs"]} /></View></ThemeProvider>);
  expect(inkAgainst(h.core, runOf("Docs"))).toBe("#ffffff");
});
