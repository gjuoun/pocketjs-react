// Pressable: the one press contract every native primitive uses. By default it is a focusable
// view that runs onPress on CIRCLE (or a tap). With asChild it is the caller's own element:
// the class and the press merge onto the child (Radix's Slot contract, without Slot), so
// <Close asChild><Button/></Close> presses the Button.

import { cloneElement, isValidElement, type ReactElement, type ReactNode } from "react";
import { Text, View } from "../elements.ts";
import { cn } from "../style/cn.ts";

interface PressableProps {
  asChild?: boolean;
  className?: string;
  onPress: () => void;
  children?: ReactNode;
}

interface ChildProps {
  className?: string;
  onClick?: () => void;
}

export function Pressable(props: PressableProps) {
  if (props.asChild && isValidElement(props.children)) {
    const child = props.children as ReactElement<ChildProps>;
    return cloneElement(child, {
      className: cn(child.props.className, props.className),
      onClick: () => {
        child.props.onClick?.();
        props.onPress();
      },
    });
  }
  const body =
    typeof props.children === "string" || typeof props.children === "number" ? (
      <Text className="text-sm text-white">{props.children}</Text>
    ) : (
      props.children
    );
  return (
    <View className={props.className} focusable onPress={props.onPress}>
      {body}
    </View>
  );
}
