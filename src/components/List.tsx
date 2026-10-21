// <List>: a vertical, d-pad-operable list. Every item is focusable; UP/DOWN move focus in
// order and CIRCLE calls onSelect. Item classes merge over the defaults with cn, so a
// conditional class (on && "bg-emerald-700") wins over the default background.
import type { ReactNode } from "react";
import { View } from "../elements.ts";
import { cn } from "../style/cn.ts";

export const LIST_ITEM_CLASS = "flex-row items-center justify-between px-3 py-1 rounded-lg bg-slate-800 focus:bg-blue-600";

export interface ListProps<T> {
  items: readonly T[];
  renderItem: (item: T, index: number) => ReactNode;
  onSelect?: (item: T, index: number) => void;
  keyOf?: (item: T, index: number) => string | number;
  className?: string;
  itemClassName?: string | ((item: T, index: number) => string | false | null | undefined);
}

export function List<T>(props: ListProps<T>) {
  const { items, renderItem, onSelect, keyOf, className, itemClassName } = props;
  return (
    <View className={cn("flex-col gap-1", className)}>
      {items.map((item, index) => (
        <View
          key={keyOf ? keyOf(item, index) : index}
          className={cn(LIST_ITEM_CLASS, typeof itemClassName === "function" ? itemClassName(item, index) : itemClassName)}
          focusable
          onPress={onSelect ? () => onSelect(item, index) : undefined}
          debugName={String(keyOf ? keyOf(item, index) : index)}
        >
          {renderItem(item, index)}
        </View>
      ))}
    </View>
  );
}
