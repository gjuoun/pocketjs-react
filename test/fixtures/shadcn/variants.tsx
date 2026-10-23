// C2 acceptance fixture: every Button and Badge variant on one screen, over a light container
// (bg-slate-100) so the slate-900 primary fill is visible. Two columns keep the content inside
// the 480x272 surface. Verbatim components; only the layout wrapper is ours.
import { Badge } from "./badge.tsx";
import { Button } from "./button.tsx";

export function Variants() {
  return (
    <div className="w-full h-full flex-row gap-2 p-2 bg-slate-100">
      <div className="flex-col gap-1">
        <Button variant="default">Default</Button>
        <Button variant="secondary">Secondary</Button>
        <Button variant="destructive">Destructive</Button>
        <Button variant="outline">Outline</Button>
        <Button variant="ghost">Ghost</Button>
        <Button variant="link">Link</Button>
      </div>
      <div className="flex-col gap-1">
        <Badge variant="default">BDefault</Badge>
        <Badge variant="secondary">BSecondary</Badge>
        <Badge variant="destructive">BDestructive</Badge>
        <Badge variant="outline">BOutline</Badge>
        <Badge variant="ghost">BGhost</Badge>
        <Badge variant="link">BLink</Badge>
      </div>
    </div>
  );
}
