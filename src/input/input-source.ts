// Which keyboard typed last: the physical keyboard (keys the host routes into the text seam) or the on-screen keyboard
// (a pointer or pad summon of a field, and the OSK's own keys). The entry points set it; a field reads it through
// keyboardMode() in text-field.ts to decide whether its panel shows. Pure: no DOM, no React, no field state.

export type InputSource = "physical" | "onscreen";

let current: InputSource = "onscreen";
const listeners = new Set<() => void>();

/** The source of the last input. */
export function inputSource(): InputSource {
  return current;
}

/** Record the source of an input. Listeners run only when the value changes. */
export function setInputSource(source: InputSource): void {
  if (current === source) return;
  current = source;
  for (const listener of [...listeners]) listener();
}

/** Called when the source changes. Returns the teardown. */
export function subscribeInputSource(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Back to the default (a fresh page or mount starts with no physical typing). */
export function resetInputSource(): void {
  setInputSource("onscreen");
}
