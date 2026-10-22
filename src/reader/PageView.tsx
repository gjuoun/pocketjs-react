// Draws one page: every line is a Text node at the size's fixed pitch, so the page's layout is
// exactly the pagination's.
import { Text, View } from "../elements.ts";
import { cn } from "../style/cn.ts";
import { FONT_SIZES, type FontSize, type Line } from "./paginate.ts";

export function PageView(props: { lines: Line[]; size: FontSize; width: number; dark?: boolean }) {
  const size = FONT_SIZES[props.size];
  return (
    <View className="flex-col" style={{ width: props.width }}>
      {props.lines.map((line, i) => (
        <Text
          key={i}
          className={cn(
            line.kind === "heading" ? size.heading : size.body,
            props.dark ? "text-slate-100" : "text-slate-900",
            line.kind === "figure" && (props.dark ? "text-sky-300" : "text-sky-800"),
            line.kind === "pre" && (props.dark ? "text-amber-200" : "text-amber-900"),
          )}
          style={{ height: size.pitch }}
        >
          {line.text || " "}
        </Text>
      ))}
    </View>
  );
}
