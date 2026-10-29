// Collapsible: a trigger that shows or hides a region. The region mounts on open and unmounts on close, so both edges are
// instant (the batch-2 ruling: no panel animation); the trigger's chevron turns 0 (right) to 90 (down) through the core's
// layout transition. CIRCLE on the trigger toggles it. Controlled: open and onOpenChange(open); or defaultOpen.
import { createContext, type ReactNode, useContext } from "react";
import { Text, View } from "../elements.ts";
import { useControllableState } from "../primitives/state.ts";
import { Chevron } from "./chevron.tsx";
import { Focusable } from "./focusable.tsx";
import { useTokens } from "./theme.tsx";

interface CollapsibleContextValue {
  open: boolean;
  setOpen: (open: boolean) => void;
}
const Ctx = createContext<CollapsibleContextValue | null>(null);

function useCollapsible(part: string): CollapsibleContextValue {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("pocketjs-react native: " + part + " must be used inside <Collapsible>");
  return ctx;
}

export interface CollapsibleProps {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  children?: ReactNode;
}

export function Collapsible(props: CollapsibleProps) {
  const [open, setOpen] = useControllableState(props.open, props.defaultOpen ?? false, props.onOpenChange);
  return <Ctx.Provider value={{ open, setOpen }}>{props.children}</Ctx.Provider>;
}

export function CollapsibleTrigger(props: { children?: string; onPress?: () => void }) {
  const T = useTokens() as Record<string, string>;
  const ctx = useCollapsible("CollapsibleTrigger");
  const look = [T["collapsible.trigger"], T["collapsible.focus"], T["collapsible.press"]].join(" ");
  return (
    <Focusable look={look} debugName="collapsible-trigger" onPress={() => { props.onPress?.(); ctx.setOpen(!ctx.open); }}>
      <Text className={T["collapsible.trigger.text"]}>{props.children}</Text>
      <Chevron turn={ctx.open ? 90 : 0} />
    </Focusable>
  );
}

/** The region: mounted only while the collapsible is open, so a close removes it in one commit. */
export function CollapsibleContent(props: { children?: ReactNode }) {
  const T = useTokens() as Record<string, string>;
  const ctx = useCollapsible("CollapsibleContent");
  if (!ctx.open) return null;
  return <View className={T["collapsible.content"]} debugName="collapsible-content">{props.children}</View>;
}
