// <Tabs>: a header row and one panel. The shoulder buttons switch tabs (L previous, R next by
// default); each tab remembers which of its items had focus and gets it back.

import { BTN, focusNode, getFocused } from "@pocketjs/framework/input";
import { type ReactNode, useLayoutEffect, useRef, useState } from "react";
import { Text, View } from "../elements.ts";
import { useButton } from "../input/buttons.ts";
import type { NodeMirror } from "../internal/pocket.ts";
import { cn } from "../style/cn.ts";

export interface TabsProps {
  tabs: { title: string; content: ReactNode }[];
  initial?: number;
  onChange?: (index: number) => void;
  prevButton?: number;
  nextButton?: number;
  className?: string;
  dark?: boolean;
}

function focusables(node: NodeMirror, out: NodeMirror[] = []): NodeMirror[] {
  if ((node as { focusable?: boolean }).focusable) out.push(node);
  for (const child of node.children) focusables(child, out);
  return out;
}

function isWithin(node: NodeMirror | null, ancestor: NodeMirror): boolean {
  for (let n = node; n; n = n.parent) if (n === ancestor) return true;
  return false;
}

export function Tabs(props: TabsProps) {
  const [index, setIndex] = useState(props.initial ?? 0);
  const panel = useRef<NodeMirror>(null);
  const remembered = useRef(new Map<number, number>());
  const restore = useRef(false);

  const go = (delta: number) => {
    const next = Math.max(0, Math.min(props.tabs.length - 1, index + delta));
    if (next === index || !panel.current) return;
    const items = focusables(panel.current);
    const focused = getFocused() as unknown as NodeMirror | null;
    if (isWithin(focused, panel.current))
      remembered.current.set(index, Math.max(0, items.indexOf(focused!)));
    restore.current = true;
    setIndex(next);
    props.onChange?.(next);
  };
  useButton(props.prevButton ?? BTN.LTRIGGER, () => go(-1));
  useButton(props.nextButton ?? BTN.RTRIGGER, () => go(1));

  useLayoutEffect(() => {
    if (!restore.current || !panel.current) return;
    restore.current = false;
    const items = focusables(panel.current);
    const target = items[remembered.current.get(index) ?? 0] ?? items[0];
    focusNode((target ?? null) as never);
  }, [index]);

  return (
    <View className={cn("flex-col gap-1", props.className)}>
      <View className="flex-row gap-2">
        {props.tabs.map((tab, i) => (
          <View
            key={tab.title}
            className={cn(
              "px-3 py-1 rounded",
              i === index
                ? "bg-blue-600"
                : props.dark
                  ? "bg-slate-800"
                  : "bg-slate-200",
            )}
          >
            <Text
              className={cn(
                "text-sm",
                i === index || props.dark ? "text-white" : "text-slate-900",
              )}
            >
              {tab.title}
            </Text>
          </View>
        ))}
      </View>
      <View ref={panel} className="flex-col">
        {props.tabs[index]?.content}
      </View>
    </View>
  );
}
