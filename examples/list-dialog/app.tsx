// Example: a d-pad list of toggles and a confirmation dialog.
//   - row classes are built with cn (clsx + tailwind-merge) from state,
//   - the badge uses clsx with a condition and an object,
//   - the progress bar uses a CSS-named inline style inside a w-[120px] track,
//   - the dialog traps focus, closes on CROSS (back) and restores focus.
import { useState } from "react";
import { clsx } from "clsx";
import { cn, Dialog, List, Text, View } from "pocketjs-react";

const ITEMS = ["Alpha", "Bravo", "Charlie", "Delta", "Echo", "Foxtrot"];
const OPEN = "Open dialog";

export function App() {
  const [on, setOn] = useState<boolean[]>(() => ITEMS.map(() => false));
  const [open, setOpen] = useState(false);
  const count = on.filter(Boolean).length;
  const rows = [...ITEMS, OPEN];
  return (
    <View className="w-full h-full flex-col gap-1 p-4 bg-slate-900">
      <View className="flex-row items-center gap-2">
        <Text className="text-base text-white font-bold">pocketjs-react</Text>
        <View className="w-[120px] h-[10px] bg-slate-700">
          <View style={{ width: 20 * count, height: 10, backgroundColor: count > 1 ? "#22c55e" : "rgb(234, 179, 8)", opacity: open ? 0.5 : 1 }} />
        </View>
      </View>
      <List
        items={rows}
        keyOf={(label) => label}
        itemClassName={(label, i) => label !== OPEN && on[i] && "px-6 bg-emerald-700"}
        onSelect={(label, i) => (label === OPEN ? setOpen(true) : setOn((prev) => prev.map((v, j) => (j === i ? !v : v))))}
        renderItem={(label, i) => {
          const active = label === OPEN ? open : on[i];
          return (
            <>
              <Text className={cn("text-sm text-white", active && "font-bold")}>{label}</Text>
              <View className={clsx("px-2", active && "bg-blue-600", { "opacity-50": label === "Charlie" })}>
                <Text className="text-sm text-emerald-400">{active ? "ON" : "off"}</Text>
              </View>
            </>
          );
        }}
      />
      <Dialog open={open} onClose={() => setOpen(false)} title="Discard changes?">
        <View className="flex-row gap-2">
          <View className="px-3 py-1 rounded bg-slate-200 focus:bg-blue-600" focusable onPress={() => setOpen(false)}>
            <Text className="text-sm text-slate-950">Keep</Text>
          </View>
          <View
            className="px-3 py-1 rounded bg-slate-200 focus:bg-blue-600"
            focusable
            onPress={() => {
              setOn(ITEMS.map(() => false));
              setOpen(false);
            }}
          >
            <Text className="text-sm text-slate-950">Discard</Text>
          </View>
        </View>
      </Dialog>
    </View>
  );
}
