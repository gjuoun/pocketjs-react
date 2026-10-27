// Toast: a queue of short messages drawn by a Toaster in the overlay layer, outside the page flow (it moves nothing on the page).
// toast(text, { frames }) adds a message. The Toaster shows at most `limit` at once (default 3); the rest wait, in order. A shown
// message is dismissed after `frames` frames (default 180: 3 s at 60 Hz), counted once per frame on the frame pump, not on the
// wall clock; dismissing one shows the next waiting message. The Toaster takes no focus and registers no pointer dismissal, so
// it is not a layer and a tap on the page passes through it.
import { useEffect, useState } from "react";
import { Text, View } from "../elements.ts";
import { reconciler } from "../renderer/host-config.ts";
import { getOverlayLayer } from "../renderer/mount.ts";
import { useFrame } from "../renderer/use-frame.ts";
import { useTokens } from "./theme.tsx";

/** Frames a message stays up: 3 s at 60 Hz. */
export const DEFAULT_TOAST_FRAMES = 180;
const DEFAULT_LIMIT = 3;

interface Entry {
  id: number;
  text: string;
  /** Frames left before the message is dismissed. */
  left: number;
}

let nextId = 1;
let limit = DEFAULT_LIMIT;
let shown: Entry[] = [];
let waiting: Entry[] = [];
const subscribers = new Set<() => void>();

function emit(): void {
  for (const s of subscribers) s();
}

/** Shows a message now when there is room under the limit, else queues it. Returns its id. */
export function toast(text: string, options: { frames?: number } = {}): number {
  const entry: Entry = { id: nextId++, text, left: Math.max(1, Math.floor(options.frames ?? DEFAULT_TOAST_FRAMES)) };
  if (shown.length < limit) shown = [...shown, entry];
  else waiting = [...waiting, entry];
  emit();
  return entry.id;
}

/** One frame: count every shown message down, dismiss the spent ones, and promote waiting ones into the room. */
export function tickToasts(): boolean {
  for (const e of shown) e.left -= 1;
  const kept = shown.filter((e) => e.left > 0);
  let changed = kept.length !== shown.length;
  shown = kept;
  while (shown.length < limit && waiting.length > 0) {
    shown = [...shown, waiting[0]];
    waiting = waiting.slice(1);
    changed = true;
  }
  if (changed) emit();
  return changed;
}

/** The messages on screen and waiting, for tests and for the judge's reads. */
export function toastState(): { shown: string[]; waiting: string[] } {
  return { shown: shown.map((e) => e.text), waiting: waiting.map((e) => e.text) };
}

/** Empties the queue and the count of ids: a fresh start for a new app or test. */
export function clearToasts(): void {
  shown = [];
  waiting = [];
  nextId = 1;
  emit();
}

export interface ToasterProps {
  /** Most messages on screen at once (default 3). */
  limit?: number;
}

/** The host: draws the shown messages at the bottom of the overlay layer. Mount one per app: each mounted Toaster counts the frames, so a second one would dismiss twice as fast. */
export function Toaster(props: ToasterProps) {
  const T = useTokens() as Record<string, string>;
  const [, redraw] = useState(0);
  const want = props.limit ?? DEFAULT_LIMIT;
  limit = want;
  useEffect(() => {
    const sub = () => redraw((n) => n + 1);
    subscribers.add(sub);
    return () => { subscribers.delete(sub); };
  }, []);
  useFrame(() => { tickToasts(); });
  const host = (
    <View className={T["toast.host"]} debugName="toaster">
      {shown.map((e) => (
        <View key={e.id} className={T["toast.item"]} debugName={"toast-" + e.id}>
          <Text className={T["toast.text"]}>{e.text}</Text>
        </View>
      ))}
    </View>
  );
  return reconciler.createPortal(host, getOverlayLayer(), null) as never;
}
