// Empty: the block a list or a view shows when it has nothing yet: an icon well, a title, a description and an action
// slot (any control, usually a Button). It is centred in a bordered block that fills its parent's width, so an empty view
// reads as a designed state. Static: the block has no focus and no press; its action is judged on its own control.
import type { ReactNode } from "react";
import { Text, View } from "../elements.ts";
import { useTokens } from "./theme.tsx";

export interface EmptyProps {
  icon?: ReactNode;
  title: string;
  /** The description, under the title. */
  children?: string;
  /** The action slot: a control under the text. */
  action?: ReactNode;
}

export function Empty(props: EmptyProps) {
  const T = useTokens() as Record<string, string>;
  return (
    <View className={T["empty.base"]} debugName="empty">
      {props.icon ? <View className={T["empty.icon"]}>{props.icon}</View> : null}
      <Text className={T["empty.title"]}>{props.title}</Text>
      {props.children ? <Text className={T["empty.description"]}>{props.children}</Text> : null}
      {props.action ? <View className={T["empty.action"]}>{props.action}</View> : null}
    </View>
  );
}
