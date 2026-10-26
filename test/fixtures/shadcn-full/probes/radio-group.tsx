// Minimal usage of radio-group as a shadcn consumer writes it (inventory probe, not product code).
import { RadioGroup, RadioGroupItem } from "../ui/radio-group.tsx";

export default function Probe() {
  return (
    <div className="w-full h-full flex-col gap-2 p-2 bg-slate-100">
      <RadioGroup defaultValue="a">
        <RadioGroupItem value="a" id="a" />
        <RadioGroupItem value="b" id="b" />
      </RadioGroup>
    </div>
  );
}
