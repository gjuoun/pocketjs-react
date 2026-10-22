// Reading view: LEFT/RIGHT turn pages (across chapter edges), UP/DOWN scroll by three lines,
// L/R jump to the previous/next chapter, CROSS goes back to the contents. Mouse: click the left
// or right half of the page to turn it.
import { useMemo } from "react";
import { BTN, PageView, Text, useButton, View, paginate, type EpubBook, type FontSize } from "pocketjs-react";
import type { Theme } from "./theme.ts";

export const PAGE = { width: 456, height: 198 };

/** A reading position: a chapter and the block/offset of the first line on screen. It survives
 *  font-size changes, unlike a line or page number. */
export interface Position {
  chapter: number;
  block: number;
  offset: number;
}

export function ReadingView(props: {
  book: EpubBook;
  position: Position;
  size: FontSize;
  dark: boolean;
  theme: Theme;
  onMove: (position: Position) => void;
  onBack: () => void;
  /** False while a menu is open over the page: its buttons belong to the menu then. */
  active: boolean;
}) {
  const { book, position, size } = props;
  const chapters = book.spine.length;
  const blocksOf = (chapter: number) => {
    // The header row shows the chapter title, so a leading heading with the same text is dropped.
    const blocks = book.chapter(chapter);
    const name = book.toc.find((e) => e.index === chapter)?.title;
    return blocks[0]?.kind === "heading" && blocks[0].text === name ? blocks.slice(1) : blocks;
  };
  const layout = useMemo(() => paginate(blocksOf(position.chapter), { size, width: PAGE.width, height: PAGE.height }), [book, position.chapter, size]);
  const per = layout.linesPerPage;
  const total = Math.max(1, Math.ceil(layout.lines.length / per));
  const line = layout.lineOf(position);
  const at = (chapter: number, index: number, lines = layout.lines): Position => {
    const l = lines[Math.max(0, Math.min(index, lines.length - 1))];
    return { chapter, block: l?.block ?? 0, offset: l?.offset ?? 0 };
  };
  const page = Math.floor(line / per) + 1;
  const shown = layout.lines.slice(line, line + per);
  // Dev aid: the computed lines of the page on screen, for host-page tests to compare with what the core drew.
  (globalThis as { __readerPage?: string[] }).__readerPage = shown.map((l) => l.text);
  const title = book.toc.find((e) => e.index === position.chapter)?.title ?? "Section " + (position.chapter + 1);

  const start = (chapter: number): Position => ({ chapter, block: 0, offset: 0 });
  const lastPageOf = (chapter: number): Position => {
    const l = paginate(blocksOf(chapter), { size, width: PAGE.width, height: PAGE.height });
    return at(chapter, Math.floor((l.lines.length - 1) / l.linesPerPage) * l.linesPerPage, l.lines);
  };
  const next = () => {
    if (line + per < layout.lines.length) props.onMove(at(position.chapter, Math.floor(line / per) * per + per));
    else if (position.chapter + 1 < chapters) props.onMove(start(position.chapter + 1));
  };
  const prev = () => {
    if (line > 0) props.onMove(at(position.chapter, Math.max(0, Math.ceil(line / per) * per - per)));
    else if (position.chapter > 0) props.onMove(lastPageOf(position.chapter - 1));
  };
  useButton(BTN.RIGHT, next, { enabled: props.active });
  useButton(BTN.LEFT, prev, { enabled: props.active });
  useButton(BTN.DOWN, () => props.onMove(at(position.chapter, Math.min(line + 3, Math.max(0, layout.lines.length - per)))), { enabled: props.active });
  useButton(BTN.UP, () => props.onMove(at(position.chapter, Math.max(0, line - 3))), { enabled: props.active });
  useButton(BTN.RTRIGGER, () => position.chapter + 1 < chapters && props.onMove(start(position.chapter + 1)), { enabled: props.active });
  useButton(BTN.LTRIGGER, () => position.chapter > 0 && props.onMove(start(position.chapter - 1)), { enabled: props.active });
  useButton(BTN.CROSS, props.onBack, { enabled: props.active });

  return (
    <View className={props.theme.screen}>
      <Text className={props.theme.title}>{title}</Text>
      <View className="flex-row h-[198px]">
        <View className="absolute inset-0 flex-row">
          <View className="w-[228px] h-[198px]" focusable onPress={prev} />
          <View className="w-[228px] h-[198px]" focusable onPress={next} />
        </View>
        <PageView lines={shown} size={size} width={PAGE.width} dark={props.dark} />
      </View>
      <View className="flex-row justify-between">
        <Text className={props.theme.muted}>LEFT/RIGHT page  ·  L/R chapter  ·  START menu</Text>
        <Text className={props.theme.muted}>{"page " + page + "/" + total}</Text>
      </View>
    </View>
  );
}
