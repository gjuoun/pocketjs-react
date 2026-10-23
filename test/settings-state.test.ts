// Settings and remembered position in the reader example, on the wasm core. With an fs (the
// browser host page's shim over an in-memory storage) the app reopens where it was left; without
// one it starts at the library.
import { beforeAll, expect, test } from "bun:test";
import { BTN } from "@pocketjs/framework/input";
import type { BuildResult } from "../tools/build.ts";
import { buildReader } from "../tools/build-reader.ts";
import { createBrowserFs } from "../tools/web/fs-shim.js";
import { bootApp, type Core } from "./harness.ts";

let built: BuildResult;
beforeAll(async () => {
  built = await buildReader({ outdir: "/tmp/pocketjs-react-test/settings" });
});

class MemoryStorage {
  map = new Map<string, string>();
  get length() {
    return this.map.size;
  }
  key(i: number) {
    return [...this.map.keys()][i] ?? null;
  }
  getItem(k: string) {
    return this.map.get(k) ?? null;
  }
  setItem(k: string, v: string) {
    this.map.set(k, v);
  }
  removeItem(k: string) {
    this.map.delete(k);
  }
  clear() {
    this.map.clear();
  }
}

async function open(storage?: MemoryStorage): Promise<Core> {
  const g = globalThis as { fs?: unknown };
  if (storage) g.fs = createBrowserFs(storage).ns;
  else delete g.fs;
  return bootApp(built);
}
const drawn = (core: Core) => core.texts().map((r) => r.text);

/** Library -> contents -> chapter 4 -> RIGHT twice (page 3). */
function readChapter4Page3(core: Core) {
  core.press(BTN.CIRCLE);
  for (let i = 0; i < 4; i++) core.press(BTN.DOWN);
  core.press(BTN.CIRCLE);
  core.press(BTN.RIGHT);
  core.press(BTN.RIGHT);
}
/** START -> Settings -> (optionally) press the item at index. */
function settings(core: Core, item: number) {
  core.press(BTN.START);
  core.press(BTN.DOWN); // menu opens on Contents; Settings is next
  core.press(BTN.CIRCLE);
  for (let i = 0; i < item; i++) core.press(BTN.DOWN);
  core.press(BTN.CIRCLE);
  core.press(BTN.CROSS);
}

test("font size L redraws the same text with a larger line pitch", async () => {
  const core = await open();
  try {
    readChapter4Page3(core);
    const body = (runs: ReturnType<Core["texts"]>) =>
      runs.filter((r) => r.y > 30 && r.y < 232 && r.text.trim().length > 20);
    const small = body(core.texts());
    settings(core, 0); // S -> M
    settings(core, 0); // M -> L
    const large = body(core.texts());
    const pitch = (runs: typeof small) => runs[1].y - runs[0].y;
    console.log(
      "pitch S=" +
        pitch(small) +
        " L=" +
        pitch(large) +
        " | S first: " +
        small[0].text.slice(0, 40) +
        " | L lines: " +
        large.length,
    );
    expect(pitch(large)).toBeGreaterThan(pitch(small));
    const firstWords = small[0].text.split(" ").slice(0, 3).join(" ");
    expect(large.map((r) => r.text).join(" ")).toContain(firstWords);
  } finally {
    core.dispose();
  }
});

test("dark theme paints the page in the bg-slate-950 color", async () => {
  const core = await open();
  try {
    readChapter4Page3(core);
    core.texts();
    const light = core.pixel(470, 262);
    core.press(BTN.START);
    core.texts();
    const scrim = core.pixel(2, 2); // the menu's bg-slate-950 backdrop, drawn by the same core
    core.press(BTN.CROSS);
    settings(core, 1); // Theme -> dark
    core.texts();
    const dark = core.pixel(470, 262);
    console.log(
      "background light=" + light + " dark=" + dark + " slate-950=" + scrim,
    );
    expect(light).toBe("#ffffff");
    expect(dark).toBe(scrim);
  } finally {
    core.dispose();
  }
});

test("with an fs the app reopens on the saved page; without one it starts at the library", async () => {
  const storage = new MemoryStorage();
  let core = await open(storage);
  try {
    readChapter4Page3(core);
    expect(drawn(core)).toContain("4. Proof-of-Work");
  } finally {
    core.dispose();
  }
  core = await open(storage);
  try {
    const text = drawn(core);
    expect(text[0]).toBe("4. Proof-of-Work");
    expect(text).toContain("page 3/4");
  } finally {
    core.dispose();
  }
  core = await open();
  try {
    expect(drawn(core)).toContain("Library");
  } finally {
    core.dispose();
  }
});
