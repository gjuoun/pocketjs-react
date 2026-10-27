// Pass 1: collect every string literal, template-literal piece and JSX text from the app's
// sources. Arguments to clsx/cn are ordinary literals, so they are collected like any other.
// This is Tailwind's own rule: a utility must appear as a complete token somewhere in the
// source; a name assembled at runtime (`p-${n}`) cannot be found.

import { existsSync, readdirSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { parse } from "@babel/parser";

export interface Collected {
  /** Distinct literals in source order. */
  literals: string[];
  /** Every codepoint of every literal (font atlas input). */
  codepoints: Set<number>;
  /** Files scanned. */
  files: string[];
}

const EXTENSIONS = [".tsx", ".ts", ".jsx", ".js"];

function resolveRelative(from: string, spec: string): string | null {
  const base = resolve(dirname(from), spec);
  if (existsSync(base) && statSync(base).isFile()) return base;
  for (const ext of EXTENSIONS) if (existsSync(base + ext)) return base + ext;
  for (const ext of EXTENSIONS)
    if (existsSync(join(base, "index" + ext))) return join(base, "index" + ext);
  return null;
}

function sourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) out.push(...sourceFiles(path));
    else if (/\.(tsx?|jsx?)$/.test(name) && !name.endsWith(".d.ts"))
      out.push(path);
  }
  return out;
}

/** Scan the entry's relative-import graph plus every file under `extraDirs`. */
export async function collect(
  entry: string,
  extraDirs: string[],
): Promise<Collected> {
  const literals: string[] = [];
  const seen = new Set<string>();
  const codepoints = new Set<number>();
  const visited = new Set<string>();
  const add = (s: string | null | undefined) => {
    if (!s) return;
    for (const ch of s) codepoints.add(ch.codePointAt(0)!);
    if (!seen.has(s)) {
      seen.add(s);
      literals.push(s);
    }
  };
  const walkAst = (node: unknown): void => {
    if (!node || typeof node !== "object") return;
    const n = node as Record<string, any>;
    if (n.type === "StringLiteral" || n.type === "JSXText") add(n.value);
    else if (n.type === "TemplateElement") add(n.value.cooked ?? n.value.raw);
    for (const key in n) {
      if (
        key === "loc" ||
        key === "start" ||
        key === "end" ||
        key === "extra" ||
        key === "comments"
      )
        continue;
      const v = n[key];
      if (Array.isArray(v)) v.forEach(walkAst);
      else if (v && typeof v === "object") walkAst(v);
    }
  };
  const visit = async (file: string): Promise<void> => {
    if (visited.has(file)) return;
    visited.add(file);
    const src = await Bun.file(file).text();
    const ast = parse(src, {
      sourceType: "module",
      plugins: ["jsx", "typescript"],
      errorRecovery: false,
    });
    walkAst(ast.program);
    for (const stmt of ast.program.body) {
      const source = (stmt as { source?: { value?: string } }).source?.value;
      // Relative and absolute specifiers are both the app's own files (the acceptance screens import by absolute path).
      if (typeof source === "string" && (source.startsWith(".") || source.startsWith("/"))) {
        const dep = resolveRelative(file, source);
        if (dep && /\.(tsx?|jsx?)$/.test(dep)) await visit(dep);
      }
    }
  };
  await visit(resolve(entry));
  for (const dir of extraDirs)
    for (const file of sourceFiles(dir)) await visit(file);
  return { literals, codepoints, files: [...visited] };
}
