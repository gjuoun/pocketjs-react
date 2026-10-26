// React inline styles (camelCase CSS) -> PocketJS core props. Only properties the core can
// draw are mapped; any other key throws with its name, so nothing is silently ignored.
import { ENUMS, type PropName, SIZE_FULL } from "../internal/pocket.ts";

export type CoreStyle = Partial<Record<PropName, number | string>>;
type Setter = (value: unknown, out: CoreStyle) => void;

function fail(key: string, expected: string, value: unknown): never {
  throw new Error(
    "pocketjs-react: style." +
      key +
      " must be " +
      expected +
      ", got " +
      JSON.stringify(value),
  );
}

function px(key: string, value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    if (value === "100%") return SIZE_FULL;
    const m = /^(-?\d+(?:\.\d+)?)(px|rem)?$/.exec(value.trim());
    if (m) return parseFloat(m[1]) * (m[2] === "rem" ? 16 : 1);
  }
  return fail(key, 'a px number, "Npx" or "100%"', value);
}

function num(key: string, value: unknown): number {
  return typeof value === "number" ? value : fail(key, "a number", value);
}

function color(key: string, value: unknown): string {
  if (typeof value !== "string") return fail(key, "a color string", value);
  const v = value.trim();
  if (/^#([0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(v)) return v;
  const m =
    /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+)\s*)?\)$/.exec(
      v,
    );
  if (m) {
    const hex = (n: number) =>
      Math.max(0, Math.min(255, Math.round(n)))
        .toString(16)
        .padStart(2, "0");
    const alpha = m[4] === undefined ? 1 : parseFloat(m[4]);
    return "#" + hex(+m[1]) + hex(+m[2]) + hex(+m[3]) + hex(alpha * 255);
  }
  return fail(key, "#hex, rgb() or rgba()", value);
}

function keyword(
  key: string,
  table: Record<string, number>,
): (value: unknown) => number {
  return (value) =>
    typeof value === "string" && value in table
      ? table[value]
      : fail(key, "one of " + Object.keys(table).join(" | "), value);
}

const JUSTIFY = {
  start: ENUMS.Justify.Start,
  "flex-start": ENUMS.Justify.Start,
  center: ENUMS.Justify.Center,
  end: ENUMS.Justify.End,
  "flex-end": ENUMS.Justify.End,
  "space-between": ENUMS.Justify.Between,
  "space-around": ENUMS.Justify.Around,
};
const ALIGN = {
  start: ENUMS.Align.Start,
  "flex-start": ENUMS.Align.Start,
  center: ENUMS.Align.Center,
  end: ENUMS.Align.End,
  "flex-end": ENUMS.Align.End,
  stretch: ENUMS.Align.Stretch,
};

const sides =
  (key: string, props: PropName[]): Setter =>
  (value, out) => {
    const n = px(key, value);
    for (const p of props) out[p] = n;
  };
const one =
  (
    key: string,
    prop: PropName,
    read: (key: string, value: unknown) => number | string,
  ): Setter =>
  (value, out) => {
    out[prop] = read(key, value);
  };

/** The mapping table (README documents the same list). */
export const CSS_TO_CORE: Record<string, Setter> = {
  width: one("width", "width", px),
  height: one("height", "height", px),
  minWidth: one("minWidth", "minW", px),
  minHeight: one("minHeight", "minH", px),
  maxWidth: one("maxWidth", "maxW", px),
  maxHeight: one("maxHeight", "maxH", px),
  padding: sides("padding", ["paddingT", "paddingR", "paddingB", "paddingL"]),
  paddingTop: one("paddingTop", "paddingT", px),
  paddingRight: one("paddingRight", "paddingR", px),
  paddingBottom: one("paddingBottom", "paddingB", px),
  paddingLeft: one("paddingLeft", "paddingL", px),
  margin: sides("margin", ["marginT", "marginR", "marginB", "marginL"]),
  marginTop: one("marginTop", "marginT", px),
  marginRight: one("marginRight", "marginR", px),
  marginBottom: one("marginBottom", "marginB", px),
  marginLeft: one("marginLeft", "marginL", px),
  gap: one("gap", "gap", px),
  flexDirection: (v, o) => {
    o.flexDir = keyword("flexDirection", {
      row: ENUMS.FlexDir.Row,
      column: ENUMS.FlexDir.Col,
    })(v);
  },
  flexWrap: (v, o) => {
    o.flexWrap = keyword("flexWrap", { nowrap: 0, wrap: 1 })(v);
  },
  justifyContent: (v, o) => {
    o.justify = keyword("justifyContent", JUSTIFY)(v);
  },
  alignItems: (v, o) => {
    o.align = keyword("alignItems", ALIGN)(v);
  },
  flexGrow: one("flexGrow", "grow", num),
  flexShrink: one("flexShrink", "shrink", num),
  flexBasis: one("flexBasis", "basis", px),
  position: (v, o) => {
    o.posType = keyword("position", {
      relative: ENUMS.PosType.Relative,
      absolute: ENUMS.PosType.Absolute,
    })(v);
  },
  top: one("top", "insetT", px),
  right: one("right", "insetR", px),
  bottom: one("bottom", "insetB", px),
  left: one("left", "insetL", px),
  display: (v, o) => {
    o.display = keyword("display", {
      flex: ENUMS.Display.Flex,
      none: ENUMS.Display.None,
    })(v);
  },
  overflow: (v, o) => {
    o.overflow = keyword("overflow", {
      visible: ENUMS.Overflow.Visible,
      hidden: ENUMS.Overflow.Hidden,
    })(v);
  },
  zIndex: one("zIndex", "zIndex", num),
  backgroundColor: one("backgroundColor", "bgColor", color),
  borderColor: one("borderColor", "borderColor", color),
  color: one("color", "textColor", color),
  borderRadius: one("borderRadius", "radius", px),
  borderWidth: one("borderWidth", "borderWidth", px),
  opacity: one("opacity", "opacity", num),
  textAlign: (v, o) => {
    o.textAlign = keyword("textAlign", {
      left: ENUMS.TextAlign.Left,
      center: ENUMS.TextAlign.Center,
      right: ENUMS.TextAlign.Right,
    })(v);
  },
  lineHeight: one("lineHeight", "lineHeight", px),
  letterSpacing: one("letterSpacing", "tracking", px),
  translateX: one("translateX", "translateX", px),
  translateY: one("translateY", "translateY", px),
};

/** Core defaults for every prop the table writes (engine/core/src/style.rs Resolved::default). */
export const CORE_DEFAULTS: CoreStyle = {
  width: NaN,
  height: NaN,
  minW: NaN,
  minH: NaN,
  maxW: NaN,
  maxH: NaN,
  paddingT: 0,
  paddingR: 0,
  paddingB: 0,
  paddingL: 0,
  marginT: 0,
  marginR: 0,
  marginB: 0,
  marginL: 0,
  gap: 0,
  flexDir: ENUMS.FlexDir.Row,
  flexWrap: 0,
  justify: ENUMS.Justify.Start,
  align: ENUMS.Align.Stretch,
  grow: 0,
  shrink: 1,
  basis: NaN,
  posType: ENUMS.PosType.Relative,
  insetT: NaN,
  insetR: NaN,
  insetB: NaN,
  insetL: NaN,
  display: ENUMS.Display.Flex,
  overflow: ENUMS.Overflow.Visible,
  zIndex: 0,
  bgColor: 0,
  borderColor: 0,
  textColor: 0xffffffff,
  radius: 0,
  borderWidth: 0,
  opacity: 1,
  textAlign: ENUMS.TextAlign.Left,
  lineHeight: NaN,
  tracking: 0,
};

/** The custom properties (`--name`) of a style. They never reach the core: a var binding reads them (src/style/vars.ts). */
export function cssVars(style: unknown): Record<string, string> {
  const out: Record<string, string> = {};
  if (style == null || typeof style !== "object") return out;
  for (const [key, value] of Object.entries(style as Record<string, unknown>))
    if (key.startsWith("--") && value != null) out[key] = String(value);
  return out;
}

export function cssToCore(style: unknown): CoreStyle {
  const out: CoreStyle = {};
  if (style == null) return out;
  if (typeof style !== "object")
    throw new Error("pocketjs-react: style must be an object");
  for (const [key, value] of Object.entries(style as Record<string, unknown>)) {
    if (key.startsWith("--")) continue;
    const set = CSS_TO_CORE[key];
    if (!set)
      throw new Error(
        "pocketjs-react: style." +
          key +
          " is not supported by the PocketJS core",
      );
    if (value != null) set(value, out);
  }
  return out;
}
