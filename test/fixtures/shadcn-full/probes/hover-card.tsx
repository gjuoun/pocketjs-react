// Minimal usage of hover-card as a shadcn consumer writes it (inventory probe, not product code).
import {
  HoverCard,
  HoverCardTrigger,
  HoverCardContent,
} from "../ui/hover-card.tsx";

export default function Probe() {
  return (
    <div className="w-full h-full flex-col gap-2 p-2 bg-slate-100">
      <HoverCard defaultOpen>
        <HoverCardTrigger>@jun</HoverCardTrigger>
        <HoverCardContent>Joined 2023</HoverCardContent>
      </HoverCard>
    </div>
  );
}
