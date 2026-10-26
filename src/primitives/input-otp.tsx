// input-otp shim (batch 4, R9): OTPInput and OTPInputContext on the native TextField. The field holds the code; the context
// gives each slot its character, whether it is the active slot (the first empty one, or the last when full) and a fake caret.
// The vendored shadcn file draws the slots itself. Named boundary: the `render` prop of input-otp is not supported (use the
// slot components with children).
import { type ReactNode, createContext, useContext } from "react";
import { View } from "../elements.ts";
import { TextField } from "../input/TextField.tsx";
import { cn } from "../style/cn.ts";
import { useControllableState } from "./state.ts";

export interface OTPSlot {
  char: string | null;
  hasFakeCaret: boolean;
  isActive: boolean;
}

export const OTPInputContext = createContext<{ slots: OTPSlot[] } | null>(null);

export interface OTPInputProps {
  maxLength: number;
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  onComplete?: (value: string) => void;
  disabled?: boolean;
  containerClassName?: string;
  className?: string;
  render?: unknown;
  children?: ReactNode;
}

export function OTPInput(props: OTPInputProps) {
  if (props.render !== undefined)
    throw new Error(
      "pocketjs-react: input-otp render prop is not supported (use the slot components as children)",
    );
  const [value, setValue] = useControllableState(
    props.value,
    props.defaultValue ?? "",
    props.onChange,
  );
  const active = Math.min(value.length, props.maxLength - 1);
  const slots: OTPSlot[] = Array.from({ length: props.maxLength }, (_, i) => ({
    char: value[i] ?? null,
    hasFakeCaret: i === active,
    isActive: i === active,
  }));
  return (
    <OTPInputContext.Provider value={{ slots }}>
      <View className={cn("relative", props.containerClassName)}>
        <TextField
          value={value}
          maxLength={props.maxLength}
          className={cn(
            "absolute top-0 left-0 w-full h-full opacity-0",
            props.className,
          )}
          onChange={(e) => {
            const next = String(e.target.value ?? "").slice(0, props.maxLength);
            setValue(next);
            if (next.length === props.maxLength) props.onComplete?.(next);
          }}
        />
        {props.children}
      </View>
    </OTPInputContext.Provider>
  );
}

export function useOTP(): { slots: OTPSlot[] } | null {
  return useContext(OTPInputContext);
}
