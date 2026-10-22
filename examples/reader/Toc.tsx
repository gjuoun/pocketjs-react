// Table of contents: a windowed List of the book's nav entries. CIRCLE reads, CROSS goes back.
import { BTN, List, Text, useButton, View, type EpubBook } from "pocketjs-react";
import type { Theme } from "./theme.ts";

export function Toc(props: { book: EpubBook; current: number; theme: Theme; onRead: (chapter: number) => void; onBack: () => void }) {
  useButton(BTN.CROSS, props.onBack);
  const entries = props.book.toc.filter((e) => e.index >= 0);
  const initial = Math.max(0, entries.findIndex((e) => e.index === props.current));
  return (
    <View className={props.theme.screen}>
      <Text className={props.theme.title}>{props.book.title}</Text>
      <List
        items={entries}
        visibleCount={7}
        initialIndex={initial}
        keyOf={(e, i) => i + ":" + e.title}
        onSelect={(e) => props.onRead(e.index)}
        itemClassName={props.theme.row}
        renderItem={(e) => <Text className={props.theme.rowText}>{e.title}</Text>}
      />
      <Text className={props.theme.muted}>CIRCLE read  ·  CROSS library</Text>
    </View>
  );
}
