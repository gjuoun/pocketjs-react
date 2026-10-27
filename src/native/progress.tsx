// Progress: a determinate bar on a 240 px track. The value (0 to 100) rounds half up to a 10-point step, and each
// step is a token: the fill is a fixed px width, because a percentage width is not in the vocabulary. States: one
// fill per step (11), and the dark theme swaps the fill colour. Static in the sense of no focus; the caller drives value.
import { View } from "../elements.ts";
import { useTokens } from "./theme.tsx";

export interface ProgressProps {
  value?: number;
}

/** The step a value draws: clamped to 0..100, rounded half up to the nearest 10. */
export function progressStep(value: number): number {
  const v = Math.min(100, Math.max(0, value));
  return Math.floor(v / 10 + 0.5) * 10;
}

export function Progress(props: ProgressProps) {
  const T = useTokens() as Record<string, string>;
  return (
    <View className={T["progress.track"]}>
      <View className={T["progress.fill." + progressStep(props.value ?? 0)]} />
    </View>
  );
}
