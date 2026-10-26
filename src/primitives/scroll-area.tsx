// Native ScrollArea (batch 4, D6), shaped like Radix's ScrollArea namespace so the vendored shadcn scroll-area imports it
// unchanged. Root is the frame; Viewport clips and holds one content node that the offset moves; ScrollAreaScrollbar is the
// vertical track, and its focusable thumb drags the content (registerDrag). Vertical only: a horizontal scrollbar throws a
// named error, because the offset shim has no horizontal axis wired to a bar. Scroll range needs nodeRef (overlay core);
// on the default core the range is 0 and the content does not move (see offset-viewport.ts).
import {
  type MutableRefObject,
  type ReactNode,
  createContext,
  useContext,
  useLayoutEffect,
  useRef,
} from "react";
import { View } from "../elements.ts";
import type { NodeMirror } from "../internal/pocket.ts";
import { cn } from "../style/cn.ts";
import { type Offset, useOffset } from "./offset-viewport.ts";
import { Pressable } from "./press.tsx";

interface Ctx {
  off: Offset;
  thumb: MutableRefObject<NodeMirror | null>;
  track: MutableRefObject<NodeMirror | null>;
}

const ScrollContext = createContext<Ctx | null>(null);

function useScroll(part: string): Ctx {
  const c = useContext(ScrollContext);
  if (!c)
    throw new Error(
      "pocketjs-react: ScrollArea." +
        part +
        " must be used within a ScrollArea",
    );
  return c;
}

export interface RootProps {
  className?: string;
  children?: ReactNode;
}

export function Root(props: RootProps) {
  const thumb = useRef<NodeMirror | null>(null);
  const track = useRef<NodeMirror | null>(null);
  const off = useOffset("y", { thumb, track });
  return (
    <ScrollContext.Provider value={{ off, thumb, track }}>
      <View className={cn("relative", props.className)}>{props.children}</View>
    </ScrollContext.Provider>
  );
}

export function Viewport(props: { className?: string; children?: ReactNode }) {
  const c = useScroll("Viewport");
  return (
    <View
      ref={c.off.viewport}
      className={cn("flex-col overflow-hidden", props.className)}
    >
      <View ref={c.off.content} className="w-full shrink-0">
        {props.children}
      </View>
    </View>
  );
}

export function ScrollAreaScrollbar(props: {
  orientation?: "horizontal" | "vertical";
  className?: string;
  children?: ReactNode;
}) {
  if ((props.orientation ?? "vertical") !== "vertical")
    throw new Error(
      "pocketjs-react: ScrollArea supports a vertical scrollbar only (the offset has no horizontal bar)",
    );
  const c = useScroll("ScrollAreaScrollbar");
  return (
    <View
      ref={c.track}
      className={cn(
        "absolute top-0 right-0 h-full w-2.5 flex-col",
        props.className,
      )}
    >
      {props.children}
    </View>
  );
}

export function ScrollAreaThumb(props: {
  className?: string;
  children?: ReactNode;
}) {
  const c = useScroll("ScrollAreaThumb");
  useLayoutEffect(() => {
    const node = c.thumb.current;
    return node ? c.off.drag(node) : undefined;
  }, []);
  return (
    <Pressable
      nodeRef={c.thumb}
      className={cn("relative shrink-0", props.className)}
      onPress={() => {}}
    >
      {props.children}
    </Pressable>
  );
}

export function Corner() {
  return <View className="w-0 h-0" />;
}
