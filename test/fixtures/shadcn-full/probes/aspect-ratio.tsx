// Minimal usage of aspect-ratio as a shadcn consumer writes it (inventory probe, not product code).
import { AspectRatio } from "../ui/aspect-ratio.tsx";

export default function Probe() {
  return (
    <div className="w-full h-full flex-col gap-2 p-2 bg-slate-100">
      <AspectRatio ratio={16 / 9}>
        <div className="w-full h-full bg-slate-200" />
      </AspectRatio>
    </div>
  );
}
