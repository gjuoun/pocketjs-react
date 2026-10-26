// Native Progress (batch A), shaped like Radix's Progress namespace so the vendored shadcn progress imports it
// unchanged. The vendored source takes `value` out of its props and gives it only to the indicator, as the
// transform translateX(-(100 - value)%). The root therefore reads the fill from its children (the same
// transform), or from an explicit `value` prop (the Radix API). The fill is flex-grow, never a transform:
// the indicator grows to `share` of the track and a filler grows to the rest, so the core lays it out with no
// percent width. A null or invalid value is indeterminate: an empty track.

import {
  createContext,
  isValidElement,
  type ReactNode,
  useContext,
  useLayoutEffect,
} from "react";
import { countDroppedAttr } from "../compat/stats.ts";
import { View } from "../elements.ts";
import { cn } from "../style/cn.ts";

interface FillContextValue {
  /** The fill as a share of the track, 0 to 100. */
  share: number;
}

const FillContext = createContext<FillContextValue>({ share: 0 });

/** The value a translateX(-(100 - value)%) transform carries, or null. */
function valueOfTransform(transform: string): number | null {
  const m = /translateX\((-?[\d.]+)%\)/.exec(transform);
  return m ? 100 + Number(m[1]) : null;
}

/** The value the vendored indicator carries in its style transform, found in the element tree. */
function valueOfChildren(node: ReactNode): number | null {
  if (Array.isArray(node)) {
    for (const child of node) {
      const found = valueOfChildren(child);
      if (found !== null) return found;
    }
    return null;
  }
  if (!isValidElement(node)) return null;
  const props = node.props as { style?: { transform?: unknown }; children?: ReactNode };
  if (typeof props.style?.transform === "string") {
    const found = valueOfTransform(props.style.transform);
    if (found !== null) return found;
  }
  return valueOfChildren(props.children);
}

export interface ProgressProps {
  value?: number | null;
  max?: number;
  className?: string;
  children?: ReactNode;
}

export function Root(props: ProgressProps) {
  const max = props.max !== undefined && props.max > 0 ? props.max : 100;
  const value = props.value !== undefined ? props.value : valueOfChildren(props.children);
  const determinate =
    value !== null && value !== undefined && Number.isFinite(value) && value >= 0 && value <= max;
  const share = determinate ? (value / max) * 100 : 0;
  return (
    <FillContext.Provider value={{ share }}>
      <View className={cn("flex-row relative w-full h-2 overflow-hidden bg-slate-300", props.className)}>
        {props.children}
        <View style={{ flexGrow: 100 - share, flexBasis: 0 }} />
      </View>
    </FillContext.Provider>
  );
}

export interface IndicatorProps {
  className?: string;
  /** The vendored transform. It is read by the root, never given to the core. */
  style?: unknown;
  children?: ReactNode;
}

/** The filled part of the track: it grows to the fill's share and draws in the caller's colour. */
export function Indicator(props: IndicatorProps) {
  const { share } = useContext(FillContext);
  useLayoutEffect(() => {
    if (props.style !== undefined) countDroppedAttr("style");
  }, []);
  return (
    <View className={cn("h-full bg-slate-900", props.className)} style={{ flexGrow: share, flexBasis: 0 }}>
      {props.children}
    </View>
  );
}
