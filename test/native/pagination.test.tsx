import { afterEach, expect, test } from "bun:test";
import { BTN, focusNode, getFocused } from "@pocketjs/framework/input";
import { rootMirror } from "../../src/internal/pocket.ts";
import { View } from "../../src/index.ts";
import { Pagination, pageWindow } from "../../src/native/pagination.tsx";
import { triggerNode } from "../../tools/qa/acceptance/interaction.ts";
import { walk } from "../../tools/qa/acceptance/geometry.ts";
import { harness, inkAgainst, ROOT, settle, tick } from "./support.ts";
import { useState } from "react";

const h = harness();
afterEach(() => h.dispose());
const runOf = (text: string) => h.core.texts().find((t) => t.text === text)!;
const control = (label: string) => triggerNode(rootMirror, label);
/** A mirror node by its debug name: the non-focusable parts (the current page, a disabled end) carry one. */
function nodeNamed(name: string): { focusable: boolean } | undefined { let f: { focusable: boolean } | undefined; walk(rootMirror, (n) => { if (!f && n.debugName === name) f = n as never; }); return f; }
async function press(key: number) { h.core.press(key); await tick(); await settle(h.core); }

test("pageWindow lists every page up to seven, else a window with ... where pages are skipped", () => {
  expect(pageWindow(1, 5)).toEqual([1, 2, 3, 4, 5]);
  expect(pageWindow(1, 10)).toEqual([1, 2, "...", 10]);
  expect(pageWindow(4, 10)).toEqual([1, "...", 3, 4, 5, "...", 10]);
  expect(pageWindow(5, 10)).toEqual([1, "...", 4, 5, 6, "...", 10]);
  expect(pageWindow(9, 10)).toEqual([1, "...", 8, 9, 10]);
});

function Controlled(props: { start: number; count: number; seen: number[] }) {
  const [page, setPage] = useState(props.start);
  return <View className={ROOT}><Pagination page={page} pageCount={props.count} onPageChange={(p) => { props.seen.push(p); setPage(p); }} /></View>;
}

test("the current page is drawn bold in slate-900; the others are controls", async () => {
  await h.boot(() => <Controlled start={3} count={10} seen={[]} />);
  expect(inkAgainst(h.core, runOf("3"))).toBe("#0f172a");
  expect(nodeNamed("pagination-current")?.focusable).toBeFalsy();
  expect(control("4")?.focusable).toBeTruthy();
});

test("the ends are disabled: Prev is not a control on page 1, Next is not one on the last page", async () => {
  await h.boot(() => <Controlled start={1} count={3} seen={[]} />);
  expect(nodeNamed("pagination-prev-disabled")?.focusable).toBeFalsy();
  expect(control("Next")?.focusable).toBeTruthy();
});

test("CIRCLE on Next reports the next page; the controlled page follows the state", async () => {
  const seen: number[] = [];
  await h.boot(() => <Controlled start={3} count={10} seen={seen} />);
  focusNode(control("Next") as never);
  await press(BTN.CIRCLE);
  expect(seen).toEqual([4]);
  expect(inkAgainst(h.core, runOf("4"))).toBe("#0f172a");
});

test("RIGHT moves focus along the row to the next page button", async () => {
  await h.boot(() => <Controlled start={3} count={10} seen={[]} />);
  focusNode(control("2") as never);
  await press(BTN.RIGHT);
  expect(getFocused()).toBe(control("4") as never);
});

test("the ellipsis is drawn and is not a control", async () => {
  await h.boot(() => <Controlled start={5} count={10} seen={[]} />);
  expect(h.core.texts().map((t) => t.text)).toContain("...");
  expect(control("...")?.focusable ?? false).toBe(false);
});

test("the page text clears 4.5:1 on white", async () => {
  await h.boot(() => <Controlled start={3} count={10} seen={[]} />);
  expect(inkAgainst(h.core, runOf("4"))).toBe("#334155");
});
