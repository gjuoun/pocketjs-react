// Native Avatar (batch A), shaped like Radix's Avatar namespace so the vendored shadcn avatar imports it
// unchanged. The root is a clipped View; its corner radius comes from data-size (sm 12, default 16, lg 20
// px, the half of the 24, 32 and 40 px boxes the caller's size classes make). The root reads its
// AvatarImage's src from the children, so the image and the fallback agree in the same render: the image
// draws only when hasTexture(src) (a guarded lookup, so an unknown URL never throws), and the fallback draws
// otherwise, after delayMs (converted to frames at 60 Hz). The root sets no size of its own: the caller's
// size classes do, as the vendored source writes them.

import {
  createContext,
  isValidElement,
  type ReactNode,
  useContext,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { Image as ImageElement, Text, View } from "../elements.ts";
import { hasTexture } from "../internal/pocket.ts";
import { useFrame } from "../renderer/use-frame.ts";
import { cn } from "../style/cn.ts";

type AvatarSize = "sm" | "default" | "lg";
type LoadingStatus = "idle" | "loading" | "loaded" | "error";

const RADIUS: Record<AvatarSize, number> = { sm: 12, default: 16, lg: 20 };

interface AvatarContextValue {
  size: AvatarSize;
  loaded: boolean;
}

const AvatarContext = createContext<AvatarContextValue>({ size: "default", loaded: false });

/** The src of the AvatarImage in the element tree, found before anything mounts. */
function srcOf(node: ReactNode): string | undefined {
  if (Array.isArray(node)) {
    for (const child of node) {
      const found = srcOf(child);
      if (found !== undefined) return found;
    }
    return undefined;
  }
  if (!isValidElement(node)) return undefined;
  const props = node.props as { src?: unknown; children?: ReactNode };
  // The image is our Image, or a vendored wrapper around it (AvatarImage): any component with a src.
  if (typeof node.type !== "string" && typeof props.src === "string") return props.src;
  return srcOf(props.children);
}

export interface AvatarProps {
  "data-size"?: AvatarSize;
  className?: string;
  children?: ReactNode;
}

export function Root(props: AvatarProps) {
  const size: AvatarSize = props["data-size"] ?? "default";
  const src = srcOf(props.children);
  const loaded = src !== undefined && hasTexture(src);
  return (
    <AvatarContext.Provider value={{ size, loaded }}>
      <View
        data-size={size}
        className={cn("relative flex overflow-hidden", props.className)}
        style={{ borderRadius: RADIUS[size] }}
      >
        {props.children}
      </View>
    </AvatarContext.Provider>
  );
}

export interface ImageProps {
  src?: string;
  className?: string;
  debugName?: string;
  onLoadingStatusChange?: (status: LoadingStatus) => void;
}

/** The picture, drawn only once its texture is registered; reports loaded or error when that is decided. */
export function Image(props: ImageProps) {
  const { loaded } = useContext(AvatarContext);
  const status: LoadingStatus = props.src === undefined ? "error" : loaded ? "loaded" : "error";
  const reported = useRef<LoadingStatus>("idle");
  useLayoutEffect(() => {
    if (reported.current === status) return;
    reported.current = status;
    props.onLoadingStatusChange?.(status);
  }, [status]);
  if (!loaded || props.src === undefined) return null;
  return (
    <ImageElement
      src={props.src}
      debugName={props.debugName}
      className={cn("w-full h-full", props.className)}
    />
  );
}

export interface FallbackProps {
  delayMs?: number;
  className?: string;
  children?: ReactNode;
}

/** The fallback, drawn while the image is not loaded: the caller's initials in the centre. */
export function Fallback(props: FallbackProps) {
  const { size, loaded } = useContext(AvatarContext);
  const [ready, setReady] = useState(props.delayMs === undefined);
  useFrame((frame) => {
    if (!ready && props.delayMs !== undefined && ((frame + 1) * 1000) / 60 >= props.delayMs)
      setReady(true);
  });
  if (loaded || !ready) return null;
  const text = typeof props.children === "string" || typeof props.children === "number";
  return (
    <View className={cn("flex items-center justify-center w-full h-full bg-slate-100", props.className)}>
      {text ? (
        <Text className={cn(size === "sm" ? "text-xs" : "text-sm", "text-slate-500 font-bold")}>
          {props.children}
        </Text>
      ) : (
        props.children
      )}
    </View>
  );
}
