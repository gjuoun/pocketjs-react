// Chevron: a 16 px glyph pointing right at rotate-0, drawn from two bars (the core paints rotated rects). Its turn is a
// transition-all duration-150 rotate: rotate-90 points down, rotate-270 points up, and the core interpolates between them.
// Used by the accordion trigger (0 closed, 90 open) and the select trigger (90 closed, 270 open). No focus, no press.
import { View } from "../elements.ts";
import { useTokens } from "./theme.tsx";

export type ChevronTurn = 0 | 90 | 270;

export interface ChevronProps {
  turn?: ChevronTurn;
}

export function Chevron(props: ChevronProps) {
  const T = useTokens() as Record<string, string>;
  return (
    <View className={T["chevron.turn." + (props.turn ?? 0)]} debugName="chevron">
      <View className={T["chevron.arm.top"]} />
      <View className={T["chevron.arm.bottom"]} />
    </View>
  );
}
