// Minimal usage of avatar as a shadcn consumer writes it (inventory probe, not product code).
import { Avatar, AvatarImage, AvatarFallback } from "../ui/avatar.tsx";

export default function Probe() {
  return (
    <div className="w-full h-full flex-col gap-2 p-2 bg-slate-100">
      <Avatar>
        <AvatarImage src="a.png" alt="a" />
        <AvatarFallback>JG</AvatarFallback>
      </Avatar>
    </div>
  );
}
