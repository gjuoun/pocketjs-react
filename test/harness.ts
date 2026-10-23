// Test harness: the real PocketJS wasm core (the same pocketjs.wasm the browser host runs)
// inside Bun. Boots a fresh core, installs it as globalThis.ui, steps frames and reads back
// what the core drew: text runs with their rects, and framebuffer pixels.

import { detectHost, installHost } from "@pocketjs/framework/host";
import {
  registerStyles,
  resetRendererState,
  resetStyles,
  resolveStyle,
  setInputRoot,
  setStyleResolver,
} from "../src/internal/pocket.ts";
import {
  bakeAtlases,
  compileClasses,
  createWasmUi,
  FB_W,
  FRAMEWORK_ROOT,
} from "../src/internal/pocket-build.ts";

export interface TextRun {
  x: number;
  y: number;
  w: number;
  h: number;
  text: string;
}

let wasmBytes: ArrayBuffer | undefined;
const fontCache = new Map<number, Uint8Array>();

async function wasm(): Promise<ArrayBuffer> {
  return (wasmBytes ??= await Bun.file(
    FRAMEWORK_ROOT + "hosts/web/pocketjs.wasm",
  ).arrayBuffer());
}

/**
 * Boot a fresh core. With a pak (a built app), the app's own mount loads it. Without one,
 * `classes` are compiled by PocketJS's Tailwind compiler into a style table and the font
 * slots they use are baked, so raw native-tree nodes can be styled and drawn.
 */
export async function bootCore(
  opts: { pak?: ArrayBuffer; classes?: string[] } = {},
) {
  const core = await createWasmUi(await wasm());
  const ops = core.ops as Record<string, any>;
  const g = globalThis as Record<string, unknown>;
  resetRendererState();
  resetStyles();
  setInputRoot(null);
  g.frame = undefined;
  g.ui = ops;
  if (opts.pak) g.__pak = opts.pak;
  else {
    delete g.__pak;
    const styles = compileClasses(opts.classes ?? []);
    ops.loadStyles(styles.bin);
    for (const slot of styles.usedFontSlots) {
      if (!fontCache.has(slot)) {
        const [atlas] = await bakeAtlases({
          codepoints: new Set<number>(),
          slots: [slot],
          extraChars: "",
          rasterDensity: 1,
        });
        fontCache.set(slot, atlas.bytes as Uint8Array);
      }
      ops.loadFontAtlas(fontCache.get(slot));
    }
    installHost(detectHost(ops as never));
    registerStyles(styles.ids);
    setStyleResolver(resolveStyle);
  }
  let fb: Uint8Array = new Uint8Array(0);
  return {
    ops,
    /** One frame: the guest's frame(buttons) when mounted, then the core tick (layout, anims). */
    step(buttons = 0) {
      const frame = g.frame as ((b: number) => void) | undefined;
      if (frame) frame(buttons);
      core.tick();
    },
    /** Press and release a button bitmask, settling a few frames after each edge. */
    press(buttons: number, settle = 2) {
      this.step(buttons);
      for (let i = 0; i < settle; i++) this.step(buttons);
      this.step(0);
      for (let i = 0; i < settle; i++) this.step(0);
    },
    /** Text runs the core drew on the next render. */
    texts(): TextRun[] {
      ops.captureTexts(0, 0);
      fb = core.render();
      return String(ops.capturedTexts(0) ?? "")
        .split("\n")
        .filter(Boolean)
        .map((line) => {
          const [rect, text] = line.split("\t");
          const [x, y, w, h] = rect.split(",").map(Number);
          return { x, y, w, h, text };
        });
    },
    /** Framebuffer pixel as #rrggbb (from the last texts()/render call). */
    pixel(x: number, y: number): string {
      if (fb.length === 0) fb = core.render();
      const i = (y * FB_W + x) * 4;
      return (
        "#" +
        [fb[i], fb[i + 1], fb[i + 2]]
          .map((v) => v.toString(16).padStart(2, "0"))
          .join("")
      );
    },
    render() {
      fb = core.render();
    },
    dispose() {
      resetRendererState();
      setInputRoot(null);
      delete g.ui;
      delete g.__pak;
      g.frame = undefined;
    },
  };
}

export type Core = Awaited<ReturnType<typeof bootCore>>;
/** Boot a fresh core with a built app's pak and evaluate its bundle (which mounts the app). */
export async function bootApp(built: {
  js: string;
  pak: string;
}): Promise<Core> {
  const core = await bootCore({ pak: await Bun.file(built.pak).arrayBuffer() });
  (0, eval)(await Bun.file(built.js).text());
  core.step(0);
  return core;
}
