// Minimal usage of bubble as a shadcn consumer writes it (inventory probe, not product code).
import { BubbleGroup, Bubble, BubbleContent } from "../ui/bubble.tsx";

export default function Probe() {
  return (
    <div className="w-full h-full flex-col gap-2 p-2 bg-slate-100">
      <BubbleGroup>
        <Bubble>
          <BubbleContent>Hello</BubbleContent>
        </Bubble>
      </BubbleGroup>
    </div>
  );
}
