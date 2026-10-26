// Minimal usage of scroll-area as a shadcn consumer writes it (inventory probe, not product code).
import { ScrollArea, ScrollBar } from "../ui/scroll-area.tsx";

export default function Probe() {
  return (
    <div className="w-full h-full flex-col gap-2 p-2 bg-slate-100">
      <ScrollArea className="h-24 w-48">
        <div>
          {Array.from({ length: 10 }, (_, i) => (
            <p key={i}>Row {i}</p>
          ))}
        </div>
        <ScrollBar orientation="vertical" />
      </ScrollArea>
    </div>
  );
}
