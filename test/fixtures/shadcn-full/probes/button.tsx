// Minimal usage of button as a shadcn consumer writes it (inventory probe, not product code).
import { Button } from "../ui/button.tsx";

export default function Probe() {
  return (
    <div className="w-full h-full flex-col gap-2 p-2 bg-slate-100">
      <Button>Save</Button>
    </div>
  );
}
