// Minimal usage of badge as a shadcn consumer writes it (inventory probe, not product code).
import { Badge } from "../ui/badge.tsx";

export default function Probe() {
  return (
    <div className="w-full h-full flex-col gap-2 p-2 bg-slate-100">
      <Badge variant="secondary">Beta</Badge>
    </div>
  );
}
