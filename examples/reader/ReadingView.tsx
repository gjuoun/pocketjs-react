// Reading view: LEFT/RIGHT turn pages (across chapter edges), UP/DOWN scroll by three lines,
// L/R jump to the previous/next chapter, CROSS goes back to the contents. Mouse: click the left
// or right half of the page to turn it.
import { useMemo } from "react";
import { BTN, PageView, Text, useButton, View, paginate, type EpubBook, type FontSize } from "pocketjs-react";
import type { Theme } from "./theme.ts";

export const PAGE = { width: 456, height: 198 };

export interface Position {
  chapter: number;
  line: number;
}

export function ReadingView(props: {
  book: EpubBook;
  position: Position;
  size: FontSize;
  dark: boolean;
  theme: Theme;
  onMove: (position: Position) => void;
  onBack: () => void;
}) {
  const { book, position, size } = props;
  const chapters = book.spine.length;
  const layout = useMemo(() => paginate(book.chapter(position.chapter), { size, width: PAGE.width, height: PAGE.height }), [book, position.chapter, size]);
  const per = layout.linesPerPage;
  const total = Math.max(1, Math.ceil(layout.lines.length / per));
  const line = Math.min(position.line, Math.max(0, layout.lines.length - 1));
  const page = Math.floor(line / per) + 1;
  const title = book.toc.find((e) => e.index === position.chapter)?.title ?? "Section " + (position.chapter + 1);

  const lastLineOf = (chapter: number) => {
    const l = paginate(book.chapter(chapter), { size, width: PAGE.width, height: PAGE.height });
    return Math.max(0, Math.floor((l.lines.length - 1) / l.linesPerPage) * l.linesPerPage);
  };
  const next = () => {
    if (line + per < layout.lines.length) props.onMove({ chapter: position.chapter, line: Math.floor(line / per) * per + per });
    else if (position.chapter + 1 < chapters) props.onMove({ chapter: position.chapter + 1, line: 0 });
  };
  const prev = () => {
    if (line > 0) props.onMove({ chapter: position.chapter, line: Math.max(0, Math.ceil(line / per) * per - per) });
    else if (position.chapter > 0) props.onMove({ chapter: position.chapter - 1, line: lastLineOf(position.chapter - 1) });
  };
  useButton(BTN.RIGHT, next);
  useButton(BTN.LEFT, prev);
  useButton(BTN.DOWN, () => props.onMove({ chapter: position.chapter, line: Math.min(line + 3, Math.max(0, layout.lines.length - per)) }));
  useButton(BTN.UP, () => props.onMove({ chapter: position.chapter, line: Math.max(0, line - 3) }));
  useButton(BTN.RTRIGGER, () => position.chapter + 1 < chapters && props.onMove({ chapter: position.chapter + 1, line: 0 }));
  useButton(BTN.LTRIGGER, () => position.chapter > 0 && props.onMove({ chapter: position.chapter - 1, line: 0 }));
  useButton(BTN.CROSS, props.onBack);

  return (
    <View className={props.theme.screen}>
      <View className="flex-row justify-between h-[18px]">
        <Text className={props.theme.title}>{title}</Text>
        <Text className={props.theme.muted}>{"page " + page + "/" + total}</Text>
      </View>
      <View className="flex-row h-[198px]">
        <View className="absolute inset-0 flex-row">
          <View className="w-[228px] h-[198px]" focusable onPress={prev} />
          <View className="w-[228px] h-[198px]" focusable onPress={next} />
        </View>
        <PageView lines={layout.lines.slice(line, line + per)} size={size} width={PAGE.width} dark={props.dark} />
      </View>
      <Text className={props.theme.muted}>LEFT/RIGHT page  ·  UP/DOWN scroll  ·  L/R chapter  ·  START menu</Text>
    </View>
  );
}
