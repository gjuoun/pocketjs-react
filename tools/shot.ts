// Screenshots (and a paint check) of a built app on the browser host, driven by the pad.
//
//   bun tools/shot.ts --js dist/todo.js --pak dist/todo.pak --out dist/todo [--script "down,press,shot"]
//
// The script is a comma-separated list of steps:
//   up down left right          one d-pad step (a 60 ms hold)
//   press cross square triangle select start circle   a face/shoulder button
//   ltrig rtrig                 the shoulder triggers
//   type:<text>                 type it into the page as physical keys (spaces allowed)
//   key:<Name>                  one raw key: Enter, Backspace, Escape, ArrowDown, ...
//   expect:<text>               fail the run unless the app draws this text right now
//   texts                       print every text the app draws (a census, for narrowing a failure)
//   wait                        settle for --gap ms (default 300)
//   shot                        write a PNG and keep going
// A run with no `shot` writes one shot at the end. Every shot is checked for paint: a capture with
// almost no ink over the background is reported as BLANK and fails the run (a blank frame means the
// bundle did not boot or the canvas was never drawn, never a visual nit).
//
// The canvas is 480x272; the page scales it to 960x544. Shots are cropped to the canvas.
import { mkdirSync, rmSync } from "node:fs";
import { basename, join, resolve } from "node:path";
import { HeadlessChrome } from "../src/internal/pocket-build.ts";
import { serveReader } from "./web/serve.ts";

const BTN = {
  select: 0x0001,
  start: 0x0008,
  up: 0x0010,
  right: 0x0020,
  down: 0x0040,
  left: 0x0080,
  ltrig: 0x0100,
  rtrig: 0x0200,
  triangle: 0x1000,
  circle: 0x2000,
  cross: 0x4000,
  square: 0x8000,
  press: 0x2000,
} as const;

type Step = keyof typeof BTN | "wait" | "shot" | string;

function parseArgs(argv: string[]): Map<string, string> {
  const out = new Map<string, string>();
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (!arg.startsWith("--")) continue;
    out.set(arg.slice(2), argv[i + 1] ?? "");
    i += 1;
  }
  return out;
}

const args = parseArgs(process.argv.slice(2));
const ROOT = resolve(import.meta.dir, "..");
const js = resolve(ROOT, args.get("js") ?? "dist/todo.js");
const pak = resolve(ROOT, args.get("pak") ?? "dist/todo.pak");
const out = resolve(ROOT, args.get("out") ?? "dist/shots/" + basename(js, ".js"));
const gap = Number(args.get("gap") ?? 300);
const script = (args.get("script-file")
  ? (await Bun.file(resolve(ROOT, args.get("script-file") ?? "")).text())
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#"))
  : (args.get("script") ?? "").split(",")
)
  .map((s) => s.trim())
  .filter(Boolean) as Step[];

mkdirSync(out, { recursive: true });
const server = serveReader({ js, pak }, 0);
const profile = join(out, "chrome-profile");
rmSync(profile, { recursive: true, force: true });
const chrome = await HeadlessChrome.start({ port: Number(args.get("port") ?? 9444), profile, timeoutMs: 20000 });
let failed = false;
let shotCount = 0;

/** Share of canvas pixels that differ from the top-left pixel: a blank frame is near zero. */
const INK = `(() => {
  const canvas = document.querySelector('#screen');
  const ctx = canvas.getContext('2d');
  const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const r0 = data[0], g0 = data[1], b0 = data[2];
  let ink = 0;
  for (let i = 0; i < data.length; i += 4) {
    if (Math.abs(data[i] - r0) + Math.abs(data[i + 1] - g0) + Math.abs(data[i + 2] - b0) > 24) ink++;
  }
  return ink / (canvas.width * canvas.height);
})()`;

try {
  await chrome.viewport(1100, 760);
  await chrome.navigate(server.url);
  for (let i = 0; i < 100 && !(await chrome.evaluate("!!window.__ready")); i++) await Bun.sleep(100);
  await Bun.sleep(500);
  const rect = await chrome.evaluate(
    "(() => { const r = document.querySelector('#screen').getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height }; })()",
  );

  const tap = async (bit: number) => {
    await chrome.evaluate("window.__host.press(" + bit + ", true)");
    await Bun.sleep(60);
    await chrome.evaluate("window.__host.press(" + bit + ", false)");
    await Bun.sleep(gap);
  };

  const shoot = async (label: string) => {
    shotCount += 1;
    const file = join(out, String(shotCount).padStart(2, "0") + "-" + label + ".png");
    const ink = Number(await chrome.evaluate(INK));
    await Bun.write(file, await chrome.screenshot(rect));
    const blank = !(ink > 0.01);
    if (blank) failed = true;
    console.log((blank ? "BLANK " : "shot  ") + label + "  ink=" + (ink * 100).toFixed(1) + "%  -> " + file);
  };

  /** Every text the app draws this frame, in drawing order. */
  const drawn = async (): Promise<string[]> => {
    await chrome.evaluate("globalThis.ui.captureTexts(0, 0)");
    await Bun.sleep(120);
    const raw: string = await chrome.evaluate("globalThis.ui.capturedTexts(0)");
    return raw.split("\n").filter(Boolean).map((line) => line.split("\t")[1] ?? "");
  };

  const KEYS: Record<string, { key: string; code: string; vk: number }> = {
    Enter: { key: "Enter", code: "Enter", vk: 13 },
    Backspace: { key: "Backspace", code: "Backspace", vk: 8 },
    Escape: { key: "Escape", code: "Escape", vk: 27 },
    Tab: { key: "Tab", code: "Tab", vk: 9 },
    Delete: { key: "Delete", code: "Delete", vk: 46 },
    ArrowUp: { key: "ArrowUp", code: "ArrowUp", vk: 38 },
    ArrowDown: { key: "ArrowDown", code: "ArrowDown", vk: 40 },
    ArrowLeft: { key: "ArrowLeft", code: "ArrowLeft", vk: 37 },
    ArrowRight: { key: "ArrowRight", code: "ArrowRight", vk: 39 },
  };

  /** One raw key, the way the host page's keyboard handler reads it. */
  const key = async (name: string) => {
    const spec = KEYS[name];
    if (!spec) throw new Error("unknown key " + name);
    await chrome.send("Input.dispatchKeyEvent", {
      type: "rawKeyDown",
      key: spec.key,
      code: spec.code,
      windowsVirtualKeyCode: spec.vk,
      nativeVirtualKeyCode: spec.vk,
    });
    await Bun.sleep(40);
    await chrome.send("Input.dispatchKeyEvent", {
      type: "keyUp",
      key: spec.key,
      code: spec.code,
      windowsVirtualKeyCode: spec.vk,
      nativeVirtualKeyCode: spec.vk,
    });
    await Bun.sleep(gap);
  };

  /** Physical typing: one key event per character, so a printable key reaches the guest field. */
  const type = async (text: string) => {
    for (const ch of text) {
      await chrome.send("Input.dispatchKeyEvent", { type: "keyDown", text: ch, unmodifiedText: ch, key: ch });
      await Bun.sleep(25);
      await chrome.send("Input.dispatchKeyEvent", { type: "keyUp", key: ch });
      await Bun.sleep(25);
    }
    await Bun.sleep(gap);
  };

  const expect = async (want: string, present = true) => {
    const texts = await drawn();
    const found = texts.some((line) => line.includes(want));
    const ok = present ? found : !found;
    if (!ok) {
      failed = true;
      console.log((present ? "MISSING " : "STILL THERE ") + "\"" + want + "\"  drawn: " + JSON.stringify(texts));
    } else {
      console.log("ok      " + (present ? "" : "gone ") + "\"" + want + "\"");
    }
  };

  const scripted = script.filter(
    (step) => step !== "wait" && step !== "shot" && step !== "texts" && !step.startsWith("expect:") && !step.startsWith("type:") && !step.startsWith("key:"),
  );
  for (const step of script) {
    if (step === "wait") await Bun.sleep(gap);
    else if (step === "shot") await shoot("step");
    else if (step === "texts") console.log(JSON.stringify(await drawn()));
    else if (step.startsWith("expect:")) await expect(step.slice(7));
    else if (step.startsWith("absent:")) await expect(step.slice(7), false);
    else if (step.startsWith("type:")) await type(step.slice(5));
    else if (step.startsWith("key:")) await key(step.slice(4));
    else if (step === "reload") {
      await chrome.navigate(server.url);
      for (let i = 0; i < 100 && !(await chrome.evaluate("!!window.__ready")); i++) await Bun.sleep(100);
      await Bun.sleep(500);
    }
    else await tap(BTN[step as keyof typeof BTN]);
  }
  if (!script.includes("shot")) await shoot(scripted.length ? scripted.join("-").replace(/[^a-zA-Z0-9]+/g, "-") : "start");
} finally {
  chrome.stop?.();
  server.stop();
}
process.exit(failed ? 1 : 0);
