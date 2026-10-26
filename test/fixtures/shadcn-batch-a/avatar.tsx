// Batch A, Avatar: five avatars on a white page. A default fallback "CN" (32px), an sm fallback "S" (24px),
// an lg image of a baked icon with its fallback behind it (40px), an unknown URL that must fall back, and a
// fallback that waits 100 ms. The classes are the codemod's output for the vendored source.
import { Avatar } from "pocketjs-react/radix";

export function AvatarScreen() {
  return (
    <div className="w-full h-full flex-col items-start gap-2 p-2 bg-white">
      <Avatar.Root data-size="default" className="relative flex w-8 h-8 shrink-0 overflow-hidden rounded-[16px]">
        <Avatar.Fallback className="flex w-full h-full items-center justify-center rounded-[16px] bg-slate-100 text-sm text-slate-500">
          CN
        </Avatar.Fallback>
      </Avatar.Root>
      <Avatar.Root data-size="sm" className="relative flex w-6 h-6 shrink-0 overflow-hidden rounded-[12px]">
        <Avatar.Fallback className="flex w-full h-full items-center justify-center bg-slate-100 text-xs text-slate-500">
          S
        </Avatar.Fallback>
      </Avatar.Root>
      <Avatar.Root data-size="lg" className="relative flex w-10 h-10 shrink-0 overflow-hidden rounded-[20px]">
        <Avatar.Image debugName="img-lg" src="icon.check.16.slate-900" className="w-full h-full" />
        <Avatar.Fallback className="flex w-full h-full items-center justify-center bg-slate-100 text-sm text-slate-500">
          LG
        </Avatar.Fallback>
      </Avatar.Root>
      <Avatar.Root data-size="default" className="relative flex w-8 h-8 shrink-0 overflow-hidden rounded-[16px]">
        <Avatar.Image src="https://example.test/missing.png" className="w-full h-full" />
        <Avatar.Fallback className="flex w-full h-full items-center justify-center bg-slate-100 text-sm text-slate-500">
          XY
        </Avatar.Fallback>
      </Avatar.Root>
      <Avatar.Root data-size="default" className="relative flex w-8 h-8 shrink-0 overflow-hidden rounded-[16px]">
        <Avatar.Fallback delayMs={100} className="flex w-full h-full items-center justify-center bg-slate-100 text-sm text-slate-500">
          DL
        </Avatar.Fallback>
      </Avatar.Root>
    </div>
  );
}
