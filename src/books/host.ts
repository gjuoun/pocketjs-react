// A book the host delivers at launch. The macOS app's launcher base64-encodes the EPUB the user
// picked into a text file and starts the desktop host with --file, which pushes it once at boot
// as the svc line {"t":"load","text":<base64>} (the host reads --file as text, so binary EPUBs
// cannot travel as-is). The first load wins: one book per launch. Hosts that never send a load
// (the browser page, tests) see status "none" and nothing changes.
import { useLayoutEffect, useState } from "react";
import { takeHostMessages } from "../input/pointer.ts";
import { addFramePump } from "../renderer/mount.ts";
import { base64ToBytes } from "./assets.ts";
import { openEpub } from "./epub.ts";
import { openedBook, type BookEntry } from "./source.ts";

export type HostBook = { status: "none" } | { status: "opened"; book: BookEntry } | { status: "failed"; error: string };

let state: HostBook = { status: "none" };
let pumping = false;
const listeners = new Set<(book: HostBook) => void>();
const now = (): number => {
  const perf = (globalThis as { performance?: { now(): number } }).performance;
  return perf ? perf.now() : Date.now();
};

function receive(text: string): HostBook {
  const t0 = now();
  let bytes = 0;
  try {
    const data = base64ToBytes(text);
    bytes = data.length;
    const epub = openEpub(data);
    const book = openedBook("host:" + epub.title, "host", epub);
    console.log("reader: host book opened title=" + JSON.stringify(epub.title) + " bytes=" + bytes + " ms=" + (now() - t0).toFixed(1));
    return { status: "opened", book };
  } catch (error) {
    const message = String(error instanceof Error ? error.message : error);
    console.log("reader: host book failed bytes=" + bytes + " " + message);
    return { status: "failed", error: message };
  }
}

function pump(): void {
  if (state.status !== "none") return;
  for (const message of takeHostMessages()) {
    if (message.t !== "load" || typeof message.text !== "string") continue;
    state = receive(message.text);
    for (const fn of listeners) fn(state);
    return;
  }
}

/** The book the host delivered at launch, if any; re-renders when it arrives. */
export function useHostBook(): HostBook {
  const [book, setBook] = useState<HostBook>(state);
  // A layout effect so the pump is installed in the mount commit, not on a later scheduler turn:
  // the host delivers the book on the first frames.
  useLayoutEffect(() => {
    if (!pumping) {
      pumping = true;
      addFramePump(pump);
    }
    listeners.add(setBook);
    setBook(state);
    return () => {
      listeners.delete(setBook);
    };
  }, []);
  return book;
}
