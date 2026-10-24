// C4b browser fixture: field A is typed with physical keys (direct mode); field B is typed through
// the pad's on-screen keyboard. Both are controlled; every onChange is logged on window. The
// shoulder counter proves letter keys typed into A never press the L shoulder button.
import { BTN, mount, useButton } from "pocketjs-react";
import { useState } from "react";

const g = globalThis as Record<string, unknown>;
const log = (name: string, value: string) => {
  const list = (g[name] as string[] | undefined) ?? [];
  g[name] = [...list, value];
};

function App() {
  const [a, setA] = useState("");
  const [b, setB] = useState("");
  useButton(BTN.LTRIGGER, () => {
    g.__shoulder = ((g.__shoulder as number | undefined) ?? 0) + 1;
  });
  return (
    <div className="w-full h-full flex-col gap-1 p-2 bg-slate-100">
      <input
        placeholder="A"
        value={a}
        onChange={(e) => {
          log("__a", e.target.value);
          setA(e.target.value);
        }}
      />
      <input
        placeholder="B"
        value={b}
        onChange={(e) => {
          log("__b", e.target.value);
          setB(e.target.value);
        }}
      />
    </div>
  );
}

mount(<App />);
