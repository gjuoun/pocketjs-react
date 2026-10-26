// Batch A, Separator: one horizontal and one vertical native separator, each in a 200x40 box of the
// page colour, with the caller's selector tokens as the codemod writes them.
import { Separator } from "pocketjs-react/radix";

export function SeparatorScreen() {
  return (
    <div className="w-full h-full flex-col items-start gap-2 p-2 bg-slate-100">
      <div className="w-[200px] h-[40px] flex-col bg-slate-100">
        <Separator.Root
          orientation="horizontal"
          className="shrink-0 bg-slate-200 data-[orientation=horizontal]:h-[1px] data-[orientation=horizontal]:w-full"
        />
      </div>
      <div className="w-[200px] h-[40px] flex-row bg-slate-100">
        <Separator.Root
          orientation="vertical"
          className="shrink-0 bg-slate-200 data-[orientation=vertical]:h-full data-[orientation=vertical]:w-[1px]"
        />
      </div>
    </div>
  );
}
