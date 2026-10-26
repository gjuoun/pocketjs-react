// @shadcn/react/message-scroller shim (batch 4, R9, reduced per F3 A). The Root holds one offset viewport: it starts at the
// end of its content (the newest message) once the extent is measured, and the Button scrolls to either end. Named
// boundaries: none are thrown; the parts the shim does not do are recorded here instead. Not built: the reactive button
// visibility (the Button is always drawn, the shadcn original hides it at the end), the scroll anchor of an item, and the
// render prop of the Button (the shim draws its own button). Scrolling needs nodeRef (overlay core); on the default core the
// range is 0 and the list stays at the top.
import { type ReactNode, createContext, useContext } from "react";
import { View } from "../elements.ts";
import { cn } from "../style/cn.ts";
import { type Offset, useOffset } from "./offset-viewport.ts";
import { Pressable } from "./press.tsx";

const Ctx = createContext<Offset | null>(null);

function useMessages(): Offset | null {
  return useContext(Ctx);
}

export function Provider(props: { children?: ReactNode }) {
  return <>{props.children}</>;
}

export function Root(props: {
  className?: string;
  children?: ReactNode;
  [prop: `data-${string}`]: unknown;
}) {
  const off = useOffset("y", undefined, true);
  return (
    <Ctx.Provider value={off}>
      <View className={cn("relative flex-col", props.className)}>
        {props.children}
      </View>
    </Ctx.Provider>
  );
}

export function Viewport(props: { className?: string; children?: ReactNode }) {
  const off = useMessages();
  if (!off)
    throw new Error(
      "pocketjs-react: MessageScroller.Viewport must be used within a MessageScroller",
    );
  return (
    <View
      ref={off.viewport}
      className={cn("flex-col overflow-hidden", props.className)}
    >
      {props.children}
    </View>
  );
}

export function Content(props: { className?: string; children?: ReactNode }) {
  const off = useMessages();
  return (
    <View
      ref={off?.content}
      className={cn("flex-col w-full shrink-0", props.className)}
    >
      {props.children}
    </View>
  );
}

export function Item(props: {
  className?: string;
  scrollAnchor?: boolean;
  children?: ReactNode;
}) {
  return (
    <View className={cn("shrink-0", props.className)}>{props.children}</View>
  );
}

export function Button(props: {
  direction?: "start" | "end";
  className?: string;
  children?: ReactNode;
  render?: unknown;
  [prop: string]: unknown;
}) {
  const off = useMessages();
  const end = (props.direction ?? "end") === "end";
  return (
    <Pressable
      className={props.className}
      onPress={() => {
        if (!off) return;
        if (end) off.scrollToEnd();
        else off.scrollTo(0);
      }}
    >
      {props.children}
    </Pressable>
  );
}

export function useMessageScroller(): {
  scrollToEnd(): void;
  scrollToStart(): void;
  offset(): number;
} {
  const off = useMessages();
  return {
    scrollToEnd: () => off?.scrollToEnd(),
    scrollToStart: () => off?.scrollTo(0),
    offset: () => off?.offset() ?? 0,
  };
}

export function useMessageScrollerScrollable(): boolean {
  const off = useMessages();
  return (off?.max() ?? 0) > 0;
}

export function useMessageScrollerVisibility(): boolean {
  return true;
}

export const MessageScroller = {
  Root,
  Provider,
  Viewport,
  Content,
  Item,
  Button,
};
