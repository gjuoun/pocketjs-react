// Pagination: a row of page buttons with Prev and Next. A long range shows a window: the first and the last page, the
// current page with one neighbour on each side, and "..." where pages are skipped. Controlled: page (1-based) and
// onPageChange(page). The ends are disabled (Prev on the first page, Next on the last), so focus skips them. LEFT and RIGHT
// move focus along the row (the core's own traversal) and CIRCLE presses. States: active, idle, focus, press, disabled.
import { Fragment } from "react";
import { Text, View } from "../elements.ts";
import { Focusable } from "./focusable.tsx";
import { useTokens } from "./theme.tsx";

/** The entries of a page range: every page up to seven, else a window with "..." for each skipped run. */
export function pageWindow(page: number, count: number): Array<number | "..."> {
  if (count <= 7) return Array.from({ length: count }, (_, i) => i + 1);
  const out: Array<number | "..."> = [1];
  if (page > 3) out.push("...");
  for (let p = Math.max(2, page - 1); p <= Math.min(count - 1, page + 1); p++) out.push(p);
  if (page < count - 2) out.push("...");
  out.push(count);
  return out;
}

export interface PaginationProps {
  /** The current page, 1-based. */
  page: number;
  pageCount: number;
  onPageChange?: (page: number) => void;
}

export function Pagination(props: PaginationProps) {
  const T = useTokens() as Record<string, string>;
  const { page, pageCount } = props;
  const go = (p: number) => props.onPageChange?.(p);
  const idle = [T["pagination.item"], T["pagination.idle.rest"], T["pagination.focus"], T["pagination.press"]].join(" ");
  const current = [T["pagination.item"], T["pagination.active.rest"]].join(" ");
  const wide = [T["pagination.wide"], T["pagination.idle.rest"], T["pagination.focus"], T["pagination.press"]].join(" ");
  const wideEdge = [T["pagination.wide"], T["pagination.disabled.rest"]].join(" ");
  return (
    <View className={T["pagination.row"]} debugName="pagination">
      {page <= 1 ? (
        <View className={wideEdge} debugName="pagination-prev-disabled"><Text className={T["pagination.disabled.text"]}>Prev</Text></View>
      ) : (
        <Focusable look={wide} onPress={() => go(page - 1)}><Text className={T["pagination.text"]}>Prev</Text></Focusable>
      )}
      {pageWindow(page, pageCount).map((entry, k) =>
        entry === "..." ? (
          <View key={"gap" + k} className={T["pagination.gap"]}><Text className={T["pagination.disabled.text"]}>...</Text></View>
        ) : entry === page ? (
          <View key={entry} className={current} debugName="pagination-current"><Text className={T["pagination.active.text"]}>{String(entry)}</Text></View>
        ) : (
          <Fragment key={entry}>
            <Focusable look={idle} onPress={() => go(entry)}><Text className={T["pagination.text"]}>{String(entry)}</Text></Focusable>
          </Fragment>
        ),
      )}
      {page >= pageCount ? (
        <View className={wideEdge} debugName="pagination-next-disabled"><Text className={T["pagination.disabled.text"]}>Next</Text></View>
      ) : (
        <Focusable look={wide} onPress={() => go(page + 1)}><Text className={T["pagination.text"]}>Next</Text></Focusable>
      )}
    </View>
  );
}
