// Minimal usage of direction as a shadcn consumer writes it (inventory probe, not product code).
import { DirectionProvider } from "../ui/direction.tsx";

export default function Probe() {
  return (
    <div className="w-full h-full flex-col gap-2 p-2 bg-slate-100">
      <DirectionProvider direction="rtl">
        <span>Text</span>
      </DirectionProvider>
    </div>
  );
}
