// Switch: a focusable row of a track and a label. The track is 40 by 24 px with a 2 px inset; the thumb is 20 px and
// moves 16 px along it. The move is the core's own layout transition: transition-all duration-150 on the thumb's margin,
// so nodeRect and the pixels both change over about 9 frames, and React writes once per toggle.
// debugName marks the track and the thumb in the mirror, so the tests read their layout rects.
// Controlled: checked is the source and onCheckedChange(next) reports every press. CIRCLE on the row toggles it.
import { Text, View } from "../elements.ts";
import { Focusable } from "./focusable.tsx";
import { useTokens } from "./theme.tsx";

export interface SwitchProps {
  checked?: boolean;
  onCheckedChange?: (next: boolean) => void;
  disabled?: boolean;
  children?: string;
}

export function Switch(props: SwitchProps) {
  const T = useTokens() as Record<string, string>;
  const on = props.checked === true;
  const track = props.disabled ? T["switch.track.disabled"] : on ? T["switch.track.on"] : T["switch.track.off"];
  const thumb = on ? T["switch.thumb.on"] : T["switch.thumb.off"];
  const row = props.disabled ? T["switch.row"] : [T["switch.row"], T["switch.focus"]].join(" ");
  const label = T[props.disabled ? "switch.label.disabled" : "switch.label.rest"];
  return (
    <Focusable look={row} disabled={props.disabled} onPress={() => props.onCheckedChange?.(!on)}>
      <View className={track} debugName="switch-track">
        <View className={thumb} debugName="switch-thumb" />
      </View>
      {props.children !== undefined ? <Text className={label}>{props.children}</Text> : null}
    </Focusable>
  );
}
