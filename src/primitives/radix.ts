// The import surface the vendored shadcn sources reach through "radix-ui" (codemod R6). A consumer
// app's shadcn file imports { Dialog as DialogPrimitive } from "pocketjs-react/radix" and gets the
// native primitives under the same member names Radix uses.

export * as Dialog from "./dialog.tsx";
export * as DropdownMenu from "./dropdown-menu.tsx";
export * as Label from "./label.tsx";
export * as Progress from "./progress.tsx";
export * as Select from "./select.tsx";
export * as Avatar from "./avatar.tsx";
export * as AspectRatio from "./aspect-ratio.tsx";
export * as Separator from "./separator.tsx";
export * as Slot from "./slot.tsx";
// Batch 2 members: one block, kept at the end of the file.
export * as Popover from "./popover.tsx";
export * as Tooltip from "./tooltip.tsx";
export * as HoverCard from "./hover-card.tsx";
export * as AlertDialog from "./alert-dialog.tsx";
export * as ContextMenu from "./context-menu.tsx";
export * as Menubar from "./menubar.tsx";