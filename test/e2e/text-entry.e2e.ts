// Text-entry browser suite: the C4b/C4c text-entry browser suite (was test/text-entry-browser.test.ts: CDP over
// Bun) on the Playwright matrix. Input is trusted: page.keyboard, page.mouse, page.touchscreen. The
// synthetic events stay only where the seam needs a split a real tap cannot produce (a pointerup
// without its compatibility mouse events). The native-keyboard cases are touch-host only (Risks).
import { expect, type Page, type TestInfo, test } from "@playwright/test";
import {
  homePos,
  layoutRows,
  navigate,
  type OskPos,
  oskLayer,
} from "../../src/input/osk-layout.ts";
import { BTN } from "../../tools/web/text-entry-host.js";
import { manifest, openHost, type Server, serve } from "./helpers.ts";

const PHRASE = "quick brown fox";
const KEYCAPS = ["DEL", "ENT", "OK", "HIDE", "1#", "ABC"];
const PREFIXES = Array.from({ length: PHRASE.length }, (_, i) =>
  PHRASE.slice(0, i + 1),
);
const TOUCH_ONLY =
  "native-keyboard case: a touch host only (see Risks in plan.md)";

let server: Server;
test.beforeAll(async () => {
  server = await serve();
});
test.afterAll(async () => {
  await server?.stop();
});

interface TextRun {
  x: number;
  y: number;
  w: number;
  h: number;
  text: string;
}
/** Copy of src/input/text-field.ts parseRuns (that module imports the framework; node cannot load it). */
function parseRuns(captured: string): TextRun[] {
  const runs: TextRun[] = [];
  for (const line of captured.split("\n")) {
    const tab = line.indexOf("\t");
    if (tab < 0) continue;
    const [x, y, w, h] = line.slice(0, tab).split(",").map(Number);
    runs.push({ x, y, w, h, text: line.slice(tab + 1) });
  }
  return runs;
}

const isTouch = (testInfo: TestInfo) => testInfo.project.use.hasTouch === true;

/** Open the host page with a query, then install the native-entry focus counter. */
async function open(
  page: Page,
  testInfo: TestInfo,
  query: string,
): Promise<void> {
  // A touch tier is a touch host, as an iPhone is. WebKit's emulation reports maxTouchPoints 0, so the override is explicit.
  const q =
    isTouch(testInfo) && !query.includes("touch=1")
      ? query + "&touch=1"
      : query;
  await openHost(page, testInfo, server.url + "?" + q);
  await page.evaluate(
    "(() => { window.__nativeFocusCalls = 0; const e = document.getElementById('native-entry'); const f = e.focus.bind(e); e.focus = (o) => { window.__nativeFocusCalls++; f(o); }; })()",
  );
}

// One guest frame with an explicit pad state (0 = released); the page runs on a manual clock.
const frame = (page: Page, buttons = 0) =>
  page.evaluate("window.__host.step(" + buttons + ")");
const frames = async (page: Page, n: number) => {
  for (let i = 0; i < n; i++) await frame(page);
};
// A pad press: 3 frames held, 3 released, in one task.
const press = (page: Page, bit: number) =>
  page.evaluate(
    "(() => { for (let i = 0; i < 3; i++) window.__host.step(" +
      bit +
      "); for (let i = 0; i < 3; i++) window.__host.step(0); })()",
  );
// One physical key (trusted), then two guest frames.
const keyTap = async (page: Page, key: string) => {
  await page.keyboard.press(key === " " ? "Space" : key);
  await frames(page, 2);
};
const texts = async (page: Page): Promise<string[]> =>
  (await page.evaluate<string>("window.__host.texts()"))
    .split("\n")
    .filter(Boolean)
    .map((line) => line.split("\t")[1]);
const keycapsDrawn = async (page: Page) =>
  (await texts(page)).filter((t) => KEYCAPS.includes(t));
const logOf = (page: Page, name: string) =>
  page.evaluate<string[]>("globalThis[" + JSON.stringify(name) + "] ?? []");
const flag = (page: Page) =>
  page.evaluate<boolean>("globalThis.__pocketTextEntry === true");
const shoulder = async (page: Page) =>
  Number(await page.evaluate("globalThis.__shoulder ?? 0"));
const focusedId = (page: Page) =>
  page.evaluate<string>("document.activeElement?.id ?? ''");

// The panel layout as it draws: lower layer, 472 px of row width, 4 px gaps.
const rows = layoutRows(oskLayer("lower"), 480 - 2 * 4, 4);
const keyAt = (ch: string): OskPos => {
  for (const row of rows)
    for (const k of row) if (k.key.ch === ch) return { row: k.row, col: k.col };
  throw new Error("no key " + ch);
};
type Dir = "up" | "down" | "left" | "right";
const BIT: Record<Dir, number> = {
  up: BTN.UP,
  down: BTN.DOWN,
  left: BTN.LEFT,
  right: BTN.RIGHT,
};
const key = (p: OskPos) => p.row + ":" + p.col;
// Shortest d-pad path (directions) from `from` to `goal` over navigate().
function path(from: OskPos, goal: OskPos): Dir[] {
  const prev = new Map<string, { p: OskPos; d: Dir }>();
  let frontier = [from];
  const seen = new Set([key(from)]);
  while (frontier.length && !seen.has(key(goal))) {
    const next: OskPos[] = [];
    for (const p of frontier)
      for (const d of ["up", "down", "left", "right"] as Dir[]) {
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

// canvas-logical (x, y) of the first point the focusable field under it answers for
// The centre of the part of the field that is on screen: a point past the phone viewport's edge never reaches the canvas on WebKit.
const FIND_FIELD =
  "(() => { const c = document.getElementById('screen'); const r = c.getBoundingClientRect(); const maxX = Math.min(c.width - 1, Math.floor((innerWidth - r.left - 1) * c.width / r.width)); const maxY = Math.min(c.height - 1, Math.floor((innerHeight - r.top - 1) * c.height / r.height)); const hit = (x, y) => globalThis.__pocketTextHitAt(x, y); let x0 = -1, y0 = -1; outer: for (let y = 0; y <= maxY; y += 2) for (let x = 0; x <= maxX; x += 2) if (hit(x, y)) { x0 = x; y0 = y; break outer; } if (x0 < 0) return ''; let x1 = x0; while (x1 + 1 <= maxX && hit(x1 + 1, y0)) x1++; let y1 = y0; while (y1 + 1 <= maxY && hit(x0, y1 + 1)) y1++; return Math.floor((x0 + x1) / 2) + ',' + Math.floor((y0 + y1) / 2); })()";
async function findField(page: Page): Promise<[number, number]> {
  const at = await page.evaluate<string>(FIND_FIELD);
  expect(at).not.toBe("");
  const [x, y] = at.split(",").map(Number);
  // The tap must land on screen: a point past the phone viewport's edge never reaches the canvas on WebKit.
  const [cx, cy] = await clientOf(page, x, y);
  const view = await page.evaluate<[number, number]>("[innerWidth, innerHeight]");
  expect(cx).toBeLessThan(view[0]);
  expect(cy).toBeLessThan(view[1]);
  return [x, y];
}
/** Client pixels of a canvas-logical point. */
const clientOf = (page: Page, x: number, y: number) =>
  page.evaluate<[number, number]>(
    "(() => { const c = document.getElementById('screen'); const r = c.getBoundingClientRect(); return [r.left + " +
      x +
      " * r.width / c.width, r.top + " +
      y +
      " * r.height / c.height]; })()",
  );
/** A real tap on the canvas: touch on the touch tiers, a mouse click on the desktop tier. */
async function tapAt(
  page: Page,
  testInfo: TestInfo,
  x: number,
  y: number,
): Promise<void> {
  const [cx, cy] = await clientOf(page, x, y);
  if (isTouch(testInfo)) await page.touchscreen.tap(cx, cy);
  else await page.mouse.click(cx, cy);
}
/** Synthetic split of a tap: pointerdown + pointerup only (focus lands, the guest press comes later). */
const liftAt = (page: Page, x: number, y: number) =>
  page.evaluate(
    "(() => { const c = document.getElementById('screen'); const r = c.getBoundingClientRect(); const o = { clientX: r.left + " +
      x +
      " * r.width / c.width, clientY: r.top + " +
      y +
      " * r.height / c.height, bubbles: true, pointerType: 'touch' }; c.dispatchEvent(new PointerEvent('pointerdown', o)); c.dispatchEvent(new PointerEvent('pointerup', o)); })()",
  );
/** Synthetic compatibility mouse events for a tap. */
const compatMouseAt = (page: Page, x: number, y: number) =>
  page.evaluate(
    "(() => { const c = document.getElementById('screen'); const r = c.getBoundingClientRect(); const o = { clientX: r.left + " +
      x +
      " * r.width / c.width, clientY: r.top + " +
      y +
      " * r.height / c.height, bubbles: true }; c.dispatchEvent(new MouseEvent('mousedown', o)); c.dispatchEvent(new MouseEvent('mouseup', o)); })()",
  );
/** Synthetic beforeinput on the hidden native entry (the seam, not the browser). */
const nativeInput = (page: Page, inputType: string, data: string | null) =>
  page.evaluate<boolean>(
    "document.getElementById('native-entry').dispatchEvent(new InputEvent('beforeinput', { inputType: " +
      JSON.stringify(inputType) +
      ", data: " +
      JSON.stringify(data) +
      ", cancelable: true }))",
  );
const nativeComposition = (page: Page, type: string, data: string | null) =>
  page.evaluate(
    "document.getElementById('native-entry').dispatchEvent(new CompositionEvent(" +
      JSON.stringify(type) +
      ", { data: " +
      JSON.stringify(data) +
      ", bubbles: true }))",
  );

/** Let a caret placement land: drain the pointer, arm the read, draw, apply. */
async function settle(page: Page): Promise<void> {
  await frame(page);
  await page.evaluate("window.__host.draw()");
  await frames(page, 2);
}
async function fieldRun(
  page: Page,
  prefix: string,
): Promise<TextRun | undefined> {
  const raw = await page.evaluate<string>("window.__host.texts()");
  return parseRuns(raw).find((r) => r.text.startsWith(prefix));
}
const measureOn = (page: Page, s: string) =>
  page.evaluate<number>(
    "globalThis.ui.measureText(" +
      JSON.stringify(s) +
      ", " +
      manifest.fieldFontSlot +
      ")",
  );
/** A point just right of the middle of the 'c' in a run that starts with "abc": the caret goes after c. */
async function pastC(page: Page, run: TextRun): Promise<[number, number]> {
  const pw3 = await measureOn(page, "abc");
  const pw4 = await measureOn(page, "abcd");
  return [run.x + pw3 + 0.25 * (pw4 - pw3), run.y + run.h / 2];
}

test("physical keys type into field A; no keyboard panel; L shoulder stays silent", async ({
  page,
}, testInfo) => {
  await open(page, testInfo, "manual=1");
  await frame(page);
  await press(page, BTN.DOWN); // focus field A
  expect(await flag(page)).toBe(true);
  for (const ch of PHRASE) await keyTap(page, ch);
  expect(await logOf(page, "__a")).toEqual(PREFIXES);
  expect(await keycapsDrawn(page)).toEqual([]);
  expect(await shoulder(page)).toBe(0);
  await keyTap(page, "Escape"); // closes direct typing, keeps the value
  expect(await logOf(page, "__a")).toHaveLength(PHRASE.length);
  expect(await keycapsDrawn(page)).toEqual([]);
});

test("the pad alone types field B through the row-strip keyboard: 54 d-pad moves", async ({
  page,
}, testInfo) => {
  test.setTimeout(120000);
  await open(page, testInfo, "manual=1");
  await frame(page);
  await press(page, BTN.DOWN); // focus A
  await keyTap(page, "Escape"); // close direct typing on A
  await press(page, BTN.DOWN); // A -> B
  await press(page, BTN.CIRCLE); // open B's keyboard: focus is on a key, still the field's entry
  expect(await flag(page)).toBe(true);
  expect(await keycapsDrawn(page)).toEqual(
    expect.arrayContaining(["DEL", "ENT"]),
  );
  let pos: OskPos = homePos(rows);
  let moves = 0;
  let presses = 0;
  for (const ch of PHRASE) {
    const goal = keyAt(ch);
    for (const d of path(pos, goal)) {
      await press(page, BIT[d]);
      moves++;
    }
    pos = goal;
    await press(page, BTN.CIRCLE);
    presses++;
  }
  expect(moves).toBe(54);
  expect(presses).toBe(PHRASE.length);
  expect(await logOf(page, "__b")).toEqual(PREFIXES);
  expect(await shoulder(page)).toBe(0);
  await press(page, BTN.CROSS); // close without touching the value
  expect(await keycapsDrawn(page)).toEqual([]);
});

test("a tap on a touch host focuses the native entry and does not auto-open the OSK", async ({
  page,
}, testInfo) => {
  test.skip(!isTouch(testInfo), TOUCH_ONLY);
  await open(page, testInfo, "manual=1&touch=1");
  await frame(page);
  const [x, y] = await findField(page);
  await tapAt(page, testInfo, x, y);
  await frames(page, 4);
  expect(await focusedId(page)).toBe("native-entry");
  expect(
    await page.evaluate<number>("window.__nativeFocusCalls"),
  ).toBeGreaterThan(0);
  expect(await flag(page)).toBe(true);
  expect(await keycapsDrawn(page)).toEqual([]); // the native keyboard is the keyboard
  // the native keyboard types through the bridge into the same onChange seam
  expect(await nativeInput(page, "insertText", "q")).toBe(false); // cancelled: the guest types it
  await frame(page);
  expect(await nativeInput(page, "insertText", "u")).toBe(false);
  await frame(page);
  await nativeComposition(page, "compositionstart", "");
  await nativeInput(page, "insertCompositionText", "ni");
  await nativeComposition(page, "compositionend", "你好");
  await frame(page);
  expect(await nativeInput(page, "insertFromComposition", "你好")).toBe(false); // echo, not typed again
  await frame(page);
  expect(await logOf(page, "__a")).toEqual(["q", "qu", "qu你好"]);
  expect(await keycapsDrawn(page)).toEqual([]);
});

test("without a touch host a tap falls back to the OSK, and the native entry stays unfocused", async ({
  page,
}, testInfo) => {
  test.skip(
    isTouch(testInfo),
    "desktop tier only: a touch device is a touch host by detection (maxTouchPoints)",
  );
  await open(page, testInfo, "manual=1");
  await frame(page);
  const [x, y] = await findField(page);
  await tapAt(page, testInfo, x, y);
  await frames(page, 4);
  expect(await page.evaluate<number>("window.__nativeFocusCalls")).toBe(0);
  expect((await keycapsDrawn(page)).length).toBeGreaterThan(0);
});

test("the native keyboard survives the frame before the guest sees the tap, and leaves when the field loses focus", async ({
  page,
}, testInfo) => {
  test.skip(!isTouch(testInfo), TOUCH_ONLY);
  await open(page, testInfo, "manual=1&touch=1");
  await frame(page);
  const [x, y] = await findField(page);
  await liftAt(page, x, y); // pointerup only: the focus lands now, the guest press comes later
  expect(await focusedId(page)).toBe("native-entry");
  await frame(page); // the guest frame in between: its flag is still false
  expect(await focusedId(page)).toBe("native-entry");
  await compatMouseAt(page, x, y); // the compatibility mouse events reach the guest
  await frames(page, 4);
  expect(await flag(page)).toBe(true);
  expect(await focusedId(page)).toBe("native-entry");
  // the field loses focus without a tap: CIRCLE opens the panel, focus moves to a key
  await press(page, BTN.CIRCLE);
  await frames(page, 2);
  expect(await focusedId(page)).not.toBe("native-entry");
});

test("a trusted mouse echo after the tap does not take focus from the native entry", async ({
  page,
}, testInfo) => {
  test.skip(!isTouch(testInfo), TOUCH_ONLY);
  await open(page, testInfo, "manual=1&touch=1");
  await frame(page);
  const [x, y] = await findField(page);
  await liftAt(page, x, y);
  expect(await focusedId(page)).toBe("native-entry");
  const [cx, cy] = await clientOf(page, x, y);
  await page.mouse.click(cx, cy); // trusted mouse echo of the tap
  await frames(page, 4);
  expect(await focusedId(page)).toBe("native-entry");
  // the seam is still live: native text reaches the field after the echo
  expect(await nativeInput(page, "insertText", "q")).toBe(false);
  await frame(page);
  expect(await logOf(page, "__a")).toEqual(["q"]);
  expect(await keycapsDrawn(page)).toEqual([]);
});

test("physical keys: letters type, ArrowLeft moves the caret, Delete removes the character after it", async ({
  page,
}, testInfo) => {
  await open(page, testInfo, "manual=1");
  await frame(page);
  await press(page, BTN.DOWN); // focus field A
  await keyTap(page, "a");
  await keyTap(page, "b");
  await keyTap(page, "ArrowLeft"); // caret between a and b
  await keyTap(page, "Delete"); // removes b
  expect(await logOf(page, "__a")).toEqual(["a", "ab", "a"]);
  await keyTap(page, "Backspace"); // removes a
  expect(await logOf(page, "__a")).toEqual(["a", "ab", "a", ""]);
  expect(await shoulder(page)).toBe(0);
});

test("the hidden native entry holds content after a tap, so a native Backspace reaches the seam", async ({
  page,
}, testInfo) => {
  test.skip(!isTouch(testInfo), TOUCH_ONLY);
  await open(page, testInfo, "manual=1&touch=1");
  await frame(page);
  const [x, y] = await findField(page);
  await tapAt(page, testInfo, x, y); // the tap focuses the field and sends its echo
  await frames(page, 2);
  expect(
    await page.evaluate<number>(
      "document.getElementById('native-entry').value.length",
    ),
  ).toBeGreaterThan(0);
  await page.keyboard.insertText("a"); // trusted native text
  await frames(page, 2);
  await page.keyboard.press("Backspace"); // trusted native Backspace (the iOS report)
  await frames(page, 2);
  expect(await logOf(page, "__a")).toEqual(["a", ""]);
});

test("a click inside the focused field places the caret where it lands; typing goes there", async ({
  page,
}, testInfo) => {
  test.setTimeout(60000);
  await open(page, testInfo, "manual=1");
  await frame(page);
  await press(page, BTN.DOWN); // focus field A
  for (const ch of "abcdef") await keyTap(page, ch);
  const run = await fieldRun(page, "abcdef");
  expect(run).toBeDefined();
  // the field's font is the one the core measures its run with
  expect(await measureOn(page, "abcdef|")).toBeCloseTo(run!.w, 0);
  const [x, y] = await pastC(page, run!);
  await tapAt(page, testInfo, x, y);
  await settle(page);
  await keyTap(page, "X");
  await settle(page);
  expect((await logOf(page, "__a")).at(-1)).toBe("abcXdef");
  expect(await keycapsDrawn(page)).toEqual([]); // a click on the focused field opens no panel
});

test("on a touch host a tap inside the focused field places the caret; the native keys insert there", async ({
  page,
}, testInfo) => {
  test.skip(!isTouch(testInfo), TOUCH_ONLY);
  test.setTimeout(60000);
  await open(page, testInfo, "manual=1&touch=1");
  await frame(page);
  const [x, y] = await findField(page);
  await tapAt(page, testInfo, x, y);
  await settle(page);
  for (const ch of "abcdef") {
    await page.keyboard.insertText(ch);
    await settle(page);
  }
  const run = await fieldRun(page, "abcdef");
  expect(run).toBeDefined();
  const [px, py] = await pastC(page, run!);
  await tapAt(page, testInfo, px, py);
  await settle(page);
  await page.keyboard.insertText("X");
  await settle(page);
  expect((await logOf(page, "__a")).at(-1)).toBe("abcXdef");
  expect(await keycapsDrawn(page)).toEqual([]);
});

test("a touch tap outside the field lets the native keyboard go", async ({
  page,
}, testInfo) => {
  test.skip(!isTouch(testInfo), TOUCH_ONLY);
  await open(page, testInfo, "manual=1&touch=1");
  await frame(page);
  const [x, y] = await findField(page);
  await tapAt(page, testInfo, x, y);
  await settle(page);
  expect(await focusedId(page)).toBe("native-entry");
  // A point outside both fields, on screen in the phone viewport: the tap must reach the canvas and drop the field.
  expect(
    await page.evaluate<boolean>("globalThis.__pocketTextHitAt(120, 200)"),
  ).toBe(false);
  await tapAt(page, testInfo, 120, 200);
  await settle(page);
  expect(await focusedId(page)).not.toBe("native-entry");
});
