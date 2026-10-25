// The primitives own their surface (F4): shadcn's bg-* tokens and the full-width class the
// vendored content carries are dropped from the caller's classes, then the primitive's own panel
// classes are merged in. A caller's explicit width still wins (cn keeps the last conflict).

export function ownSurface(className: string | undefined): string {
  return (className ?? "")
    .split(/\s+/)
    .filter((token) => token !== "" && !token.startsWith("bg-") && token !== "w-full")
    .join(" ");
}
