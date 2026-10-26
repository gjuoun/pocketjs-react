// Native Toggle (batch 3), shaped like Radix's Toggle namespace so the vendored shadcn toggle imports it unchanged.
// Root is one Pressable holding `pressed` (controlled, or defaultPressed); a press flips it and reports
// onPressedChange. Its state is data-state on|off, which the vendored variant classes select.
import type { ReactNode } from "react";
import { controlSurface, Pressable, plainLabel } from "./press.tsx";
import { useControllableState } from "./state.ts";

export interface RootProps {
  pressed?: boolean;
  defaultPressed?: boolean;
  onPressedChange?: (pressed: boolean) => void;
  disabled?: boolean;
  className?: string;
  children?: ReactNode;
  [prop: `data-${string}`]: unknown;
}

export function Root(props: RootProps) {
  const [pressed, setPressed] = useControllableState(props.pressed, props.defaultPressed ?? false, props.onPressedChange);
  return (
    <Pressable
      className={controlSurface(pressed, props.className, "bg-transparent")}
      disabled={props.disabled}
      dataState={pressed ? "on" : "off"}
      onPress={() => setPressed(!pressed)}
    >
      {plainLabel(props.children)}
    </Pressable>
  );
}
