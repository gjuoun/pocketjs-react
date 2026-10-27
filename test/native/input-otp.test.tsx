import { afterEach, expect, test } from "bun:test";
import { BTN, focusNode, getFocused } from "@pocketjs/framework/input";
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

import { useState } from "react";
import { activeField, backspace, closeField, insertText } from "../../src/input/text-field.ts";
import { InputOTP, typeAt } from "../../src/native/input-otp.tsx";
import { walk } from "../../tools/qa/acceptance/geometry.ts";
import type { NodeMirror } from "../../src/internal/pocket.ts";

const CELL_BORDER = "#cbd5e1";
/** The OTP's cell nodes, in order (the InputOTP root's children). */
function cells(): NodeMirror[] {
  let root: NodeMirror | undefined;
  walk(rootMirror, (n) => { if (!root && n.debugName === "input-otp") root = n; });
  return root!.children;
}
/** The centre x of cell i: its placeholder run is centred in the 40 px cell. */
const centreOf = (i: number) => { const r = h.core.texts().filter((t) => t.text === "_")[i]; return r ? r.x + Math.floor(r.w / 2) : -1; };

function Controlled(props: { seen: string[]; done: string[]; length?: number }) {
  const [code, setCode] = useState("");
  return <View className={ROOT}><InputOTP length={props.length} value={code} onChange={(c) => { props.seen.push(c); setCode(c); }} onComplete={(c) => props.done.push(c)} /></View>;
}

test("typeAt sets the digit after the code and refuses a gap; backspace truncates from its cell", () => {
  expect(typeAt("", 0, "1", 6)).toBe("1");
  expect(typeAt("12", 2, "3", 6)).toBe("123");
  expect(typeAt("12", 3, "9", 6)).toBe("12");
  expect(typeAt("123456", 5, "", 6)).toBe("12345");
  expect(typeAt("123", 1, "", 6)).toBe("1");
});

test("six cells: each is 40 px wide with a 1 px slate-300 border, 8 px apart (48 px step)", async () => {
  await h.boot(() => <Controlled seen={[]} done={[]} />);
  const xs = [0, 1, 2, 3, 4, 5].map((i) => centreOf(i));
  expect(xs.every((x) => x > 0)).toBe(true);
  for (let i = 1; i < 6; i++) expect(xs[i] - xs[i - 1]).toBe(48);
  // The border columns of cell 0: the first and last slate-300 pixel across its centre row.
  const y = h.core.texts().find((t) => t.text === "_")!.y + 6;
  let lo = -1, hi = -1;
  for (let x = xs[0] - 24; x <= xs[0] + 24; x++) if (h.core.pixel(x, y) === CELL_BORDER) { if (lo < 0) lo = x; hi = x; }
  expect(hi - lo + 1).toBe(40);
});

test("CIRCLE opens the cell; a typed digit fills it, reports the code and moves the keyboard to the next cell", async () => {
  const seen: string[] = [];
  await h.boot(() => <Controlled seen={seen} done={[]} />);
  focusNode(cells()[0] as never);
  await press(BTN.CIRCLE);
  insertText(activeField()!, "4");
  await settle(h.core);
  expect(seen).toEqual(["4"]);
  expect(activeField()!.node).toBe(cells()[1] as never);
});

test("the caret is drawn inside the active cell", async () => {
  await h.boot(() => <Controlled seen={[]} done={[]} />);
  const centre0 = centreOf(0);
  focusNode(cells()[0] as never);
  await press(BTN.CIRCLE);
  await settle(h.core);
  const caret = h.core.texts().find((t) => t.text === "|");
  expect(caret).toBeDefined();
  expect(Math.abs(caret!.x - centre0)).toBeLessThanOrEqual(20);
});

test("LEFT moves focus to the previous cell; backspace on a filled cell clears it and steps back one", async () => {
  const seen: string[] = [];
  await h.boot(() => <Controlled seen={seen} done={[]} />);
  focusNode(cells()[0] as never);
  await press(BTN.CIRCLE);
  insertText(activeField()!, "4");
  insertText(activeField()!, "2");
  closeField(activeField()!);
  await settle(h.core);
  focusNode(cells()[2] as never);
  await press(BTN.LEFT);
  expect(getFocused()).toBe(cells()[1] as never);
  await press(BTN.CIRCLE);
  backspace(activeField()!);
  await settle(h.core);
  expect(seen.at(-1)).toBe("4");
  expect(activeField()!.node).toBe(cells()[0] as never);
});

test("the completed callback runs once, when the last cell fills", async () => {
  const done: string[] = [];
  await h.boot(() => <Controlled seen={[]} done={done} length={3} />);
  focusNode(cells()[0] as never);
  await press(BTN.CIRCLE);
  for (const d of ["1", "2", "3"]) { insertText(activeField()!, d); await settle(h.core); }
  expect(done).toEqual(["123"]);
});
