// The ascii-anim demo: a 40x18 monospace plasma redrawn every host frame. Proves that a
// character grid plus the frame pump is enough for a 2D game on this stack.
//
// CROSS pauses (the field freezes on a PAUSED panel); CROSS or CIRCLE restarts from frame 0.
// ASCII only: the default atlas is ASCII 32..126, so the demo needs no extra glyphs.
import { useRef, useState } from "react";
import { BTN, Text, useButton, useFrame, View } from "pocketjs-react";
import { ADVANCE, COLS, PITCH, plasma, ROWS } from "./plasma.ts";

/** Frames of virtual time per animation step: one cell of travel every ~8 frames. */
const SPEED = 0.12;

const now = typeof performance !== "undefined" && performance.now ? () => performance.now() : () => 0;

interface Scene {
  running: boolean;
  frame: number;
  rows: string[];
  /** Smoothed guest cost of one field, measured at the computer's clock — display only. */
  ms: number;
}

const start = (): Scene => ({ running: true, frame: 0, rows: plasma(0), ms: 0 });

export function App() {
  const [scene, setScene] = useState<Scene>(start);
  const latest = useRef(scene);
  latest.current = scene;

  // The scene owns its clock, so a restart really starts at frame 0 (the hook's counter
  // keeps counting for the life of the component).
  useFrame(() => {
    const s = latest.current;
    if (!s.running) return;
    const t0 = now();
    const rows = plasma((s.frame + 1) * SPEED);
    const ms = now() - t0;
    const smoothed = s.ms === 0 ? ms : s.ms * 0.9 + ms * 0.1;
    setScene({ running: true, frame: s.frame + 1, rows, ms: smoothed });
  });

  useButton(BTN.CROSS, () => setScene((s) => (s.running ? { ...s, running: false } : start())));
  useButton(BTN.CIRCLE, () => setScene((s) => (s.running ? s : start())));

  const head = scene.running
    ? "PLASMA " + COLS + "x" + ROWS + "  FRAME " + String(scene.frame).padStart(6, "0") + "  FIELD " + scene.ms.toFixed(2) + "ms"
    : "== PAUSED ==  FRAME " + String(scene.frame).padStart(6, "0") + "  X/CIRCLE: RESTART";

  return (
    <View className="w-full h-full flex-col items-center justify-center bg-black">
      <View className="flex-col" style={{ width: COLS * ADVANCE }}>
        <Text className={scene.running ? "text-xs font-mono text-cyan-300" : "text-xs font-mono text-red-400"} style={{ height: PITCH }}>
          {head}
        </Text>
        {scene.rows.map((row, i) => (
          <Text key={i} className={scene.running ? "text-xs font-mono text-emerald-300" : "text-xs font-mono text-slate-500"} style={{ height: PITCH }}>
            {row}
          </Text>
        ))}
        <Text className="text-xs font-mono text-slate-400" style={{ height: PITCH }}>
          {scene.running ? "X: EXIT   O: RESTART   GRID " + COLS + "x" + ROWS : "FROZEN AT FRAME " + scene.frame}
        </Text>
      </View>
    </View>
  );
}
