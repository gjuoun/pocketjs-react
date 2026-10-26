// Native Direction (batch 3), shaped like Radix's Direction namespace so the vendored shadcn direction wrapper imports
// it unchanged. The provider carries the reading direction down the tree and useDirection reads it; nothing mirrors
// yet (RTL layout is parked), so the value is only reported.
import { createContext, type ReactNode, useContext } from "react";

export type Dir = "ltr" | "rtl";
const DirectionContext = createContext<Dir>("ltr");

export function DirectionProvider(props: { dir?: Dir; children?: ReactNode }) {
  const outer = useContext(DirectionContext);
  return <DirectionContext.Provider value={props.dir ?? outer}>{props.children}</DirectionContext.Provider>;
}

/** The local direction when given, else the nearest provider's, else ltr. */
export function useDirection(local?: Dir): Dir {
  const ctx = useContext(DirectionContext);
  return local ?? ctx;
}
