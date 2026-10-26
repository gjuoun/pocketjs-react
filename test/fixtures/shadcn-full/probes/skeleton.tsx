// Minimal usage of skeleton as a shadcn consumer writes it (inventory probe, not product code).
import { Skeleton } from "../ui/skeleton.tsx";

export default function Probe() {
  return (
    <div className="w-full h-full flex-col gap-2 p-2 bg-slate-100">
      <Skeleton className="h-4 w-48" />
    </div>
  );
}
