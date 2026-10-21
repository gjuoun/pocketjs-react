// Where books come from: EPUBs bundled into the app by the build (--asset), and EPUBs under
// books/ of a mounted fs (the browser host page's file picker). A host without an fs (the
// desktop host today) has bundled books only.
import { existsSync, file, fsHost, readdirSync } from "@pocketjs/framework/fs";
import { bundledAsset, bundledAssetNames } from "./assets.ts";
import { openEpub, type EpubBook } from "./epub.ts";

export interface BookEntry {
  id: string;
  title: string;
  author: string;
  origin: "bundled" | "file";
  open(): EpubBook;
}

function entry(id: string, origin: BookEntry["origin"], bytes: () => Uint8Array, fallbackTitle: string): BookEntry {
  let book: EpubBook | null = null;
  const open = () => (book ??= openEpub(bytes()));
  let title = fallbackTitle;
  let author = "";
  try {
    title = open().title;
    author = open().author;
  } catch {
    // A broken EPUB still lists under its file name; opening it reports the error.
  }
  return { id, title, author, origin, open };
}

export function bundledBooks(): BookEntry[] {
  return bundledAssetNames()
    .filter((name) => name.toLowerCase().endsWith(".epub"))
    .map((name) => entry("bundled:" + name, "bundled", () => bundledAsset(name), name));
}

export interface FileBooks {
  /** False when the host mounts no fs at all. */
  available: boolean;
  books: BookEntry[];
}

export function fileBooks(): FileBooks {
  if (!fsHost()) return { available: false, books: [] };
  if (!existsSync("books")) return { available: true, books: [] };
  const names = (readdirSync("books") as string[]).filter((n) => n.toLowerCase().endsWith(".epub"));
  return { available: true, books: names.map((name) => entry("file:" + name, "file", () => file("books/" + name).bytes(), name)) };
}
