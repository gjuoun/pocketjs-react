// Minimal usage of spinner as a shadcn consumer writes it (inventory probe, not product code).
import { Spinner } from "../ui/spinner.tsx";

export default function Probe() {
  return (
    <div className="w-full h-full flex-col gap-2 p-2 bg-slate-100">
      <Spinner />
    </div>
  );
}
