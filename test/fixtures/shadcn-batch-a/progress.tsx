// Batch A, Progress: five 200px tracks in the vendored shape (the value rides the indicator's transform),
// one with an explicit value prop, and one indeterminate. The track is slate-300 and the fill slate-900.
import { Progress } from "pocketjs-react/radix";

export function ProgressScreen() {
  return (
    <div className="w-full h-full flex-col items-start gap-2 p-2 bg-slate-100">
      <Progress.Root className="w-[200px]">
        <Progress.Indicator style={{ transform: `translateX(-${100 - 0}%)` }} />
      </Progress.Root>
      <Progress.Root className="w-[200px]">
        <Progress.Indicator style={{ transform: `translateX(-${100 - 50}%)` }} />
      </Progress.Root>
      <Progress.Root className="w-[200px]">
        <Progress.Indicator style={{ transform: `translateX(-${100 - 100}%)` }} />
      </Progress.Root>
      <Progress.Root className="w-[200px]" value={25}>
        <Progress.Indicator />
      </Progress.Root>
      <Progress.Root className="w-[200px]" value={null} />
    </div>
  );
}
