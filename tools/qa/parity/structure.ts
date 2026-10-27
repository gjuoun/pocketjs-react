// Gate 5, structure-only (the reference is not rendered; see visual-parity.md). The expected structure of each
// section is read from its JSX: the static text literals in its body function (sections.tsx, parsed with
// @babel/parser, the same parser the probe uses). The PocketJS side is what the core drew.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parse } from "@babel/parser";

const SECTIONS_FILE = join(import.meta.dir, "../../../test/fixtures/shadcn-gallery/sections.tsx");

type Node = Record<string, any>;

function walk(node: unknown, visit: (n: Node) => void): void {
  if (!node || typeof node !== "object") return;
  const n = node as Node;
  if (typeof n.type === "string") visit(n);
  for (const key in n) {
    if (["loc", "start", "end", "extra", "comments"].includes(key)) continue;
    const v = n[key];
    if (Array.isArray(v)) v.forEach((c) => walk(c, visit));
    else if (v && typeof v === "object") walk(v, visit);
  }
}

let cache: Map<string, string[]> | undefined;

/** Static text per section: the JSXText and string-literal children of the body function named in BODIES. */
export function expectedTexts(): Map<string, string[]> {
  if (cache) return cache;
  const ast = parse(readFileSync(SECTIONS_FILE, "utf8"), { sourceType: "module", plugins: ["jsx", "typescript"] }) as unknown as Node;
  const bodyOf = new Map<string, string>();
  const fns = new Map<string, Node>();
  walk(ast, (n) => {
    if (n.type === "VariableDeclarator" && n.id?.name === "BODIES" && n.init?.type === "ObjectExpression")
      for (const p of n.init.properties) {
        const key = p.key?.name ?? p.key?.value;
        if (key && p.value?.type === "Identifier") bodyOf.set(key, p.value.name);
      }
    if (n.type === "FunctionDeclaration" && n.id?.name) fns.set(n.id.name, n);
  });
  const out = new Map<string, string[]>();
  for (const [name, fn] of bodyOf) {
    const texts = new Set<string>();
    const body = fns.get(fn);
    if (body) {
      walk(body, (n) => {
        if (n.type === "JSXText") {
          const t = String(n.value).replace(/\s+/g, " ").trim();
          if (t.length >= 2) texts.add(t);
        }
        if (n.type === "JSXExpressionContainer" && n.expression?.type === "StringLiteral" && n.expression.value.length >= 2 && /[A-Za-z]/.test(n.expression.value))
          texts.add(n.expression.value);
      });
    }
    out.set(name, [...texts].sort());
  }
  cache = out;
  return out;
}
