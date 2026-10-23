// PocketJS host elements for React: View, Text, Image.
//
// The native node types are "view", "text" and "image". React's DOM typings already
// claim lowercase <view>, <text> and <image> for SVG, so the elements are exported as typed
// components instead. Each one IS the host type string at runtime: <View> compiles to
// jsx("view", ...) and creates a native view directly, with no wrapper component.
import type { ReactElement, ReactNode, Ref } from "react";
import type { NodeMirror } from "./internal/pocket.ts";

/** Inline styles: camelCase CSS properties the PocketJS core can draw (see README). */
export interface PocketCSSProperties {
  width?: number | string;
  height?: number | string;
  minWidth?: number | string;
  minHeight?: number | string;
  maxWidth?: number | string;
  maxHeight?: number | string;
  padding?: number | string;
  paddingTop?: number | string;
  paddingRight?: number | string;
  paddingBottom?: number | string;
  paddingLeft?: number | string;
  margin?: number | string;
  marginTop?: number | string;
  marginRight?: number | string;
  marginBottom?: number | string;
  marginLeft?: number | string;
  gap?: number | string;
  flexDirection?: "row" | "column";
  flexWrap?: "nowrap" | "wrap";
  justifyContent?:
    | "start"
    | "flex-start"
    | "center"
    | "end"
    | "flex-end"
    | "space-between"
    | "space-around";
  alignItems?:
    | "start"
    | "flex-start"
    | "center"
    | "end"
    | "flex-end"
    | "stretch";
  flexGrow?: number;
  flexShrink?: number;
  flexBasis?: number | string;
  position?: "relative" | "absolute";
  top?: number | string;
  right?: number | string;
  bottom?: number | string;
  left?: number | string;
  display?: "flex" | "none";
  overflow?: "visible" | "hidden";
  zIndex?: number;
  backgroundColor?: string;
  borderColor?: string;
  color?: string;
  borderRadius?: number | string;
  borderWidth?: number | string;
  opacity?: number;
  textAlign?: "left" | "center" | "right";
  lineHeight?: number | string;
  letterSpacing?: number | string;
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

type HostElement<P> = (props: P) => ReactElement | null;

export const View = "view" as unknown as HostElement<PocketHostProps>;
export const Text = "text" as unknown as HostElement<PocketHostProps>;
export const Image = "image" as unknown as HostElement<PocketImageProps>;
