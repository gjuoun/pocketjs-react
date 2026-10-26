// Minimal usage of label as a shadcn consumer writes it (inventory probe, not product code).
import { Label } from "../ui/label.tsx";

export default function Probe() {
  return (
    <div className="w-full h-full flex-col gap-2 p-2 bg-slate-100">
      <Label htmlFor="x">Email</Label>
    </div>
  );
}
