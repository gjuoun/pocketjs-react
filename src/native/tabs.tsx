// Tabs: a controlled value on a context. The list is a roving group: LEFT and RIGHT move focus to the
// neighbour trigger (wrapping) and activate it. Triggers register in mount (tree) order. Content mounts only
// while its value is active. The roving controller is written here; it is not the shared roving.ts.
import { createContext, type ReactNode, useContext, useLayoutEffect, useRef } from "react";
import { focusNode, getFocused, pushFocusController } from "@pocketjs/framework/input";
import { Text, View } from "../elements.ts";
import type { NodeMirror } from "../internal/pocket.ts";
import { useControllableState } from "../primitives/state.ts";
import { Focusable } from "./focusable.tsx";
import { TOKENS } from "./tokens.ts";

const T = TOKENS as Record<string, string>;

interface TriggerItem {
  node: NodeMirror;
  select: () => void;
}
interface GroupValue {
  value: string;
  select: (value: string) => void;
  items: { current: TriggerItem[] };
}
const Ctx = createContext<GroupValue | null>(null);

function useGroup(part: string): GroupValue {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("pocketjs-react native: " + part + " must be used inside <Tabs>");
  return ctx;
}

export function Tabs(props: { value?: string; defaultValue?: string; onValueChange?: (value: string) => void; children?: ReactNode }) {
  const [value, select] = useControllableState(props.value, props.defaultValue ?? "", props.onValueChange);
  const items = useRef<TriggerItem[]>([]);
  return <Ctx.Provider value={{ value, select, items }}>{props.children}</Ctx.Provider>;
}

export function TabsList(props: { children?: ReactNode }) {
  const g = useGroup("TabsList");
  const node = useRef<NodeMirror | null>(null);
  useLayoutEffect(() => {
    if (!node.current) return;
    return pushFocusController(node.current as never, (direction) => {
      if (direction !== "left" && direction !== "right") return false;
      const list = g.items.current;
      const i = list.findIndex((it) => it.node === (getFocused() as unknown as NodeMirror));
      if (i < 0) return false;
      const j = (i + (direction === "right" ? 1 : -1) + list.length) % list.length;
      focusNode(list[j].node as never);
      list[j].select();
      return true;
    });
  }, []);
  return <View ref={node} className={T["tabs.list"]}>{props.children}</View>;
}

export function TabsTrigger(props: { value: string; children?: string }) {
  const g = useGroup("TabsTrigger");
  const node = useRef<NodeMirror | null>(null);
  const select = useRef(() => g.select(props.value));
  select.current = () => g.select(props.value);
  useLayoutEffect(() => {
    if (!node.current) return;
    const item: TriggerItem = { node: node.current, select: () => select.current() };
    g.items.current.push(item);
    return () => { g.items.current = g.items.current.filter((x) => x !== item); };
  }, []);
  const active = g.value === props.value;
  const look = [T["tabs.trigger"], active ? T["tabs.active.rest"] : T["tabs.inactive.rest"], T["tabs.focus"]].join(" ");
  const label = active ? T["tabs.active.text"] : T["tabs.inactive.text"];
  return (
    <Focusable look={look} nodeRef={node} onPress={() => g.select(props.value)}>
      <Text className={label}>{props.children}</Text>
    </Focusable>
  );
}

export function TabsContent(props: { value: string; children?: string }) {
  const g = useGroup("TabsContent");
  if (g.value !== props.value) return null;
  return (
    <View className={T["tabs.content"]}>
      <Text className={T["tabs.body"]}>{props.children}</Text>
    </View>
  );
}
