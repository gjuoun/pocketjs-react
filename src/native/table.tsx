// Table: rows of cells at fixed column widths, so every row's columns line up. Table takes the columns (a width in px and a text
// alignment each) and the row style: "divider" (a 1 px rule between body rows) or "zebra" (every other body row tinted). Each
// row is centred vertically. A cell is clipped to its column and does not wrap or measure its text: the core has neither, so a
// cell whose text is wider than its column is a caller error, reported by the tests and by the judge's overflow gate.
import { Children, cloneElement, createContext, isValidElement, type ReactElement, type ReactNode, useContext } from "react";
import { Text, View } from "../elements.ts";
import { useTokens } from "./theme.tsx";

export type TableAlign = "left" | "center" | "right";
export interface TableColumn {
  width: number;
  align?: TableAlign;
}

interface TableContextValue {
  rows: "divider" | "zebra";
}
const Ctx = createContext<TableContextValue>({ rows: "divider" });

export interface TableProps {
  columns: TableColumn[];
  rows?: "divider" | "zebra";
  children?: ReactNode;
}

const ColumnsContext = createContext<TableColumn[]>([]);

export function Table(props: TableProps) {
  return (
    <Ctx.Provider value={{ rows: props.rows ?? "divider" }}>
      <ColumnsContext.Provider value={props.columns}>
        <View className="flex-col" debugName="table">{props.children}</View>
      </ColumnsContext.Provider>
    </Ctx.Provider>
  );
}

export function TableHeader(props: { children?: ReactNode }) {
  return <View className="flex-col">{props.children}</View>;
}

/** The body: its rows get their index (for zebra) and, in divider mode, a rule between each pair of rows. */
export function TableBody(props: { children?: ReactNode }) {
  const T = useTokens() as Record<string, string>;
  const { rows } = useContext(Ctx);
  const items = Children.toArray(props.children);
  const out: ReactNode[] = [];
  items.forEach((child, i) => {
    if (i > 0 && rows === "divider") out.push(<View key={"rule-" + i} className={T["separator.horizontal"]} />);
    out.push(isValidElement(child) ? cloneElement(child as ReactElement<{ index?: number }>, { index: i }) : child);
  });
  return <View className="flex-col">{out}</View>;
}

export interface TableRowProps {
  /** Set by TableBody: the row's place in the body (zebra tints the odd ones). */
  index?: number;
  children?: ReactNode;
}

export function TableRow(props: TableRowProps) {
  const T = useTokens() as Record<string, string>;
  const { rows } = useContext(Ctx);
  const columns = useContext(ColumnsContext);
  const zebra = rows === "zebra" && props.index !== undefined && props.index % 2 === 1;
  const cells = Children.toArray(props.children).map((child, i) =>
    isValidElement(child) ? cloneElement(child as ReactElement<{ column?: TableColumn }>, { column: columns[i] }) : child,
  );
  return (
    <View className={[T["table.row"], zebra ? T["table.zebra"] : ""].join(" ")} debugName="table-row">
      {cells}
    </View>
  );
}

interface CellProps {
  column?: TableColumn;
  children?: string;
}

function Cell(props: CellProps & { head: boolean }) {
  const T = useTokens() as Record<string, string>;
  const align = props.column?.align ?? "left";
  const look = [T["table.cell"], T["table.align." + align]].join(" ");
  const text = props.head ? T["table.head.text"] : T["table.cell.text"];
  return (
    <View className={look} style={props.column ? { width: props.column.width } : undefined} debugName={props.head ? "table-head" : "table-cell"}>
      <Text className={text}>{props.children}</Text>
    </View>
  );
}

export function TableHead(props: CellProps) {
  return <Cell head column={props.column}>{props.children}</Cell>;
}

export function TableCell(props: CellProps) {
  return <Cell head={false} column={props.column}>{props.children}</Cell>;
}
