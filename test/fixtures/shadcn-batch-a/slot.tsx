// Batch A, Slot: the vendored Button as a consumer writes it, with asChild on an anchor. The
// Button's class, press and handlers merge onto the anchor, and no wrapper node is drawn.
import { Button } from "../shadcn-vendor/ui/button.tsx";

export function SlotScreen(props: { onGo?: () => void; onChild?: () => void }) {
  return (
    <div className="w-full h-full flex-col items-start gap-2 p-2 bg-slate-100">
      <Button asChild onClick={props.onGo}>
        <a onClick={props.onChild}>Go</a>
      </Button>
      <Button>Plain</Button>
    </div>
  );
}
