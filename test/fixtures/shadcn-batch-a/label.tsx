// Batch A, Label: a native Label beside a vendored Input, linked by htmlFor and id. A tap on the label
// focuses the input (the label map), as a click on a <label> does on the web.
import { Label } from "pocketjs-react/radix";
import { Input } from "../shadcn-vendor/ui/input.tsx";

export function LabelScreen() {
  return (
    <div className="w-full h-full flex-col items-start gap-2 p-2 bg-slate-100">
      <Label.Root htmlFor="name" className="flex items-center gap-2 text-sm font-bold">
        Name
      </Label.Root>
      <Input id="name" placeholder="Type here" />
    </div>
  );
}
