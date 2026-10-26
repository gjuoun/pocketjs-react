// The import surface the vendored shadcn sources reach through "radix-ui" (codemod R6). A consumer
// app's shadcn file imports { Dialog as DialogPrimitive } from "pocketjs-react/radix" and gets the
// native primitives under the same member names Radix uses.

export * as Dialog from "./dialog.tsx";
export * as DropdownMenu from "./dropdown-menu.tsx";
export * as Label from "./label.tsx";
export * as Progress from "./progress.tsx";
export * as Select from "./select.tsx";
export * as AspectRatio from "./aspect-ratio.tsx";
export * as Separator from "./separator.tsx";
export * as Slot from "./slot.tsx";
