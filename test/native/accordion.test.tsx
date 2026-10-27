import { afterEach, expect, test } from "bun:test";
import { BTN, getFocused } from "@pocketjs/framework/input";
import { useState } from "react";
import { View } from "../../src/index.ts";
import { rootMirror, type NodeMirror } from "../../src/internal/pocket.ts";
import { geometryFor, walk, type Rect } from "../../tools/qa/acceptance/geometry.ts";
import { Accordion, AccordionItem, nextOpen } from "../../src/native/accordion.tsx";
import { ThemeProvider } from "../../src/native/theme.tsx";
import { THEMES, TOKENS } from "../../src/native/tokens.ts";
import { harness, ROOT } from "./support.ts";

const h = harness();
afterEach(() => h.dispose());
const OVERLAY = !!process.env.POCKETJS_CORE_ROOT;

function nodes(pred: (n: NodeMirror) => boolean): NodeMirror[] {
  const out: NodeMirror[] = [];
  walk(rootMirror, (n) => { if (pred(n)) out.push(n); });
  return out;
}
function rectOf(n: NodeMirror): Rect { const r = geometryFor(h.core).rect(n); if (!r) throw new Error("no rect"); return r; }
function drawn(): string[] { return h.core.texts().map((t) => t.text); }
function state(value: string): string | null {
  const n = nodes((x) => x.debugName === "accordion-item:" + value + ":open" || x.debugName === "accordion-item:" + value + ":closed");
  return n.length ? (n[0].debugName ?? "").split(":").pop()! : null;
}
function focusedLabel(): string | null {
  const f = getFocused() as unknown as NodeMirror | null;
  if (!f) return null;
  let found: string | null = null;
  const visit = (n: NodeMirror): void => { if (found !== null) return; if (typeof (n as { text?: unknown }).text === "string") { found = (n as unknown as { text: string }).text; return; } for (const k of n.children) visit(k); };
  visit(f);
  return found;
}

const TRIGGERS = ["Shipping", "Returns", "Warranty"];
function Single(props: { log: Array<string | string[]>; type?: "single" | "multiple"; controlled?: string | string[] }) {
  const [v, setV] = useState<string | string[]>(props.type === "multiple" ? [] : "");
  return (
    <View className={ROOT}>
      <Accordion type={props.type} value={props.controlled ?? v} onValueChange={(n) => { props.log.push(n); setV(n); }}>
        <AccordionItem value="shipping" title="Shipping">{["Ships in 2 days.", "Free over $50."]}</AccordionItem>
        <AccordionItem value="returns" title="Returns">{"30 days, unused items."}</AccordionItem>
        <AccordionItem value="warranty" title="Warranty">{"One year on parts."}</AccordionItem>
      </Accordion>
    </View>
  );
}

test("closed: every trigger is drawn, no panel is mounted, and each item's state is closed", async () => {
  await h.boot(() => <Single log={[]} />);
  for (const t of TRIGGERS) expect(drawn()).toContain(t);
  expect(drawn()).not.toContain("Ships in 2 days.");
  expect(state("shipping")).toBe("closed");
});

test("CIRCLE opens the item: its lines are drawn, its state is open, and the panel height is its lines plus padding and gap", async () => {
  const log: Array<string | string[]> = [];
  await h.boot(() => <Single log={log} type="multiple" />);
  h.core.press(BTN.DOWN);
  h.core.press(BTN.CIRCLE);
  expect(drawn()).toContain("Ships in 2 days.");
  expect(drawn()).toContain("Free over $50.");
  expect(state("shipping")).toBe("open");
  const panel = rectOf(nodes((n) => n.debugName === "accordion-panel")[0]);
  const runs = h.core.texts();
  const l1 = runs.find((r) => r.text === "Ships in 2 days.")!;
  const l2 = runs.find((r) => r.text === "Free over $50.")!;
  // flex-col gap-1 (4 px) between the lines, pb-3 (12 px) under the last one; the panel has no top padding.
  expect(panel.h).toBe(l1.h + 4 + l2.h + 12);
});

test("CIRCLE on an open item closes it again (toggle)", async () => {
  const log: Array<string | string[]> = [];
  await h.boot(() => <Single log={log} type="multiple" />);
  h.core.press(BTN.DOWN);
  h.core.press(BTN.CIRCLE);
  h.core.press(BTN.CIRCLE);
  expect(log).toEqual([["shipping"], []]);
  expect(drawn()).not.toContain("Ships in 2 days.");
});

test("single: opening one item closes the other; multiple: both stay open", async () => {
  const single: Array<string | string[]> = [];
  await h.boot(() => <Single log={single} />);
  h.core.press(BTN.DOWN);
  h.core.press(BTN.CIRCLE);
  h.core.press(BTN.DOWN);
  h.core.press(BTN.CIRCLE);
  expect(single).toEqual(["shipping", "returns"]);
  expect(state("shipping")).toBe("closed");
  expect(state("returns")).toBe("open");
  h.dispose();
  const multi: Array<string | string[]> = [];
  await h.boot(() => <Single log={multi} type="multiple" />);
  h.core.press(BTN.DOWN);
  h.core.press(BTN.CIRCLE);
  h.core.press(BTN.DOWN);
  h.core.press(BTN.CIRCLE);
  expect(multi).toEqual([["shipping"], ["shipping", "returns"]]);
  expect(state("shipping")).toBe("open");
  expect(state("returns")).toBe("open");
});

test("LEFT collapses an open item; on a closed item LEFT does not report a change", async () => {
  const log: Array<string | string[]> = [];
  await h.boot(() => <Single log={log} type="multiple" />);
  h.core.press(BTN.DOWN);
  h.core.press(BTN.CIRCLE);
  h.core.press(BTN.LEFT);
  expect(log).toEqual([["shipping"], []]);
  expect(state("shipping")).toBe("closed");
  // Focus is still on the closed Shipping trigger: LEFT is not its collapse, so nothing is reported.
  h.core.press(BTN.LEFT);
  expect(log).toEqual([["shipping"], []]);
});

test("CROSS collapses only the focused open item", async () => {
  const log: Array<string | string[]> = [];
  await h.boot(() => <Single log={log} type="multiple" />);
  h.core.press(BTN.DOWN);
  h.core.press(BTN.CIRCLE);
  h.core.press(BTN.DOWN);
  h.core.press(BTN.CIRCLE);
  h.core.press(BTN.CROSS);
  expect(log[log.length - 1]).toEqual(["shipping"]);
  expect(state("shipping")).toBe("open");
  expect(state("returns")).toBe("closed");
});

test("controlled: a fixed value reports the press and the item stays as the value says", async () => {
  const log: Array<string | string[]> = [];
  await h.boot(() => <Single log={log} controlled="" />);
  h.core.press(BTN.DOWN);
  h.core.press(BTN.CIRCLE);
  expect(log).toEqual(["shipping"]);
  expect(state("shipping")).toBe("closed");
});

test("the chevron points right closed and down open (overlay: the rotated arms are drawn)", async () => {
  if (!OVERLAY) return;
  await h.boot(() => <Single log={[]} type="multiple" />);
  const chev = () => rectOf(nodes((n) => n.debugName === "chevron")[0]);
  const centroid = () => {
    const r = chev();
    let sx = 0, sy = 0, n = 0;
    for (let y = r.y; y < r.y + r.h; y++) for (let x = r.x; x < r.x + r.w; x++) if (h.core.pixel(x, y) === "#0f172a") { sx += x + 0.5 - (r.x + r.w / 2); sy += y + 0.5 - (r.y + r.h / 2); n++; }
    return { x: sx / n, y: sy / n };
  };
  const closed = centroid();
  h.core.press(BTN.DOWN);
  h.core.press(BTN.CIRCLE);
  for (let i = 0; i < 20; i++) { h.core.step(0); h.core.render(); }
  const open = centroid();
  // Closed is a right-pointing > (ink centred left of the box); open is a down-pointing v (ink above the centre).
  expect(closed.x).toBeLessThan(0);
  expect(open.y).toBeLessThan(0);
});

test("the chevron turns through intermediate angles over the transition (overlay)", async () => {
  if (!OVERLAY) return;
  await h.boot(() => <Single log={[]} type="multiple" />);
  h.core.press(BTN.DOWN);
  const chev = nodes((n) => n.debugName === "chevron")[0];
  const r = rectOf(chev);
  const shape = (): string => { let s = ""; for (let y = r.y; y < r.y + r.h; y += 2) for (let x = r.x; x < r.x + r.w; x += 2) s += h.core.pixel(x, y) === "#0f172a" ? "1" : "0"; return s; };
  h.core.step(BTN.CIRCLE); h.core.render();
  const shapes = new Set<string>();
  for (let i = 0; i < 16; i++) { h.core.step(0); h.core.render(); shapes.add(shape()); }
  // Each frame of the turn draws a different shape: more than the two resting shapes are seen.
  expect(shapes.size).toBeGreaterThan(4);
});

test("the dark theme draws the trigger text in white", async () => {
  await h.boot(() => <ThemeProvider theme="dark"><View className={THEMES.dark["theme.page"]}><Accordion><AccordionItem value="a" title="Dark row">{"Dark body"}</AccordionItem></Accordion></View></ThemeProvider>);
  expect(drawn()).toContain("Dark row");
});

test("nextOpen: single replaces, multiple adds, and a press on an open item closes it", () => {
  expect(nextOpen("single", [], "a")).toEqual(["a"]);
  expect(nextOpen("single", ["a"], "b")).toEqual(["b"]);
  expect(nextOpen("multiple", ["a"], "b")).toEqual(["a", "b"]);
  expect(nextOpen("multiple", ["a", "b"], "a")).toEqual(["b"]);
});

test("every accordion and chevron token exists in both themes (structure)", () => {
  for (const k of ["accordion.root", "accordion.item", "accordion.trigger", "accordion.focus", "accordion.trigger.text", "accordion.content", "accordion.body", "chevron.turn.0", "chevron.turn.90"]) {
    expect(TOKENS[k as keyof typeof TOKENS]).toBeDefined();
    expect(THEMES.dark[k as keyof typeof TOKENS]).toBeDefined();
  }
});
