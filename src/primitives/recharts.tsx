// recharts shim (batch 4, R9): the surface the vendored shadcn chart reaches. ResponsiveContainer gives its children the
// parent box. Tooltip and Legend are overlays the core cannot draw yet: they render nothing. Series and axes (Bar, Line,
// Area, Pie, XAxis, YAxis, CartesianGrid, ...) are a named error when rendered: no chart is drawn for them.
import type { ReactNode } from "react";
import { View } from "../elements.ts";

export interface TooltipValueType {}
export type DefaultTooltipContentProps<T = unknown, V = unknown> = {
  active?: boolean;
  payload?: { name?: string; value?: V; payload?: T }[];
  label?: unknown;
};
export type DefaultLegendContentProps = {
  payload?: { value?: string; color?: string }[];
};

export function ResponsiveContainer(props: {
  width?: unknown;
  height?: unknown;
  initialDimension?: unknown;
  children?: ReactNode;
}) {
  return <View className="w-full h-full flex-col">{props.children}</View>;
}

export function Tooltip(_props: Record<string, unknown>) {
  return null;
}

export function Legend(_props: Record<string, unknown>) {
  return null;
}

function unsupported(name: string): () => never {
  return () => {
    throw new Error(
      "pocketjs-react: recharts " +
        name +
        " is not supported (the chart shim draws no series or axes)",
    );
  };
}

export const Bar = unsupported("Bar");
export const Line = unsupported("Line");
export const Area = unsupported("Area");
export const Pie = unsupported("Pie");
export const Cell = unsupported("Cell");
export const XAxis = unsupported("XAxis");
export const YAxis = unsupported("YAxis");
export const CartesianGrid = unsupported("CartesianGrid");
