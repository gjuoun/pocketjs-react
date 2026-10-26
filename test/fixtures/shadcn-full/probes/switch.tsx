// Minimal usage of switch as a shadcn consumer writes it (inventory probe, not product code).
import { Switch } from "../ui/switch.tsx";

export default function Probe() {
  return (
    <div className="w-full h-full flex-col gap-2 p-2 bg-slate-100">
      <Switch defaultChecked />
    </div>
  );
}
