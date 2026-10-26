// Minimal usage of slider as a shadcn consumer writes it (inventory probe, not product code).
import { Slider } from "../ui/slider.tsx";

export default function Probe() {
  return (
    <div className="w-full h-full flex-col gap-2 p-2 bg-slate-100">
      <Slider defaultValue={[40]} max={100} />
    </div>
  );
}
