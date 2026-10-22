// Han text and font weights: the reader's CJK build bakes hanzi into the regular body slots only
// (bold slots would double the pak), so a Han string drawn bold would show placeholder boxes.
const HAN = /\p{Script=Han}/u;

export function hasHan(text: string): boolean {
  return HAN.test(text);
}

/** `className` without `font-bold` when `text` has Han characters, so it draws in a regular slot. */
export function cjkSafe(className: string, text: string): string {
  if (!HAN.test(text)) return className;
  return className.split(/\s+/).filter((token) => token && token !== "font-bold").join(" ");
}
