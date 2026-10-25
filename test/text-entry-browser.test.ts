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

// ---- C4c: a touch host summons the native keyboard; the bridge feeds the same seam ----

const open = async (query: string): Promise<void> => {
  await chrome.navigate(server.url + "?" + query);
  for (let i = 0; i < 100 && !(await evaluate("!!window.__ready")); i++) await Bun.sleep(100);
  // count the bridge's focus() calls on the hidden entry (focus events are not dispatched while the
  // headless window lacks system focus): a non-touch host must never ask for it
  await evaluate("(() => { window.__nativeFocusCalls = 0; const e = document.getElementById('native-entry'); const f = e.focus.bind(e); e.focus = (o) => { window.__nativeFocusCalls++; f(o); }; })()");
};
// canvas-logical (x, y) of the first point the focusable field under it answers for
const FIND_FIELD = "(() => { for (let y = 0; y < 272; y += 2) for (let x = 0; x < 480; x += 2) if (globalThis.__pocketTextHitAt(x, y)) return x + ',' + y; return ''; })()";
// A finger tap as a touch browser sends it: pointer events, then the compatibility mouse events.
const tapAt = (x: number, y: number): Promise<unknown> =>
  evaluate(
    "(() => { const c = document.getElementById('screen'); const r = c.getBoundingClientRect(); " +
      "const o = { clientX: r.left + " + x + " * r.width / c.width, clientY: r.top + " + y + " * r.height / c.height, bubbles: true, pointerType: 'touch' }; " +
      "c.dispatchEvent(new PointerEvent('pointerdown', o)); c.dispatchEvent(new PointerEvent('pointerup', o)); " +
      "c.dispatchEvent(new MouseEvent('mousedown', o)); c.dispatchEvent(new MouseEvent('mouseup', o)); })()",
  );
const nativeInput = (inputType: string, data: string | null): Promise<boolean> =>
  evaluate(
    "document.getElementById('native-entry').dispatchEvent(new InputEvent('beforeinput', { inputType: " + JSON.stringify(inputType) + ", data: " + JSON.stringify(data) + ", cancelable: true }))",
  );
const nativeComposition = (type: string, data: string | null): Promise<unknown> =>
  evaluate(
    "document.getElementById('native-entry').dispatchEvent(new CompositionEvent(" + JSON.stringify(type) + ", { data: " + JSON.stringify(data) + ", bubbles: true }))",
  );
const focusedId = (): Promise<string> => evaluate("document.activeElement?.id ?? ''");

test("a tap on a touch host focuses the native entry and does not auto-open the OSK", async () => {
  await open("manual=1&touch=1");
  await frame(0);
  const at = String(await evaluate(FIND_FIELD)).split(",").map(Number);
  expect(at.length).toBe(2);
  await tapAt(at[0], at[1]);
  for (let i = 0; i < 4; i++) await frame(0);
  expect(await focusedId()).toBe("native-entry");
  expect(await evaluate("window.__nativeFocusCalls")).toBeGreaterThan(0);
  expect(await flag()).toBe(true);
  expect(await keycapsDrawn()).toEqual([]); // the native keyboard is the keyboard
  // the native keyboard types through the bridge into the same onChange seam
  expect(await nativeInput("insertText", "q")).toBe(false); // cancelled: the guest types it
  await frame(0);
  expect(await nativeInput("insertText", "u")).toBe(false);
  await frame(0);
  await nativeComposition("compositionstart", "");
  await nativeInput("insertCompositionText", "ni");
  await nativeComposition("compositionend", "你好");
  await frame(0);
  expect(await nativeInput("insertFromComposition", "你好")).toBe(false); // echo, not typed again
  await frame(0);
  expect(await logOf("__a")).toEqual(["q", "qu", "qu你好"]);
  expect(await keycapsDrawn()).toEqual([]);
}, 30000);

test("without a touch host a tap falls back to the OSK, and the native entry stays unfocused", async () => {
  await open("manual=1");
  await frame(0);
  const at = String(await evaluate(FIND_FIELD)).split(",").map(Number);
  await tapAt(at[0], at[1]);
  for (let i = 0; i < 4; i++) await frame(0);
  expect(await evaluate("window.__nativeFocusCalls")).toBe(0);
  expect((await keycapsDrawn()).length).toBeGreaterThan(0);
}, 30000);

// iOS race: the tap focuses the native entry on pointerup, but the guest only sees the press a
// frame later. The native keyboard must survive that frame, and leave when the field loses focus.
const liftAt = (x: number, y: number): Promise<unknown> =>
  evaluate(
    "(() => { const c = document.getElementById('screen'); const r = c.getBoundingClientRect(); " +
      "const o = { clientX: r.left + " + x + " * r.width / c.width, clientY: r.top + " + y + " * r.height / c.height, bubbles: true, pointerType: 'touch' }; " +
      "c.dispatchEvent(new PointerEvent('pointerdown', o)); c.dispatchEvent(new PointerEvent('pointerup', o)); })()",
  );
const compatMouseAt = (x: number, y: number): Promise<unknown> =>
  evaluate(
    "(() => { const c = document.getElementById('screen'); const r = c.getBoundingClientRect(); " +
      "const o = { clientX: r.left + " + x + " * r.width / c.width, clientY: r.top + " + y + " * r.height / c.height, bubbles: true }; " +
      "c.dispatchEvent(new MouseEvent('mousedown', o)); c.dispatchEvent(new MouseEvent('mouseup', o)); })()",
  );

test("the native keyboard survives the frame before the guest sees the tap, and leaves when the field loses focus", async () => {
  await open("manual=1&touch=1");
  await frame(0);
  const at = String(await evaluate(FIND_FIELD)).split(",").map(Number);
  await liftAt(at[0], at[1]); // pointerup only: the focus lands now, the guest press comes later
  expect(await focusedId()).toBe("native-entry");
  await frame(0); // the guest frame in between: its flag is still false
  expect(await focusedId()).toBe("native-entry");
  await compatMouseAt(at[0], at[1]); // the compatibility mouse events reach the guest
  for (let i = 0; i < 4; i++) await frame(0);
  expect(await flag()).toBe(true);
  expect(await focusedId()).toBe("native-entry");
  // the field loses focus without a tap: CIRCLE opens the panel, focus moves to a key
  await press(BTN.CIRCLE);
  for (let i = 0; i < 2; i++) await frame(0);
  expect(await focusedId()).not.toBe("native-entry");
}, 30000);
