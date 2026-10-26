// Node geometry for the gates. Two channels, one shape: overlay (nodeRect: the untrimmed root-space border box,
// one call per node) when the core has it; otherwise stock (debugInspect + debugRectXY/WH: the paint's world box,
// clipped to the screen but not to overflow ancestors). The channel is recorded in every report.
import type { NodeMirror } from "../../../src/internal/pocket.ts";
import { classOf } from "../../../src/style/class-runtime.ts";
import type { Core } from "../../../test/harness.ts";
import type { Box } from "./legibility.ts";

export interface Rect extends Box {
  /** True on the stock channel: the box is the screen-clipped world box, so its edges may hide overflow. */
  screenClipped: boolean;
}
export interface Geometry {
  channel: "overlay" | "stock";
  rect(node: NodeMirror): Rect | null;
}

export function geometryFor(core: Core): Geometry {
  const ops = core.ops as Record<string, any>;
  if (typeof ops.nodeRect === "function") {
    return {
      channel: "overlay",
      rect(node) {
        const r = ops.nodeRect(node.id) as Box | null;
        return r ? { x: r.x, y: r.y, w: r.w, h: r.h, screenClipped: false } : null;
      },
    };
  }
  return {
    channel: "stock",
    rect(node) {
      ops.debugInspect(node.id);
      core.render();
      const xy = ops.debugRectXY() as number;
      const wh = ops.debugRectWH() as number;
      ops.debugInspect(0);
      if (xy === -1) return null;
      return { x: (xy << 16) >> 16, y: xy >> 16, w: wh & 0xffff, h: wh >>> 16, screenClipped: true };
    },
  };
}

/** Element nodes carry no text; text mirrors carry the string. */
export const isText = (n: NodeMirror): boolean => typeof (n as { text?: unknown }).text === "string";

/** Visit every node, root first, with its ancestors (root..parent). */
export function walk(root: NodeMirror, visit: (n: NodeMirror, ancestors: NodeMirror[]) => void, ancestors: NodeMirror[] = []): void {
  visit(root, ancestors);
  for (const k of root.children) walk(k, visit, [...ancestors, root]);
}

export interface ClipAxes {
  /** Overflow clips this axis (children may not extend past the box). */
  clipX: boolean;
  clipY: boolean;
  /** Overflow scrolls this axis (children may extend; the gate exempts that axis). */
  scrollX: boolean;
  scrollY: boolean;
}

const NONE: ClipAxes = { clipX: false, clipY: false, scrollX: false, scrollY: false };

/** The clipping and scrolling axes of an element's overflow class (raw class string). */
export function clipAxes(cls: string): ClipAxes {
  const t = cls.split(/\s+/);
  const has = (name: string) => t.includes(name);
  const out = { ...NONE };
  if (has("overflow-hidden")) { out.clipX = true; out.clipY = true; }
  if (has("overflow-x-hidden")) out.clipX = true;
  if (has("overflow-y-hidden")) out.clipY = true;
  if (has("overflow-auto") || has("overflow-scroll")) { out.scrollX = true; out.scrollY = true; }
  if (has("overflow-x-auto") || has("overflow-x-scroll")) out.scrollX = true;
  if (has("overflow-y-auto") || has("overflow-y-scroll")) out.scrollY = true;
  return out;
}

/** Overflow classes on an element, as the gates see them (classOf on the mirror). */
export const overflowOf = (n: NodeMirror): ClipAxes => clipAxes(classOf(n));
