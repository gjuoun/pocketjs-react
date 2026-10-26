// Minimal usage of toggle as a shadcn consumer writes it (inventory probe, not product code).
import { Toggle } from "../ui/toggle.tsx";

export default function Probe() {
  return (
    <div className="w-full h-full flex-col gap-2 p-2 bg-slate-100">
      <Toggle aria-label="Bold" defaultPressed>
        B
      </Toggle>
    </div>
  );
}
