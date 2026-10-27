// Percent lengths on the real core: a 200 x 100 parent (inline width, so a frame can narrow it), children with
// fractions of it, one child of the screen root (the viewport), and a translate that is a share of the node itself.
// The marker colours (bg-red-500, bg-blue-500, bg-slate-900, bg-white) are what the test finds the nodes by.
import { useState } from "react";
import { View } from "pocketjs-react";
import { useFrame } from "../../../src/renderer/use-frame.ts";

// The screen-root panel is a quarter of the screen: clear of the parent, so the stock hit-test box of the parent is whole.
/** The test sets narrow to true; the parent then narrows from 200 to 120 px, and every fraction of it must follow. */
export const control = { narrow: false };

export function PercentScreen() {
  const [parentW, setParentW] = useState(200);
  useFrame(() => {
    if (control.narrow) setParentW(120);
  });
  return (
    <View className="relative w-full h-full">
      <View className="absolute left-0 top-0 bg-slate-200" style={{ width: parentW, height: 100 }}>
        <View className="absolute top-1/2 left-1/4 w-1/2 h-1/2 bg-red-500" />
        <View className="absolute bottom-0 right-0 w-3/4 max-w-1/4 h-1/4 bg-blue-500" />
        <View className="absolute left-0 bottom-0 w-[10px] min-h-1/2 bg-slate-900" />
      </View>
      <View className="absolute right-0 top-0 h-full w-1/4 bg-white" />
      <View className="absolute left-0 top-[150px] w-[40px] h-[20px] translate-x-1/2 translate-y-1/4 bg-green-500" />
    </View>
  );
}
