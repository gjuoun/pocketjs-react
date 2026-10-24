// C4b in a real browser: the reader host page (tools/web/reader.html, via text-entry-host.js) sends
// physical keys to a focused field (direct typing, no keyboard panel), and the on-screen keyboard is
// driven by the pad alone. Manual clock: every frame is an explicit window.__host.step().
import { afterAll, beforeAll, expect, test } from "bun:test";
import { rmSync } from "node:fs";
import { BTN } from "@pocketjs/framework/input";
import { homePos, layoutRows, navigate, type OskPos, oskLayer } from "../src/input/osk-layout.ts";
import { HeadlessChrome } from "../src/internal/pocket-build.ts";
import { build } from "../tools/build.ts";
import { type ReaderServer, serveReader } from "../tools/web/serve.ts";

const FIXTURE = process.cwd() + "/test/fixtures/text-entry/main.tsx";
const OUT = "/tmp/pocketjs-react-test/text-entry";
const PROFILE = "/tmp/pocketjs-react-test/text-entry-chrome";
const PHRASE = "quick brown fox";
const KEYCAPS = ["DEL", "ENT", "OK", "HIDE", "1#", "ABC"];
const PREFIXES = Array.from({ length: PHRASE.length }, (_, i) => PHRASE.slice(0, i + 1));

let server: ReaderServer;
let chrome: Awaited<ReturnType<typeof HeadlessChrome.start>>;

beforeAll(async () => {
  server = serveReader(await build(FIXTURE, { outdir: OUT, name: "text-entry" }));
  rmSync(PROFILE, { recursive: true, force: true });
  chrome = await HeadlessChrome.start({ port: 9423, profile: PROFILE, timeoutMs: 20000 });
  await chrome.navigate(server.url + "?manual=1");
  for (let i = 0; i < 100 && !(await chrome.evaluate("!!window.__ready")); i++) await Bun.sleep(100);
});
afterAll(() => {
  chrome?.stop();
  server?.stop();
});

const evaluate = (js: string) => chrome.evaluate(js);
// One guest frame with an explicit pad state (0 = released).
const frame = (buttons = 0) => evaluate("window.__host.step(" + buttons + ")");
// A pad press: 3 frames held, 3 released, in one task.
const press = (bit: number) =>
  evaluate("(() => { for (let i = 0; i < 3; i++) window.__host.step(" + bit + "); for (let i = 0; i < 3; i++) window.__host.step(0); })()");
// One physical key on the window: the reader routes it (text or pad), then one frame runs.
const typeKey = (key: string, code: string) =>
  evaluate(
    "(() => { window.dispatchEvent(new KeyboardEvent('keydown', { key: " + JSON.stringify(key) + ", code: " + JSON.stringify(code) + " })); window.__host.step(0); })()",
  );
const codeOf = (ch: string) => (ch === " " ? "Space" : "Key" + ch.toUpperCase());
const texts = async (): Promise<string[]> =>
  String(await evaluate("window.__host.texts()"))
    .split("\n")
    .filter(Boolean)
    .map((line) => line.split("\t")[1]);
const keycapsDrawn = async () => (await texts()).filter((t) => KEYCAPS.includes(t));
const logOf = async (name: string): Promise<string[]> =>
  JSON.parse(String(await evaluate("JSON.stringify(globalThis[" + JSON.stringify(name) + "] ?? [])")));
const flag = async (): Promise<boolean> => (await evaluate("globalThis.__pocketTextEntry === true")) as boolean;
const shoulder = async (): Promise<number> => Number(await evaluate("globalThis.__shoulder ?? 0"));

// The panel layout as it draws: lower layer, 472 px of row width, 4 px gaps.
const rows = layoutRows(oskLayer("lower"), 480 - 2 * 4, 4);
const keyAt = (ch: string): OskPos => {
  for (const row of rows) for (const k of row) if (k.key.ch === ch) return { row: k.row, col: k.col };
  throw new Error("no key " + ch);
};
type Dir = "up" | "down" | "left" | "right";
const BIT: Record<Dir, number> = { up: BTN.UP, down: BTN.DOWN, left: BTN.LEFT, right: BTN.RIGHT };
const key = (p: OskPos) => p.row + ":" + p.col;
// Shortest d-pad path (directions) from `from` to `goal` over navigate().
function path(from: OskPos, goal: OskPos): Dir[] {
  const prev = new Map<string, { p: OskPos; d: Dir }>();
  let frontier = [from];
  const seen = new Set([key(from)]);
  while (frontier.length && !seen.has(key(goal))) {
    const next: OskPos[] = [];
    for (const p of frontier) for (const d of ["up", "down", "left", "right"] as Dir[]) {
      const q = navigate(rows, p, d);
      if (seen.has(key(q))) continue;
      seen.add(key(q));
      prev.set(key(q), { p, d });
      next.push(q);
    }
    frontier = next;
  }
  const dirs: Dir[] = [];
  for (let at = goal; key(at) !== key(from); ) {
    const step = prev.get(key(at))!;
    dirs.unshift(step.d);
    at = step.p;
  }
  return dirs;
}

test("physical keys type into field A; no keyboard panel; L shoulder stays silent", async () => {
  await frame(0);
  await press(BTN.DOWN); // focus field A
  expect(await flag()).toBe(true);
  for (const ch of PHRASE) await typeKey(ch, codeOf(ch));
  expect(await logOf("__a")).toEqual(PREFIXES);
  expect(await keycapsDrawn()).toEqual([]);
  expect(await shoulder()).toBe(0);
  await typeKey("Escape", "Escape"); // closes direct typing, keeps the value
  expect(await logOf("__a")).toHaveLength(PHRASE.length);
  expect(await keycapsDrawn()).toEqual([]);
}, 30000);

test("the pad alone types field B through the row-strip keyboard: 54 d-pad moves", async () => {
  await press(BTN.DOWN); // A -> B; direct typing on A has already closed
  await press(BTN.CIRCLE); // open B keyboard
  expect(await flag()).toBe(false); // focus is on a key now
  expect(await keycapsDrawn()).toEqual(expect.arrayContaining(["DEL", "ENT"]));
  let pos: OskPos = homePos(rows);
  let moves = 0;
  let presses = 0;
  for (const ch of PHRASE) {
    const goal = keyAt(ch);
    for (const d of path(pos, goal)) {
      await press(BIT[d]);
      moves++;
    }
    pos = goal;
    await press(BTN.CIRCLE);
    presses++;
  }
  expect(moves).toBe(54);
  expect(presses).toBe(PHRASE.length);
  expect(await logOf("__b")).toEqual(PREFIXES);
  expect(await shoulder()).toBe(0);
  await press(BTN.CROSS); // close without touching the value
  expect(await keycapsDrawn()).toEqual([]);
}, 120000);
