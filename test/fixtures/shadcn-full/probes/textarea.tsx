// Minimal usage of textarea as a shadcn consumer writes it (inventory probe, not product code).
import { Textarea } from "../ui/textarea.tsx";

export default function Probe() {
  return (
    <div className="w-full h-full flex-col gap-2 p-2 bg-slate-100">
      <Textarea placeholder="Message" />
    </div>
  );
}
