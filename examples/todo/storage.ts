// Persistence for the todo app: one JSON file in the host's app-data root.
// The host may mount no file system (the desktop host does not for an app like this), so every
// call here is best-effort: a missing fs means the todos live for the session.

import { existsSync, file, write } from "pocketjs-react";
import type { Todo } from "./model.ts";

const NAME = "todos.json";

export function load(): Todo[] | null {
  try {
    if (!existsSync(NAME)) return null;
    const text = file(NAME).text();
    if (!text) return null;
    const parsed = JSON.parse(text) as unknown;
    return Array.isArray(parsed) ? (parsed as Todo[]) : null;
  } catch {
    return null;
  }
}

export function save(todos: Todo[]): void {
  try {
    write(NAME, JSON.stringify(todos));
  } catch {
    // No fs on this host: keep the session's list in memory.
  }
}
