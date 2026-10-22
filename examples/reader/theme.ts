// Light and dark theme classes for the reader screens (full literals, so the build compiles them).
export interface Theme {
  screen: string;
  title: string;
  muted: string;
  card: string;
  /** Contents rows, merged over the List defaults with cn. */
  row: string;
  rowText: string;
}

export const LIGHT: Theme = {
  screen: "w-full h-full flex-col gap-1 p-3 bg-white",
  title: "text-sm text-slate-900 font-bold",
  muted: "text-xs text-slate-500",
  card: "w-[456px] h-[52px] flex-col justify-center gap-1 px-3 rounded-lg bg-slate-100 focus:bg-blue-200",
  row: "bg-slate-100 focus:bg-blue-200",
  rowText: "text-sm text-slate-900",
};

export const DARK: Theme = {
  screen: "w-full h-full flex-col gap-1 p-3 bg-slate-950",
  title: "text-sm text-slate-100 font-bold",
  muted: "text-xs text-slate-400",
  card: "w-[456px] h-[52px] flex-col justify-center gap-1 px-3 rounded-lg bg-slate-800 focus:bg-blue-700",
  row: "bg-slate-800 focus:bg-blue-700",
  rowText: "text-sm text-slate-100",
};
