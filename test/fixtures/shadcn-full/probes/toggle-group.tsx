// Minimal usage of toggle-group as a shadcn consumer writes it (inventory probe, not product code).
import { ToggleGroup, ToggleGroupItem } from "../ui/toggle-group.tsx";

export default function Probe() {
  return (
    <div className="w-full h-full flex-col gap-2 p-2 bg-slate-100">
      <ToggleGroup type="single" defaultValue="b">
        <ToggleGroupItem value="a">A</ToggleGroupItem>
        <ToggleGroupItem value="b">B</ToggleGroupItem>
      </ToggleGroup>
    </div>
  );
}
