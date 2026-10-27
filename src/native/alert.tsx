// Alert: a banner with an optional icon slot, a title, a description and an optional Dismiss control. Four variants
// (info, success, warning, destructive); each is a fill, a border and two inks from the token table, and each title and
// description pair is asserted against the 4.5:1 text floor. Dismiss unmounts the banner once and reports onDismiss.
// States: rest per variant, focus and press on Dismiss, dismissed (gone).
import { type ReactNode, useState } from "react";
import { Text, View } from "../elements.ts";
import { Focusable } from "./focusable.tsx";
import { useTokens } from "./theme.tsx";

export type AlertVariant = "info" | "success" | "warning" | "destructive";

export interface AlertProps {
  variant?: AlertVariant;
  /** The icon slot: any node, drawn in a fixed well at the left. */
  icon?: ReactNode;
  title: string;
  /** The description, under the title. */
  children?: string;
  dismissible?: boolean;
  onDismiss?: () => void;
}

export function Alert(props: AlertProps) {
  const T = useTokens() as Record<string, string>;
  const [gone, setGone] = useState(false);
  if (gone) return null;
  const v = props.variant ?? "info";
  return (
    <View className={[T["alert.base"], T["alert." + v + ".rest"]].join(" ")} debugName="alert">
      {props.icon ? <View className={T["alert.icon"]}>{props.icon}</View> : null}
      <View className={T["alert.body"]}>
        <Text className={[T["alert.title"], T["alert." + v + ".title"]].join(" ")}>{props.title}</Text>
        {props.children ? <Text className={[T["alert.description"], T["alert." + v + ".text"]].join(" ")}>{props.children}</Text> : null}
      </View>
      {props.dismissible ? (
        <Focusable look={[T["alert.dismiss"], T["alert.focus"], T["alert.press"]].join(" ")} onPress={() => { setGone(true); props.onDismiss?.(); }}>
          <Text className={T["alert.dismiss.text"]}>Dismiss</Text>
        </Focusable>
      ) : null}
    </View>
  );
}
