// Minimal usage of chart as a shadcn consumer writes it (inventory probe, not product code).
import { ChartContainer } from "../ui/chart.tsx";

export default function Probe() {
  return (
    <div className="w-full h-full flex-col gap-2 p-2 bg-slate-100">
      <ChartContainer config={{ v: { label: "Visits", color: "#0f172a" } }}>
        <div className="h-40 w-full bg-slate-100" />
      </ChartContainer>
    </div>
  );
}
