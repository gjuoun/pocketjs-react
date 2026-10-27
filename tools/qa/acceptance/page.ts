// Gallery page pass: the real gallery entry (test/fixtures/shadcn-gallery/main.tsx) mounted in-process, pressed DOWN
// through every snap. Each section is judged once, at the first snap where its whole frame is on screen: gate 1
// over its text runs, gate 2 over its subtree, gate 3 over its rows. Gate 4 is per component (run.ts), not here.
import { join } from "node:path";
import { BTN } from "@pocketjs/framework/input";
import { rootMirror, type NodeMirror } from "../../../src/internal/pocket.ts";
import { compileClasses } from "../../../src/internal/pocket-build.ts";
import { installBuildStyles } from "../../../src/style/build-styles.ts";
import { bootCore } from "../../../test/harness.ts";
import { SECTIONS, VIEW_H } from "../../../test/fixtures/shadcn-gallery/layout.ts";
import { build } from "../../build.ts";
import { checkAlignment, type AlignmentReport } from "./alignment.ts";
import { geometryFor, isText, type Rect, walk } from "./geometry.ts";
import { judgeLegibility, type LegibilityReport } from "./gates.ts";
import { checkOverflow, type OverflowReport } from "./overflow.ts";
import { settle } from "./interaction.ts";
import { type Box, SCREEN_W } from "./legibility.ts";

const ROOT = join(import.meta.dir, "../../..");
const ENTRY = join(ROOT, "test/fixtures/shadcn-gallery/main.tsx");
const OUT = join(ROOT, "dist/qa/gallery-" + (process.env.POCKETJS_CORE_ROOT ? "overlay" : "stock"));

export interface SectionPage {
  name: string;
  judged: boolean;
  g1: LegibilityReport | null;
  g2: OverflowReport | null;
  g3: AlignmentReport | null;
}
export interface PageReport {
  channel: "overlay" | "stock";
  snaps: number;
  sections: SectionPage[];
}

/** The Frame of a section: the ancestor of its title text whose box is the section's height and the screen width. */
function frameOf(title: NodeMirror, h: number, geo: ReturnType<typeof geometryFor>): NodeMirror | null {
  let p: NodeMirror | undefined = title.parent ?? undefined;
  for (let k = 0; p && k < 6; k++, p = p.parent ?? undefined) {
    const r = geo.rect(p);
    if (r && r.h === h && r.w === SCREEN_W) return p;
  }
  return null;
}

export async function judgePage(): Promise<PageReport> {
  const built = await build(ENTRY, { outdir: OUT, name: "shadcn-gallery-qa" });
  const core = await bootCore({ classes: built.tokens, fontSlots: built.fontSlots });
  installBuildStyles({}, compileClasses([]).bin, built.tokens);
  await import(ENTRY);
  core.step(0);
  core.step(0);
  core.render();
  const geo = geometryFor(core);
  const N = SECTIONS.length;
  const titles = new Map<string, NodeMirror>();
  walk(rootMirror, (n) => {
    if (isText(n)) titles.set((n as unknown as { text: string }).text, n);
  });
  const frames: (NodeMirror | null)[] = SECTIONS.map((s, i) => {
    const t = titles.get(String(i + 1).padStart(2, "0") + "/" + N + " " + s.name);
    return t ? frameOf(t, s.h, geo) : null;
  });
  const pages: SectionPage[] = SECTIONS.map((s) => ({ name: s.name, judged: false, g1: null, g2: null, g3: null }));
  let snaps = 0;
  for (let press = 0; press <= N + 5; press++) {
    snaps++;
    for (let i = 0; i < N; i++) {
      const f = frames[i];
      if (!f || pages[i].judged) continue;
      const r = geo.rect(f) as Rect | null;
      if (!r || r.y < 0 || r.y + r.h > VIEW_H) continue;
      settle(core);
      const box: Box = { x: r.x, y: r.y, w: r.w, h: r.h };
      pages[i] = {
        name: SECTIONS[i].name,
        judged: true,
        g1: judgeLegibility(core, f, geo, box),
        g2: checkOverflow(f, geo),
        g3: checkAlignment(f, geo),
      };
    }
    if (pages.every((p) => p.judged)) break;
    core.press(BTN.DOWN);
  }
  return { channel: geo.channel, snaps, sections: pages };
}
