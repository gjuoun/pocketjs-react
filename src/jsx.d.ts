// Intrinsic PocketJS host elements for React's JSX: <view>, <text>, <image>.
import type { Ref, ReactNode } from "react";
import type { NodeMirror } from "./internal/pocket.ts";

/** Inline styles: camelCase CSS properties the PocketJS core can draw (see README). */
export interface PocketCSSProperties {
  width?: number | string; height?: number | string;
  minWidth?: number | string; minHeight?: number | string;
  maxWidth?: number | string; maxHeight?: number | string;
  padding?: number | string; paddingTop?: number | string; paddingRight?: number | string;
  paddingBottom?: number | string; paddingLeft?: number | string;
  margin?: number | string; marginTop?: number | string; marginRight?: number | string;
  marginBottom?: number | string; marginLeft?: number | string;
  gap?: number | string;
  flexDirection?: "row" | "column"; flexWrap?: "nowrap" | "wrap";
  justifyContent?: "start" | "flex-start" | "center" | "end" | "flex-end" | "space-between" | "space-around";
  alignItems?: "start" | "flex-start" | "center" | "end" | "flex-end" | "stretch";
  flexGrow?: number; flexShrink?: number; flexBasis?: number | string;
  position?: "relative" | "absolute";
  top?: number | string; right?: number | string; bottom?: number | string; left?: number | string;
  display?: "flex" | "none"; overflow?: "visible" | "hidden"; zIndex?: number;
  backgroundColor?: string; borderColor?: string; color?: string;
  borderRadius?: number | string; borderWidth?: number | string; opacity?: number;
  textAlign?: "left" | "center" | "right"; lineHeight?: number | string; letterSpacing?: number | string;
}

export interface PocketHostProps {
  className?: string;
  style?: PocketCSSProperties;
  focusable?: boolean;
  onPress?: () => void;
  debugName?: string;
  ref?: Ref<NodeMirror>;
  key?: string | number;
  children?: ReactNode;
}

export interface PocketImageProps extends PocketHostProps {
  src?: string;
}

declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
      view: PocketHostProps;
      text: PocketHostProps;
      image: PocketImageProps;
    }
  }
}
