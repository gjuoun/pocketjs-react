// The icon variant vocabulary, shared by the build bake (tools/icon-bake.ts) and the runtime
// (src/primitives/glyph-icons.tsx, src/style/icon-colour.ts). Runtime-safe: no build-time imports.

/** Colour variants: the three text colours the shadcn surfaces resolve to (src/compat/tokens.ts). */
export const ICON_COLOURS = {
  "slate-900": "#0f172a",
  "slate-500": "#64748b",
  white: "#ffffff",
} as const;
export type IconColour = keyof typeof ICON_COLOURS;
export const ICON_COLOUR_NAMES = Object.keys(ICON_COLOURS) as IconColour[];

/** `icon.<name>.<px>.<colour>`: the registry name of one baked variant (its pak key is `ui:img.` + this). */
export function iconName(name: string, px: number, colour: IconColour): string {
  return `icon.${name}.${px}.${colour}`;
}

/** Parses a variant name back into [name, px, colour]; anything else does not match. */
export const ICON_NAME = /^icon\.([a-z-]+)\.(\d+)\.(slate-900|slate-500|white)$/;
