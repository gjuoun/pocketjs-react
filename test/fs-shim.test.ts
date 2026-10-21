// The browser host page in headless Chrome: picked files appear under books/ for the guest's fs
// SDK, state/ survives a page reload, and books/ refuses writes.
import { afterAll, beforeAll, expect, test } from "bun:test";
import { rmSync } from "node:fs";
import { HeadlessChrome } from "../src/internal/pocket-build.ts";
import { build } from "../tools/build.ts";
import { serveReader, type ReaderServer } from "../tools/web/serve.ts";

const EPUB = process.cwd() + "/assets/books/bitcoin-whitepaper.epub";
const PROFILE = "/tmp/pocketjs-react-test/fs-shim-chrome";
let server: ReaderServer;
let chrome: Awaited<ReturnType<typeof HeadlessChrome.start>>;

beforeAll(async () => {
  const built = await build("test/fixtures/fs-guest/main.tsx", { outdir: "/tmp/pocketjs-react-test/fs-shim" });
  server = serveReader(built);
  rmSync(PROFILE, { recursive: true, force: true });
  chrome = await HeadlessChrome.start({ port: 9411, profile: PROFILE, timeoutMs: 20000 });
});
afterAll(() => {
  chrome?.stop();
  server?.stop();
});

async function out(previous?: string): Promise<Record<string, unknown>> {
  for (let i = 0; i < 100; i++) {
    const v = await chrome.evaluate("globalThis.__out || ''");
    if (v && v !== previous) return JSON.parse(v);
    await Bun.sleep(50);
  }
  throw new Error("guest did not report");
}

let first: Record<string, unknown>;

test("books/ refuses writes while state/ accepts them", async () => {
  await chrome.navigate(server.url);
  first = await out();
  expect(first.books).toEqual([]);
  expect(first.opens).toBe(1);
  expect(String(first.booksWritable)).toContain("read-only");
});

test("files set on the page's file input list under books/ with their real size", async () => {
  const doc = (await chrome.send("DOM.getDocument", {})).result;
  const input = (await chrome.send("DOM.querySelector", { nodeId: doc.root.nodeId, selector: "#pick" })).result;
  await chrome.send("DOM.setFileInputFiles", { nodeId: input.nodeId, files: [EPUB] });
  const picked = await out(JSON.stringify(first));
  expect(picked.books).toEqual([["bitcoin-whitepaper.epub", Bun.file(EPUB).size]]);
  expect(picked.opens).toBe(2);
});

test("state/ survives a page reload; picked files do not", async () => {
  await chrome.navigate(server.url);
  const reloaded = await out();
  expect(reloaded.opens).toBe(3);
  expect(reloaded.books).toEqual([]);
});
