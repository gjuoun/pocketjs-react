// Icon sheet fixture (test-only): the six demo glyph icons in three surfaces, one row per colour variant,
// then ten cold lucide names (digit-bearing, an alias, plain) on a white surface.
import {
  CheckIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  ChevronUpIcon,
  CircleIcon,
  XIcon,
  AccessibilityIcon,
  AlarmCheckIcon,
  ArrowDown01Icon,
  BatteryIcon,
  BrainCircuitIcon,
  Clock6Icon,
  CloudRainIcon,
  DiamondIcon,
  Grid2x2Icon,
  WifiOffIcon,
} from "pocketjs-react/glyph-icons";

export function IconSheet() {
  return (
    <div className="flex flex-col gap-2 p-2 bg-slate-100">
      <div className="flex flex-row items-center gap-3 p-2 bg-white text-slate-900">
        <ChevronDownIcon className="size-4" />
        <ChevronUpIcon className="size-4" />
        <ChevronRightIcon className="size-4" />
        <XIcon />
        <CheckIcon className="size-4" />
        <CircleIcon className="size-2 fill-current" />
      </div>
      <div className="flex flex-row items-center gap-3 p-2 bg-white text-slate-500">
        <ChevronDownIcon className="size-4" />
        <ChevronUpIcon className="size-4" />
        <ChevronRightIcon className="size-4" />
        <XIcon />
        <CheckIcon className="size-4" />
        <CircleIcon className="size-2 fill-current" />
      </div>
      <div className="flex flex-row items-center gap-3 p-2 bg-slate-900 text-white">
        <ChevronDownIcon className="size-4" />
        <ChevronUpIcon className="size-4" />
        <ChevronRightIcon className="size-4" />
        <XIcon />
        <CheckIcon className="size-4" />
        <CircleIcon className="size-2 fill-current" />
      </div>
      <div className="flex flex-row items-center gap-3 p-2 bg-white text-slate-900">
        <Grid2x2Icon className="size-4" />
        <Clock6Icon className="size-4" />
        <ArrowDown01Icon className="size-4" />
        <AlarmCheckIcon className="size-4" />
        <AccessibilityIcon className="size-4" />
        <BatteryIcon className="size-4" />
        <CloudRainIcon className="size-4" />
        <DiamondIcon className="size-4" />
        <WifiOffIcon className="size-4" />
        <BrainCircuitIcon className="size-4" />
      </div>
    </div>
  );
}
