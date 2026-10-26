// Native toaster, the sonner shim (batch 2). The R8 remap points `sonner` here, so the vendored shadcn
// sonner imports `Toaster` unchanged. Toasts live in a module store: `toast(...)` adds one, and the Toaster
// draws the stack in the bottom-right corner of the overlay layer. Each toast closes after DURATION_MS (a
// frame count, 60 Hz). Not a layer and takes no focus. Parked: swipe to dismiss, stacking animation,
// `theme` and CSS variables (the palette is fixed), and the richColors option.

import { addFramePump, getOverlayLayer } from "../renderer/mount.ts";
import { type CSSProperties, type ReactNode, useLayoutEffect, useSyncExternalStore } from "react";
import { Text, View } from "../elements.ts";
import { reconciler } from "../renderer/host-config.ts";
import { cn } from "../style/cn.ts";
import { framesFromMs } from "./open-timing.ts";

export type ToastType = "default" | "success" | "info" | "warning" | "error" | "loading";

export interface ToasterProps {
  /** Icons per toast type (the vendored shadcn passes glyphs here). */
  icons?: Partial<Record<Exclude<ToastType, "default">, ReactNode>>;
  /** Accepted for the sonner signature; toasts keep the default 4000 ms (parked). */
  duration?: number;
  position?: string;
  theme?: string;
  className?: string;
  style?: CSSProperties;
  closeButton?: boolean;
  richColors?: boolean;
}

interface ToastItem {
  id: number;
  type: ToastType;
  title: ReactNode;
  remaining: number;
}

const DEFAULT_DURATION_MS = 4000;
let items: ToastItem[] = [];
let nextId = 1;
const listeners = new Set<() => void>();

function emit(): void {
  for (const fn of [...listeners]) fn();
}

function subscribe(fn: () => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

function snapshot(): ToastItem[] {
  return items;
}

function add(type: ToastType, title: ReactNode, frames: number): number {
  const id = nextId++;
  items = [...items, { id, type, title, remaining: frames }];
  emit();
  return id;
}

const DEFAULT_FRAMES = framesFromMs(DEFAULT_DURATION_MS);

/** Adds a toast. `toast.success` and the other typed forms add one of that type. */
export function toast(message: ReactNode): number {
  return add("default", message, DEFAULT_FRAMES);
}

toast.success = (message: ReactNode): number => add("success", message, DEFAULT_FRAMES);
toast.info = (message: ReactNode): number => add("info", message, DEFAULT_FRAMES);
toast.warning = (message: ReactNode): number => add("warning", message, DEFAULT_FRAMES);
toast.error = (message: ReactNode): number => add("error", message, DEFAULT_FRAMES);
toast.loading = (message: ReactNode): number => add("loading", message, DEFAULT_FRAMES);

/** Removes one toast by id, or every toast when no id is given. */
toast.dismiss = (id?: number): void => {
  items = id === undefined ? [] : items.filter((t) => t.id !== id);
  emit();
};

/** The stack of open toasts in the bottom-right corner. Renders nothing while no toast is open. */
export function Toaster(props: ToasterProps) {
  const list = useSyncExternalStore(subscribe, snapshot, snapshot);
  // Each frame, every open toast loses one frame of its life; a toast at zero closes.
  useLayoutEffect(
    () =>
      addFramePump(() => {
        if (items.length === 0) return;
        items = items
          .map((t) => ({ ...t, remaining: t.remaining - 1 }))
          .filter((t) => t.remaining > 0);
        emit();
      }),
    [],
  );
  if (list.length === 0) return null;
  return reconciler.createPortal(
    <View className={cn("flex-col gap-2 items-end", props.className)} style={{ position: "absolute" as const, right: 8, bottom: 8, ...(props.style as object) }}>
      {list.map((t) => (
        <View key={t.id} className="flex-row gap-2 items-center rounded-md bg-slate-800 px-3 py-2 w-[240px]">
          {props.icons?.[t.type as Exclude<ToastType, "default">]}
          {typeof t.title === "string" || typeof t.title === "number" ? (
            <Text className="text-sm text-white">{t.title}</Text>
          ) : (
            t.title
          )}
        </View>
      ))}
    </View>,
    getOverlayLayer(),
    null,
  ) as ReactNode;
}
