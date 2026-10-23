// Fixture: the C1 acceptance probe - verbatim shadcn Button + Badge under the product
// mount() on the real wasm core. The app is written in plain React DOM vocabulary.
import { useState } from "react";
import { mount } from "pocketjs-react";
import { Button } from "./button.tsx";
import { Badge } from "./badge.tsx";

function App() {
  const [pressed, setPressed] = useState(0);
  return (
    <div className="w-full h-full flex-col gap-2 p-4 bg-slate-900">
      <Button onClick={() => setPressed(pressed + 1)}>Save</Button>
      <Badge variant="secondary">Beta</Badge>
      <span>{"pressed " + pressed}</span>
    </div>
  );
}

mount(<App />);
