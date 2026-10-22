// The browser host page (tools/web/reader.html) runs the reader through the npm package's
// app-instance.js with text.glyphs.runtime: a Chinese EPUB picked with the file input draws with
// real glyphs (the browser's fonts), and the core draws exactly the lines the reader computed.
import { afterAll, beforeAll, expect, test } from "bun:test";
import { rmSync } from "node:fs";
import { HeadlessChrome } from "../src/internal/pocket-build.ts";
import { buildReader } from "../tools/build-reader.ts";
import { serveReader, type ReaderServer } from "../tools/web/serve.ts";

const EPUB = process.cwd() + "/test/fixtures/books/sanguo.epub";
const PROFILE = "/tmp/pocketjs-react-test/cjk-browser-chrome";
const BTN = { DOWN: 0x40, RIGHT: 0x20, LEFT: 0x80, RTRIGGER: 0x200, CIRCLE: 0x2000 };
let server: ReaderServer;
let chrome: Awaited<ReturnType<typeof HeadlessChrome.start>>;

beforeAll(async () => {
  server = serveReader(await buildReader({ outdir: "/tmp/pocketjs-react-test/cjk-browser" }));
  rmSync(PROFILE, { recursive: true, force: true });
  chrome = await HeadlessChrome.start({ port: 9421, profile: PROFILE, timeoutMs: 20000 });
});
afterAll(() => {
  chrome?.stop();
  server?.stop();
});

export interface Run { x: number; y: number; w: number; h: number; t: string }
const evaluate = (js: string) => chrome.evaluate(js);
/** One frame on the page's manual clock; returns the frame's ms. */
const step = async (buttons = 0): Promise<number> => evaluate("window.__host.step(" + buttons + ")");
/** Press and release: 3 frames held, 3 released. Returns the slowest frame's ms. */
async function press(bit: number): Promise<number> {
  let slowest = 0;
  for (let i = 0; i < 3; i++) slowest = Math.max(slowest, await step(bit));
  for (let i = 0; i < 3; i++) slowest = Math.max(slowest, await step(0));
  return slowest;
}
async function runs(): Promise<Run[]> {
  const raw: string = await evaluate("window.__host.texts()");
  return raw.split("\n").filter(Boolean).map((l) => {
    const [r, t] = l.split("\t");
    const [x, y, w, h] = r.split(",").map(Number);
    return { x, y, w, h, t };
  });
}

/** Opens the page, picks sanguo.epub, opens it from the Files tab and reads chapter 1 page 1. */
export async function openSanguo(): Promise<{ chapterMs: number }> {
  await chrome.navigate(server.url + "?manual=1");
  for (let i = 0; i < 100 && !(await evaluate("!!window.__ready")); i++) await Bun.sleep(100);
  const doc = (await chrome.send("DOM.getDocument", {})).result;
  const input = (await chrome.send("DOM.querySelector", { nodeId: doc.root.nodeId, selector: "#pick" })).result;
  await chrome.send("DOM.setFileInputFiles", { nodeId: input.nodeId, files: [EPUB] });
  for (let i = 0; i < 100 && (await evaluate("window.__host.starts")) < 2; i++) await Bun.sleep(50);
  for (let i = 0; i < 3; i++) await step(0);
  await press(BTN.RTRIGGER); // Files tab
  expect((await runs()).map((r) => r.t)).toContain("三國志演義");
  await press(BTN.DOWN);
  await press(BTN.CIRCLE); // contents
  expect((await runs()).some((r) => r.t.startsWith("第一回："))).toBe(true);
  const chapterMs = await press(BTN.CIRCLE); // chapter 1
  return { chapterMs };
}

test("a picked Chinese EPUB reads with real glyphs, and the drawn lines are the computed lines", async () => {
  await openSanguo();
  const page = await runs();
  expect(page[0].t).toBe("第一回：宴桃園豪傑三結義，斬黃巾英雄首立功");
  // Real advances: the placeholder box measures 23 px at slot 1.
  expect(await evaluate("globalThis.ui.measureText('中', 1)")).toBe(15);
  // The body runs (between the title row and the footer) are the reader's computed lines.
  const computed: string[] = await evaluate("globalThis.__readerPage");
  const body = page.slice(1, -2);
  expect(body.map((r) => r.t)).toEqual(computed.map((t) => t || " "));
  // Different hanzi draw different ink: hash each 15 px cell of the first long body line.
  const line = body.find((r) => [...r.t].length >= 20)!;
  const sigs: number[] = await evaluate(
    "(() => { const fb = window.__host.pixels(); const out = []; for (let k = 0; k < 8; k++) { let s = 0; for (let y = " + line.y + "; y < " + (line.y + line.h) + "; y++) for (let x = " + line.x + " + k * 15; x < " + line.x + " + (k + 1) * 15; x++) s = (s * 31 + fb[(y * 480 + x) * 4]) | 0; out.push(s); } return out; })()",
  );
  const chars = [...line.t].slice(0, 8);
  for (let a = 0; a < 8; a++) for (let b = a + 1; b < 8; b++) if (chars[a] !== chars[b]) expect(sigs[a] === sigs[b]).toBe(false);
  // Every character of the chapter so far came from the runtime source: no boxes.
  const stats = await evaluate("window.__host.glyphStats()");
  expect(stats.glyphs).toBeGreaterThan(900);
  expect(stats.full).toBe(0);
  // A page turn and back draws the same computed lines again.
  await press(BTN.RIGHT);
  await press(BTN.LEFT);
  expect((await runs()).slice(1, -2).map((r) => r.t)).toEqual(body.map((r) => r.t));
}, 60000);

test("after 60 frames on chapter 1 the next chapter opens in under 60 ms, warmed in frames under 40 ms", async () => {
  await openSanguo();
  const warm: number[] = [];
  for (let i = 0; i < 60; i++) warm.push(await step(0));
  const before = (await evaluate("window.__host.glyphStats()")).glyphs;
  const nextMs = await press(BTN.RTRIGGER);
  const after = (await evaluate("window.__host.glyphStats()")).glyphs;
  const page = await runs();
  console.log("warm-up frames max=" + Math.max(...warm).toFixed(1) + " ms, slow frames=" + warm.filter((m) => m > 5).length + "; next chapter frame=" + nextMs.toFixed(1) + " ms; glyphs " + before + " -> " + after);
  expect(page[0].t.startsWith("第二回：")).toBe(true);
  expect(Math.max(...warm)).toBeLessThan(40);
  expect(nextMs).toBeLessThan(60);
}, 60000);
