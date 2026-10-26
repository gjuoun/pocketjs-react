// Minimal usage of checkbox as a shadcn consumer writes it (inventory probe, not product code).
import { Checkbox } from "../ui/checkbox.tsx";

export default function Probe() {
  return (
    <div className="w-full h-full flex-col gap-2 p-2 bg-slate-100">
      <Checkbox defaultChecked />
    </div>
  );
}
