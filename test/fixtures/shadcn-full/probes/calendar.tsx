// Minimal usage of calendar as a shadcn consumer writes it (inventory probe, not product code).
import { Calendar } from "../ui/calendar.tsx";

export default function Probe() {
  return (
    <div className="w-full h-full flex-col gap-2 p-2 bg-slate-100">
      <Calendar mode="single" selected={new Date(2026, 9, 26)} />
    </div>
  );
}
