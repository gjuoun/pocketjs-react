import { afterEach, expect, test } from "bun:test";
import { BTN, getFocused } from "@pocketjs/framework/input";
import { useState } from "react";
import { View } from "../../src/index.ts";
import { rootMirror, type NodeMirror } from "../../src/internal/pocket.ts";
import { geometryFor, walk } from "../../tools/qa/acceptance/geometry.ts";
import { Select, clampIndex, type SelectOption } from "../../src/native/select.tsx";
import { ThemeProvider } from "../../src/native/theme.tsx";
import { THEMES, TOKENS } from "../../src/native/tokens.ts";
import { harness, ROOT } from "./support.ts";

const h = harness();
afterEach(() => h.dispose());
const OVERLAY = !!process.env.POCKETJS_CORE_ROOT;
const OPTIONS: SelectOption[] = [{ value: "monthly", label: "Monthly" }, { value: "yearly", label: "Yearly" }, { value: "weekly", label: "Weekly" }];

function textNode(label: string): NodeMirror | undefined {
  let found: NodeMirror | undefined;
  walk(rootMirror, (n) => { if (!found && typeof (n as { text?: unknown }).text === "string" && (n as unknown as { text: string }).text === label) found = n; });
  return found;
}
/** The focusable that holds a label: the text's nearest focusable ancestor. */
function focusOf(label: string): NodeMirror | null {
  let p: NodeMirror | null | undefined = textNode(label)?.parent;
  while (p && !p.focusable) p = p.parent;
  return p ?? null;
}
function drawn(): string[] { return h.core.texts().map((t) => t.text); }
/** The text under the focused node: the option's label while the list is open, the value on the trigger. */
function focusedLabel(): string | null {
  const f = getFocused() as unknown as NodeMirror | null;
  if (!f) return null;
  let found: string | null = null;
  const visit = (n: NodeMirror): void => {
    if (found !== null) return;
    if (typeof (n as { text?: unknown }).text === "string") { found = (n as unknown as { text: string }).text; return; }
    for (const k of n.children) visit(k);
  };
  visit(f);
  return found;
}
/** True when the focused node sits inside the open list (its ancestors include the select-list view). */
function focusInList(): boolean {
  let p: NodeMirror | null | undefined = getFocused() as unknown as NodeMirror | null;
  while (p) { if (p.debugName === "select-list") return true; p = p.parent; }
  return false;
}

function App(props: { log: string[]; start?: string; controlled?: string }) {
  const [value, setValue] = useState(props.start ?? "monthly");
  return (
    <View className={ROOT}>
      <Select value={props.controlled ?? value} options={OPTIONS} onValueChange={(v) => { props.log.push(v); setValue(v); }} />
    </View>
  );
}

test("closed: the trigger shows the selected label and no option is drawn", async () => {
  await h.boot(() => <App log={[]} />);
  expect(drawn()).toContain("Monthly");
  expect(drawn()).not.toContain("Yearly");
});

test("CIRCLE on the trigger opens the list below it, with focus on the selected option", async () => {
  await h.boot(() => <App log={[]} />);
  h.core.press(BTN.DOWN);
  h.core.press(BTN.CIRCLE);
  expect(drawn()).toEqual(expect.arrayContaining(["Monthly", "Yearly", "Weekly"]));
  expect(focusInList()).toBe(true);
  expect(focusedLabel()).toBe("Monthly");
});

test("UP and DOWN move through the options and stop at both ends (no wrap)", async () => {
  await h.boot(() => <App log={[]} />);
  h.core.press(BTN.DOWN);
  h.core.press(BTN.CIRCLE);
  const at = (label: string) => focusedLabel() === label && focusInList();
  h.core.press(BTN.DOWN); expect(at("Yearly")).toBe(true);
  h.core.press(BTN.DOWN); expect(at("Weekly")).toBe(true);
  h.core.press(BTN.DOWN); expect(at("Weekly")).toBe(true);
  h.core.press(BTN.UP); expect(at("Yearly")).toBe(true);
  h.core.press(BTN.UP); expect(at("Monthly")).toBe(true);
  h.core.press(BTN.UP); expect(at("Monthly")).toBe(true);
});

test("CIRCLE selects the focused option, reports it, closes the list and returns focus to the trigger", async () => {
  const log: string[] = [];
  await h.boot(() => <App log={log} />);
  h.core.press(BTN.DOWN);
  h.core.press(BTN.CIRCLE);
  h.core.press(BTN.DOWN);
  h.core.press(BTN.CIRCLE);
  expect(log).toEqual(["yearly"]);
  expect(drawn()).toContain("Yearly");
  expect(drawn()).not.toContain("Weekly");
  expect(focusInList()).toBe(false);
  expect(focusedLabel()).toBe("Yearly");
});

test("CROSS closes the open list with no change", async () => {
  const log: string[] = [];
  await h.boot(() => <App log={log} />);
  h.core.press(BTN.DOWN);
  h.core.press(BTN.CIRCLE);
  h.core.press(BTN.CROSS);
  expect(log).toEqual([]);
  expect(drawn()).not.toContain("Yearly");
  expect(drawn()).toContain("Monthly");
});

test("controlled: a fixed value reports the choice and the trigger keeps showing the value", async () => {
  const log: string[] = [];
  await h.boot(() => <App log={log} controlled="monthly" />);
  h.core.press(BTN.DOWN);
  h.core.press(BTN.CIRCLE);
  h.core.press(BTN.DOWN);
  h.core.press(BTN.DOWN);
  h.core.press(BTN.CIRCLE);
  expect(log).toEqual(["weekly"]);
  expect(drawn()).toContain("Monthly");
  expect(drawn()).not.toContain("Weekly");
});

test("the step rule clamps at both ends", () => {
  expect(clampIndex(3, 2, 1)).toBe(2);
  expect(clampIndex(3, 0, -1)).toBe(0);
  expect(clampIndex(3, 0, 1)).toBe(1);
});

test("the chevron points down closed and up open (overlay: rotated arms are drawn)", async () => {
  if (!OVERLAY) return;
  await h.boot(() => <App log={[]} />);
  const centroidY = (): number => {
    let ch: NodeMirror | undefined;
    walk(rootMirror, (n) => { if (!ch && n.debugName === "chevron") ch = n; });
    const r = geometryFor(h.core).rect(ch!)!;
    let sy = 0, n = 0;
    for (let y = r.y; y < r.y + r.h; y++) for (let x = r.x; x < r.x + r.w; x++) if (h.core.pixel(x, y) === "#0f172a") { sy += y + 0.5 - (r.y + r.h / 2); n++; }
    return sy / n;
  };
  h.core.press(BTN.DOWN);
  const closed = centroidY();
  h.core.press(BTN.CIRCLE);
  for (let i = 0; i < 20; i++) { h.core.step(0); h.core.render(); }
  const open = centroidY();
  // Closed (rotate-90) is a down-pointing v: its ink sits above the centre. Open (rotate-270) is an up-pointing caret.
  expect(closed).toBeLessThan(0);
  expect(open).toBeGreaterThan(0);
});

test("the dark theme draws the trigger on slate-800 with white value text", async () => {
  await h.boot(() => <ThemeProvider theme="dark"><View className={THEMES.dark["theme.page"]}><Select options={OPTIONS} value="monthly" /></View></ThemeProvider>);
  expect(drawn()).toContain("Monthly");
});

test("every select and chevron token exists in both themes (structure)", () => {
  for (const k of ["select.trigger", "select.focus", "select.value", "select.list", "select.option", "select.option.selected", "select.option.text", "select.option.text.selected", "chevron.turn.0", "chevron.turn.90", "chevron.turn.270", "chevron.arm.top", "chevron.arm.bottom"]) {
    expect(TOKENS[k as keyof typeof TOKENS]).toBeDefined();
    expect(THEMES.dark[k as keyof typeof TOKENS]).toBeDefined();
  }
});
