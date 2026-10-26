// Minimal usage of progress as a shadcn consumer writes it (inventory probe, not product code).
import { Progress } from "../ui/progress.tsx";

export default function Probe() {
  return (
    <div className="w-full h-full flex-col gap-2 p-2 bg-slate-100">
      <Progress value={60} />
    </div>
  );
}
