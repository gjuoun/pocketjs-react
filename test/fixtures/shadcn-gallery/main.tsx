// Entry for the shadcn gallery: all 61 vendored components on one scrollable page.
// Built by tools/build.ts (`--name=shadcn-gallery`) and mounted like any app.
//
// Scroll: the content column is moved with a negative marginTop from React state (ScrollArea cannot scroll on the
// pinned core: its range is 0). DOWN and UP snap to the next or previous section top; the last section ends at the
// bottom. Every section stays mounted (a body mounted late does not draw on this core); the sections off screen
// are display:none inside their fixed-height slots, so the column keeps its length. Each body is guarded, so one
// throwing component cannot blank the page.
import { BTN, mount, useButton, View } from "pocketjs-react";
import { useState } from "react";
import { Frame } from "./frame.tsx";
import {
  MAX_OFFSET,
  nextTop,
  prevTop,
  SECTIONS,
  TOPS,
  VIEW_H,
} from "./layout.ts";
import { BODIES } from "./sections.tsx";

/** Sections [lo, hi] shown for an offset: the ones the screen shows, plus one each side. */
function shownRange(off: number): [number, number] {
  let first = 0;
  for (let i = 0; i < SECTIONS.length; i++) if (TOPS[i] <= off) first = i;
  let last = first;
  while (last + 1 < SECTIONS.length && TOPS[last + 1] < off + VIEW_H) last++;
  return [Math.max(0, first - 1), Math.min(SECTIONS.length - 1, last + 1)];
}

function Gallery() {
  const [off, setOff] = useState(0);
  useButton(BTN.DOWN, () => setOff((o) => nextTop(o)));
  useButton(BTN.UP, () => setOff((o) => prevTop(o)));
  const [lo, hi] = shownRange(off);
  return (
    <View className="w-full h-full flex-col overflow-hidden bg-slate-100">
      <View
        className="w-full flex-col"
        style={{ marginTop: -Math.min(off, MAX_OFFSET) }}
      >
        {SECTIONS.map((s, i) => {
          const Body = BODIES[s.name];
          return (
            <View key={s.name} className="w-full" style={{ height: s.h }}>
              <Frame
                index={i}
                total={SECTIONS.length}
                name={s.name}
                h={s.h}
                hidden={i < lo || i > hi}
              >
                <Body />
              </Frame>
            </View>
          );
        })}
      </View>
    </View>
  );
}

mount(<Gallery />, { compat: { classMiss: "drop" } });
