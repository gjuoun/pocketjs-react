// C4 consumer entry: the vendored shadcn Input, unedited (ui/input.tsx is codemod output and
// is never hand-edited), driven as a controlled field. Nothing here is shadcn source.
import { mount } from "pocketjs-react";
import { useState } from "react";
import { Input } from "./ui/input.tsx";

export function Field() {
  const [value, setValue] = useState("");
  return (
    <div className="w-full h-full flex-col gap-1 p-2 bg-slate-100">
      <Input
        placeholder="Name"
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />
    </div>
  );
}

mount(<Field />);
