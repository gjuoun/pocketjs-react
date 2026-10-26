// Native Switch (batch 3), shaped like Radix's Switch namespace so the vendored shadcn switch imports it unchanged.
// Root is a Pressable holding the checked state (controlled or defaultChecked); a press flips it. The Thumb is
// placed by the Root's flex justification (justify-end when checked): the core has no translate, so the thumb
// moves by the row's own layout. The unchecked track is slate-200 (the vendored source has no unchecked fill).
import { createContext, type ReactNode, useContext } from "react";
import { View } from "../elements.ts";
import { cn } from "../style/cn.ts";
import { Pressable } from "./press.tsx";
import { useControllableState } from "./state.ts";

const OnContext = createContext<boolean>(false);

export interface RootProps {
  checked?: boolean;
  defaultChecked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
  children?: ReactNode;
  [prop: `data-${string}`]: unknown;
}

export function Root(props: RootProps) {
  const [on, setOn] = useControllableState(props.checked, props.defaultChecked ?? false, props.onCheckedChange);
  return (
    <OnContext.Provider value={on}>
      <Pressable
        className={cn("flex items-center", on ? "justify-end" : "justify-start bg-slate-200", props.className)}
        disabled={props.disabled}
        dataState={on ? "checked" : "unchecked"}
        dataProps={{ "data-size": props["data-size"] as string | undefined }}
        onPress={() => setOn(!on)}
      >
        {props.children}
      </Pressable>
    </OnContext.Provider>
  );
}

export interface ThumbProps {
  className?: string;
  [prop: `data-${string}`]: unknown;
}

/** The knob. Its size is the primitive's (14 px inside the 18 px track); the caller's classes apply on top. */
export function Thumb(props: ThumbProps) {
  const on = useContext(OnContext);
  return (
    <View className={cn("w-[14px] h-[14px]", props.className)} {...{ "data-state": on ? "checked" : "unchecked" }} />
  );
}
