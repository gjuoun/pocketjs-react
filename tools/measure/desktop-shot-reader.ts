// measure:desktop-shot --app reader: the reader on the macOS desktop host, captured from its own
// window: the library, the contents, and two reading pages of the bundled whitepaper. Where to
// look comes from the same bundle on the wasm core (text rects); the check reads the desktop
// window's pixels there.
import { copyFileSync } from "node:fs";
import { join } from "node:path";
import { createWasmUi, FRAMEWORK_ROOT } from "../../src/internal/pocket-build.ts";
import { OUT, PROFILES, wrapGuest } from "./common.ts";
import { desktopHost } from "./desktop-host.ts";
import { captureWindow, readCapture } from "./window-capture.ts";

type Run = { x: number; y: number; w: number; h: number; t: string };
const SCRIPT = ["circle", "down", "down", "down", "down", "circle", "right"];
const LABELS = ["library", "contents", "", "", "", "", "reading-page-1", "reading-page-2"];
const BTN: Record<string, number> = { down: 0x40, right: 0x20, circle: 0x2000 };
const KEY: Record<string, string> = { down: "down", right: "right", circle: "x" };

async function wasmScreens(js: string, pak: string): Promise<Run[][]> {
  const core = await createWasmUi(await Bun.file(FRAMEWORK_ROOT + "hosts/web/pocketjs.wasm").arrayBuffer());
  const ops = core.ops as Record<string, any>;
  const g = globalThis as Record<string, any>;
  g.ui = ops;
  g.__pak = await Bun.file(pak).arrayBuffer();
  (0, eval)(await Bun.file(js).text());
  const step = (b: number) => { g.frame(b); core.tick(); };
  const texts = (): Run[] => {
    ops.captureTexts(0, 0);
    core.render();
    return String(ops.capturedTexts(0)).split("\n").filter(Boolean).map((l) => { const [r, t] = l.split("\t"); const [x, y, w, h] = r.split(",").map(Number); return { x, y, w, h, t }; });
  };
  step(0);
  const screens = [texts()];
  for (const name of SCRIPT) {
    for (let i = 0; i < 3; i++) step(BTN[name]);
    for (let i = 0; i < 3; i++) step(0);
    screens.push(texts());
  }
  delete g.ui;
  delete g.__pak;
  return screens;
}

export async function readerShots(): Promise<number> {
  const host = desktopHost();
  const built = await PROFILES.reader.build();
  const screens = await wasmScreens(built.js, built.pak);
  const find = (screen: number, test: (t: string) => boolean) => { const r = screens[screen].find((run) => test(run.t)); if (!r) throw new Error("screen " + screen + ": not drawn on the wasm core"); return r; };
  const title = find(0, (t) => t.startsWith("Bitcoin: A Peer-to-Peer"));
  const abstract = find(1, (t) => t === "Abstract");
  const header = find(6, (t) => t === "4. Proof-of-Work");
  const pageNo = find(6, (t) => t.startsWith("page 1/"));
  const body = { x: 12, y: 40, w: 456, h: 180 };

  const guest = await wrapGuest(built.js, join(OUT, "shot-reader-guest.js"));
  const presses = SCRIPT.map((name, i) => KEY[name] + "@" + (60 + i * 60));
  const dir = join(OUT, "shots");
  const files = await captureWindow(host, { guest, pak: built.pak, presses, quitAfter: 60 + SCRIPT.length * 60 + 90, dir, prefix: "desktop-reader-" });
  const shot = files.map(readCapture);
  for (const [i, label] of LABELS.entries()) if (label && files[i]) copyFileSync(files[i], join(dir, "desktop-reader-" + label + ".png"));

  const checks: [string, boolean][] = [
    ["library draws the book title", shot[0].ink(title) > 40],
    ["contents draws 'Abstract' where the library drew none", shot[1].ink(abstract) > 20 && shot[1].hash(abstract) !== shot[0].hash(abstract)],
    ["reading page draws the chapter heading", shot[6].ink(header) > 40],
    ["RIGHT changes the page body", shot[7].hash(body) !== shot[6].hash(body) && shot[7].ink(body) > 200],
    ["RIGHT changes the page number", shot[7].hash(pageNo) !== shot[6].hash(pageNo)],
  ];
  for (const [label, ok] of checks) console.log((ok ? "ok   " : "FAIL ") + label);
  console.log("ink: library title=" + shot[0].ink(title) + " contents Abstract=" + shot[1].ink(abstract) + " heading=" + shot[6].ink(header) + " page body=" + shot[6].ink(body) + "/" + shot[7].ink(body));
  console.log("screenshots: " + LABELS.filter(Boolean).map((l) => join(dir, "desktop-reader-" + l + ".png")).join(" "));
  const ok = files.length === SCRIPT.length + 1 && checks.every(([, v]) => v);
  console.log(ok ? "reader-shot ok" : "reader-shot FAILED (" + files.length + " captures)");
  return ok ? 0 : 1;
}
