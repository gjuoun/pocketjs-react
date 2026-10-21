// Reader settings and reading positions, saved as state/reader.json through the fs SDK when the
// host mounts a writable fs (the browser host page backs it with localStorage). On a host
// without one (the desktop host today) state lives in memory for the session.
import { existsSync, file, fsHost, write } from "@pocketjs/framework/fs";
import type { FontSize } from "./paginate.ts";

export interface SavedPosition {
  chapter: number;
  block: number;
  offset: number;
}

export interface ReaderState {
  size: FontSize;
  dark: boolean;
  positions: Record<string, SavedPosition>;
  /** The book being read when the state was saved. */
  last?: string;
}

const PATH = "state/reader.json";
const DEFAULTS: ReaderState = { size: "S", dark: false, positions: {} };

/** True when state is written to a file system rather than kept in memory. */
export function stateIsPersistent(): boolean {
  return fsHost() !== null;
}

export function loadState(): ReaderState {
  if (!fsHost() || !existsSync(PATH)) return { ...DEFAULTS, positions: {} };
  try {
    const saved = file(PATH).json() as Partial<ReaderState>;
    return { ...DEFAULTS, ...saved, positions: { ...(saved.positions ?? {}) } };
  } catch {
    return { ...DEFAULTS, positions: {} };
  }
}

export function saveState(state: ReaderState): boolean {
  if (!fsHost()) return false;
  try {
    write(PATH, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}
