// Minimal usage of kbd as a shadcn consumer writes it (inventory probe, not product code).
import { Kbd, KbdGroup } from "../ui/kbd.tsx";

export default function Probe() {
  return (
    <div className="w-full h-full flex-col gap-2 p-2 bg-slate-100">
      <Kbd>⌘</Kbd>
      <KbdGroup>
        <Kbd>Ctrl</Kbd>
        <Kbd>K</Kbd>
      </KbdGroup>
    </div>
  );
}
