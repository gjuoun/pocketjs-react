// Breadcrumb: a horizontal trail of links with "/" separators. The last item is the current page: drawn in ink and not
// pressable. When the trail is longer than maxItems (default 4) its middle collapses to one focusable ellipsis, and CIRCLE
// on it expands the full trail, so every item is reachable. onSelect(index) reports a press on a link. States: link (rest,
// focus, press), current (static), collapsed (ellipsis), expanded (all items).
import { Fragment, useState } from "react";
import { Text, View } from "../elements.ts";
import { Focusable } from "./focusable.tsx";
import { useTokens } from "./theme.tsx";

export interface BreadcrumbProps {
  items: string[];
  /** The longest trail drawn in full (default 4, at least 3); a longer one collapses its middle. */
  maxItems?: number;
  onSelect?: (index: number) => void;
}

/** The entries to draw: every index, or when collapsed the first, -1 (the ellipsis) and the last maxItems - 2 items. */
export function collapse(count: number, maxItems: number, expanded: boolean): number[] {
  const all = Array.from({ length: count }, (_, i) => i);
  if (expanded || count <= maxItems) return all;
  const tail = maxItems - 2;
  return [0, -1, ...all.slice(count - tail)];
}

export function Breadcrumb(props: BreadcrumbProps) {
  const T = useTokens() as Record<string, string>;
  const [expanded, setExpanded] = useState(false);
  const count = props.items.length;
  const max = Math.max(3, props.maxItems ?? 4);
  const item = [T["breadcrumb.item"], T["breadcrumb.idle.rest"], T["breadcrumb.focus"], T["breadcrumb.press"]].join(" ");
  return (
    <View className={T["breadcrumb.root"]} debugName="breadcrumb">
      {collapse(count, max, expanded).map((i, k) => (
        <Fragment key={i + ":" + k}>
          {k > 0 ? <Text className={T["breadcrumb.separator"]}>/</Text> : null}
          {i === -1 ? (
            <Focusable look={item} onPress={() => setExpanded(true)}>
              <Text className={T["breadcrumb.link"]}>…</Text>
            </Focusable>
          ) : i === count - 1 ? (
            <View className={T["breadcrumb.current"]} debugName="breadcrumb-page">
              <Text className={T["breadcrumb.page"]}>{props.items[i]}</Text>
            </View>
          ) : (
            <Focusable look={item} onPress={() => props.onSelect?.(i)}>
              <Text className={T["breadcrumb.link"]}>{props.items[i]}</Text>
            </Focusable>
          )}
        </Fragment>
      ))}
    </View>
  );
}
