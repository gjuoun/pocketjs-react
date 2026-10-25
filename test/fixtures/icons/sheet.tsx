// Icon sheet fixture (test-only): every glyph icon in three surfaces, one row per colour variant.
import {
  CheckIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  ChevronUpIcon,
  CircleIcon,
  XIcon,
} from "pocketjs-react/glyph-icons";

export function IconSheet() {
  return (
    <div className="flex flex-col gap-2 p-2 bg-slate-100">
      <div className="flex flex-row items-center gap-3 p-2 bg-white text-slate-900">
        <ChevronDownIcon className="size-4" />
        <ChevronUpIcon className="size-4" />
        <ChevronRightIcon className="size-4" />
        <XIcon />
        <CheckIcon className="size-4" />
        <CircleIcon className="size-2 fill-current" />
      </div>
      <div className="flex flex-row items-center gap-3 p-2 bg-white text-slate-500">
        <ChevronDownIcon className="size-4" />
        <ChevronUpIcon className="size-4" />
        <ChevronRightIcon className="size-4" />
        <XIcon />
        <CheckIcon className="size-4" />
        <CircleIcon className="size-2 fill-current" />
      </div>
      <div className="flex flex-row items-center gap-3 p-2 bg-slate-900 text-white">
        <ChevronDownIcon className="size-4" />
        <ChevronUpIcon className="size-4" />
        <ChevronRightIcon className="size-4" />
        <XIcon />
        <CheckIcon className="size-4" />
        <CircleIcon className="size-2 fill-current" />
      </div>
    </div>
  );
}
