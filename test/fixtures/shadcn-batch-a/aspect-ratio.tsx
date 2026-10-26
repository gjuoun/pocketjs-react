// Batch A, AspectRatio: a 2:1 and a 16:9 box in 200px wide columns, each child named for the test.
// `resize` moves the first column to 120px, the same instance, to check a width change.
import { useState } from "react";
import { View } from "pocketjs-react";
import { AspectRatio } from "pocketjs-react/radix";

export let resize: (width: number) => void = () => {};

export function AspectScreen() {
  const [wide, setWide] = useState(true);
  resize = (width: number) => setWide(width === 200);
  return (
    <div className="w-full h-full flex-col items-start gap-2 p-2 bg-slate-100">
      <div className={wide ? "w-[200px] flex-col" : "w-[120px] flex-col"}>
        <AspectRatio.Root ratio={2}>
          <View debugName="ratio-2" className="w-full h-full bg-slate-900" />
        </AspectRatio.Root>
      </div>
      <div className="w-[200px] flex-col">
        <AspectRatio.Root ratio={16 / 9}>
          <View debugName="ratio-16x9" className="w-full h-full bg-slate-900" />
        </AspectRatio.Root>
      </div>
    </div>
  );
}
