// Minimal usage of tooltip as a shadcn consumer writes it (inventory probe, not product code).
import {
  TooltipProvider,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "../ui/tooltip.tsx";

export default function Probe() {
  return (
    <div className="w-full h-full flex-col gap-2 p-2 bg-slate-100">
      <TooltipProvider>
        <Tooltip defaultOpen>
          <TooltipTrigger>Hover</TooltipTrigger>
          <TooltipContent>Add</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}
