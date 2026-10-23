// EPUB reading for a QuickJS guest. openEpub() inflates only the package files (container,
// OPF, and the nav document or NCX); chapter(i) inflates one spine item and turns its XHTML into
// reading blocks. Probes on the desktop host's QuickJS: a 555 KB, 520-chapter book opens in
// about 21 ms and a chapter takes about 2 ms, while inflating everything up front took ~0.7 s.
import { strFromU8, unzipSync } from "fflate";
import { type Block, decodeEntities, xhtmlToBlocks } from "./blocks.ts";

export type { Block };

export interface TocEntry {
  title: string;
  /** Spine index the entry points into (-1 when the target is not in the spine). */
  index: number;
}

export interface EpubBook {
  title: string;
  author: string;
  spine: string[];
  toc: TocEntry[];
  chapter(index: number): Block[];
  stats: { inflated: number };
}

const attr = (tag: string, name: string): string | undefined =>
  new RegExp("\\s" + name + '\\s*=\\s*"([^"]*)"').exec(tag)?.[1] ??
  new RegExp("\\s" + name + "\\s*=\\s*'([^']*)'").exec(tag)?.[1];

function resolvePath(base: string, href: string): string {
  const parts = (base + decodeURIComponent(href.split("#")[0])).split("/");
  const out: string[] = [];
  for (const p of parts) {
    if (p === "..") out.pop();
    else if (p !== "." && p !== "") out.push(p);
  }
  return out.join("/");
}

export function openEpub(bytes: Uint8Array): EpubBook {
  const stats = { inflated: 0 };
  const inflate = (
    names: (name: string) => boolean,
  ): Record<string, Uint8Array> => {
    const files = unzipSync(bytes, { filter: (f) => names(f.name) });
    stats.inflated += Object.keys(files).length;
    return files;
  };
  const one = (name: string): string => {
    const file = inflate((n) => n === name)[name];
    if (!file) throw new Error("epub: missing " + name);
    return strFromU8(file);
  };

  const container = one("META-INF/container.xml");
  const rootfile = /<rootfile\s[^>]*>/.exec(container)?.[0];
  const opfPath = rootfile ? attr(rootfile, "full-path") : undefined;
  if (!opfPath) throw new Error("epub: no rootfile in container.xml");
  const opf = one(opfPath);
  const base = opfPath.includes("/")
    ? opfPath.slice(0, opfPath.lastIndexOf("/") + 1)
    : "";

  const manifest = new Map<
    string,
    { href: string; props: string; type: string }
  >();
  for (const m of opf.matchAll(/<item\s[^>]*>/g)) {
    const id = attr(m[0], "id");
    const href = attr(m[0], "href");
    if (id && href)
      manifest.set(id, {
        href: resolvePath(base, href),
        props: attr(m[0], "properties") ?? "",
        type: attr(m[0], "media-type") ?? "",
      });
  }
  const spine = [...opf.matchAll(/<itemref\s[^>]*>/g)]
    .map((m) => manifest.get(attr(m[0], "idref") ?? "")?.href)
    .filter((h): h is string => !!h);
  const tag = (name: string) =>
    decodeEntities(
      (
        new RegExp("<dc:" + name + "[^>]*>([\\s\\S]*?)</dc:" + name + ">").exec(
          opf,
        )?.[1] ?? ""
      )
        .replace(/<[^>]+>/g, "")
        .trim(),
    );
  const title = tag("title") || "Untitled";
  const author = tag("creator");

  const indexOf = (target: string) => spine.indexOf(target);
  let toc: TocEntry[] = [];
  const navItem = [...manifest.values()].find((v) =>
    v.props.split(/\s+/).includes("nav"),
  );
  const ncxId = /<spine\s[^>]*toc="([^"]+)"/.exec(opf)?.[1];
  const ncx = ncxId
    ? manifest.get(ncxId)
    : [...manifest.values()].find((v) => v.type === "application/x-dtbncx+xml");
  if (navItem) {
    const navBase = navItem.href.includes("/")
      ? navItem.href.slice(0, navItem.href.lastIndexOf("/") + 1)
      : "";
    const nav = one(navItem.href);
    const tocNav =
      /<nav\b[^>]*epub:type="toc"[^>]*>([\s\S]*?)<\/nav>/.exec(nav)?.[1] ?? nav;
    toc = [
      ...tocNav.matchAll(/<a\s[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/g),
    ].map((m) => ({
      title: decodeEntities(
        m[2]
          .replace(/<[^>]+>/g, "")
          .replace(/\s+/g, " ")
          .trim(),
      ),
      index: indexOf(resolvePath(navBase, m[1])),
    }));
  } else if (ncx) {
    const ncxBase = ncx.href.includes("/")
      ? ncx.href.slice(0, ncx.href.lastIndexOf("/") + 1)
      : "";
    const doc = one(ncx.href);
    toc = [
      ...doc.matchAll(
        /<navPoint\b[\s\S]*?<text>([\s\S]*?)<\/text>[\s\S]*?<content\s[^>]*src="([^"]*)"/g,
      ),
    ].map((m) => ({
      title: decodeEntities(m[1].trim()),
      index: indexOf(resolvePath(ncxBase, m[2])),
    }));
  }
  if (toc.length === 0)
    toc = spine.map((_, i) => ({ title: "Section " + (i + 1), index: i }));

  return {
    title,
    author,
    spine,
    toc,
    stats,
    chapter(index: number): Block[] {
      const href = spine[index];
      if (href === undefined) throw new Error("epub: no spine item " + index);
      return xhtmlToBlocks(one(href));
    },
  };
}
