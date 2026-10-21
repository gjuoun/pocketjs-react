// cn(): clsx for conditions, tailwind-merge for conflicts (the last conflicting utility wins,
// matching how the PocketJS compiler resolves a class string).
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
