// Batch A acceptance: the six components of the batch as a consumer app writes them, from the codemod output
// (never from upstream/). Button asChild on an anchor; Label and Input linked by id; both separators; an
// AspectRatio 2:1 box; a 50% Progress; an sm fallback, a separator, and an lg image with its fallback.
import { View } from "pocketjs-react";
import { AspectRatio } from "../shadcn-vendor/ui/aspect-ratio.tsx";
import { Avatar, AvatarFallback, AvatarImage } from "../shadcn-vendor/ui/avatar.tsx";
import { Button } from "../shadcn-vendor/ui/button.tsx";
import { Input } from "../shadcn-vendor/ui/input.tsx";
import { Label } from "../shadcn-vendor/ui/label.tsx";
import { Progress } from "../shadcn-vendor/ui/progress.tsx";
import { Separator } from "../shadcn-vendor/ui/separator.tsx";

export function BatchA() {
  return (
    <div className="w-full h-full flex-col items-start gap-2 p-2 bg-white">
      <Button asChild>
        <a>Go</a>
      </Button>
      <Label htmlFor="name">Name</Label>
      <Input id="name" placeholder="Type here" />
      <Separator />
      <div className="flex-row items-center gap-2">
        <Avatar size="sm">
          <AvatarFallback>S</AvatarFallback>
        </Avatar>
        <Separator orientation="vertical" />
        <Avatar size="lg">
          <AvatarImage src="icon.check.16.slate-900" />
          <AvatarFallback>LG</AvatarFallback>
        </Avatar>
      </div>
      <div className="w-[200px] flex-col">
        <AspectRatio ratio={4}>
          <View debugName="aspect" className="w-full h-full bg-slate-900" />
        </AspectRatio>
      </div>
      <Progress value={50} className="w-[200px]" />
    </div>
  );
}
