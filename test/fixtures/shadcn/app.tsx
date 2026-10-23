// Fixture app: the C1 acceptance probe - verbatim shadcn Button + Badge written in plain
// React DOM vocabulary. main.tsx mounts it through the product mount(); the in-process
// test mounts the same component for mirror-level tree assertions.
import { useState } from "react";
import { Button } from "./button.tsx";
import { Badge } from "./badge.tsx";

export function App() {
  const [pressed, setPressed] = useState(0);
  return (
    <div className="w-full h-full flex-col gap-2 p-4 bg-slate-900">
      <Button className="focus:bg-blue-600" onClick={() => setPressed(pressed + 1)}>Save</Button>
      <Badge variant="secondary">Beta</Badge>
      <span>{"pressed " + pressed}</span>
    </div>
  );
}
