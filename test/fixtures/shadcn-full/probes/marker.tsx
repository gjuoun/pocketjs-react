// Minimal usage of marker as a shadcn consumer writes it (inventory probe, not product code).
import { Marker, MarkerContent } from "../ui/marker.tsx";

export default function Probe() {
  return (
    <div className="w-full h-full flex-col gap-2 p-2 bg-slate-100">
      <Marker>
        <MarkerContent>Pinned</MarkerContent>
      </Marker>
    </div>
  );
}
