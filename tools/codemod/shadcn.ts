// C3 codemod: turn verbatim shadcn registry source into source PocketJS compiles.
//
//   bun tools/codemod/shadcn.ts <srcDir> <outDir> [--report] [--json] [--check]
//
// The transform is compiler-aware, which is the one thing the C2 runtime token map cannot be:
// it calls PocketJS's own unknownUtilities() at generation time, so a token the core does not
// draw is dropped here, in the source, instead of crashing the strict web host at runtime.
//
// Rules, applied in this order (the order is what makes a second run a no-op):
//   R0  rounded-full -> rounded-[Npx], N derived from the literal's own size (before C2, whose
//       NEEDS_SIZE rule drops the token outright)
//   R1  the C2 map (src/compat/tokens.ts) - same table as the build and the runtime
//   R2  equivalent-subset substitutions: grid -> flex flex-col, flex-col-reverse -> flex-col,
//       sr-only -> hidden, @container/* -> dropped
//   R3  unknownUtilities() filter - everything the compiler rejects, dropped and counted by name
//   R4  retired (batch A): Slot/asChild is kept. `asChild ? Slot.Root : "tag"` reaches the real
//       Slot through R6, which merges the props onto the child (src/primitives/slot.tsx)
//   R5  a literal that maps to nothing stays as "" (cn("", className) is harmless)
//   R6  the radix-ui import edge -> pocketjs-react/radix (native Dialog/DropdownMenu/Select, C5)
//   R7  the lucide-react import edge -> pocketjs-react/glyph-icons (text glyph stubs until C7, C5)
//   R8  the vaul, sonner and next-themes import edges -> pocketjs-react/vaul, /sonner, /next-themes (batch 2)
//
// Only string spans are rewritten - the rest of the file stays byte-identical, which keeps the
// diff reviewable and makes idempotency checkable. Regexes are not used on class strings; every
// token goes through the same split the compiler uses.

import { readdirSync } from "node:fs";
import { resolve } from "node:path";
import { parse } from "@babel/parser";
import {
  dropReason,
  parseBinding,
  rewriteToken,
} from "../../src/compat/tokens.ts";
import { bodiesOnly, splitSelector } from "../../src/compat/selectors.ts";
import { parseClassLiteral } from "../../src/internal/pocket.ts";
import { unknownUtilities } from "../../src/internal/pocket-build.ts";

/** Tokens that get an equivalent PocketJS subset. A value of "" drops the token. */
const SUBSTITUTE: Record<string, string> = {
  grid: "flex flex-col",
  "flex-col-reverse": "flex flex-col",
  "sr-only": "hidden",
};
/** Prefix families with no PocketJS equivalent at all (container queries). */
const DROP_PREFIX = ["@container/"];

const FONT_PX: Record<string, number> = {
  "2xs": 10,
  xs: 12,
  sm: 14,
  base: 16,
  lg: 18,
  xl: 20,
  "2xl": 24,
  "4xl": 36,
  "5xl": 54,
};

/** Rounded-full as the matching arbitrary radius: a pill is min(w, h) / 2 (the core's own rule). */
function roundedFullRadius(tokens: string[]): string {
  const h = tokens.map((t) => /^h-(\d+(?:\.\d+)?)$/.exec(t)).find(Boolean);
  if (h) return "rounded-[" + Number(h[1]) * 2 + "px]";
  const py = tokens.map((t) => /^py-(\d+(?:\.\d+)?)$/.exec(t)).find(Boolean);
  const size = tokens
    .map((t) => /^text-(2xs|xs|sm|base|lg|xl|2xl|4xl|5xl)$/.exec(t))
    .find(Boolean);
  const square = tokens
    .map((t) => /^size-(\d+(?:\.\d+)?)$/.exec(t))
    .find(Boolean);
  // Batch A (B4): size-N is the same w and h as h-N, so the radius is N * 2 px.
  if (square) return "rounded-[" + Number(square[1]) * 2 + "px]";
  const height =
    (py ? Number(py[1]) * 8 : 0) + (size ? FONT_PX[size[1]] * 1.25 : 16);
  return "rounded-[" + Math.round(height / 2) + "px]";
}

export interface TokenCounts {
  [token: string]: number;
}

export interface CodemodFile {
  name: string;
  before: string;
  after: string;
  /** Class literals found in a class position (cva base/variants, cn/clsx/twMerge args, className). */
  literals: number;
  changed: number;
  /** Tokens moved to PocketJS vocabulary by the C2 map. */
  mapped: number;
  /** C2 map drops, by source token (whitespace-nowrap, dark:ring-*, ring-*, ...). */
  mapDropped: TokenCounts;
  /** Tokens the compiler rejects, by token (fixed, shadow-sm, col-start-2, ...). */
  compilerDropped: TokenCounts;
  /** R0/R2 rules that fired, by source token (rounded-full, grid, sr-only, @container/...). */
  substituted: TokenCounts;
  /** Literals that became empty after the rewrite. */
  emptied: number;
  /** Template literals with expressions: not statically rewritable. */
  skipped: number;
  /** Non-empty results parseClassLiteral still rejects. Must stay empty. */
  residual: string[];
}

export interface CodemodReport {
  files: CodemodFile[];
  totals: {
    literals: number;
    changed: number;
    mapped: number;
    mapDropped: TokenCounts;
    compilerDropped: TokenCounts;
    substituted: TokenCounts;
    /** Drops grouped by reason (mapDropped + compilerDropped, C8 Step 5). */
    reasons: TokenCounts;
    emptied: number;
    skipped: number;
  };
}

interface Edit {
  start: number;
  end: number;
  text: string;
}

const CLASS_CALLEES = new Set(["cn", "clsx", "cva", "twMerge"]);
const COMPARISON_OPS = new Set([
  "===",
  "!==",
  "==",
  "!=",
  "<",
  ">",
  "<=",
  ">=",
  "in",
  "instanceof",
]);

/** R6/R7: registry module specifier -> the PocketJS module that provides the same names. */
const IMPORT_EDGE: Record<string, string> = {
  "radix-ui": "pocketjs-react/radix",
  "lucide-react": "pocketjs-react/glyph-icons",
  // R8: the overlay packages that render through react-dom have a native shape in PocketJS (batch 2).
  vaul: "pocketjs-react/vaul",
  sonner: "pocketjs-react/sonner",
  "next-themes": "pocketjs-react/next-themes",
  // R9 (batch 4): the npm-backed modules are native shims, never the packages.
  cmdk: "pocketjs-react/cmdk",
  "react-resizable-panels": "pocketjs-react/react-resizable-panels",
  "react-hook-form": "pocketjs-react/react-hook-form",
  "input-otp": "pocketjs-react/input-otp",
  "react-day-picker": "pocketjs-react/react-day-picker",
  "embla-carousel-react": "pocketjs-react/embla-carousel-react",
  recharts: "pocketjs-react/recharts",
  "@base-ui/react": "pocketjs-react/base-ui",
};

type Node = Record<string, any>;

function calleeName(node: Node | undefined): string {
  if (!node) return "";
  if (node.type === "Identifier") return node.name;
  if (node.type === "MemberExpression" && node.property?.type === "Identifier")
    return node.property.name;
  return "";
}

function keyName(property: Node): string {
  return property?.key?.name ?? property?.key?.value ?? "";
}

function add(counts: TokenCounts, token: string, n = 1): void {
  counts[token] = (counts[token] ?? 0) + n;
}

/** Every dropped token of a file, grouped by the reason it was dropped (C8 Step 5). */
function reasonsOf(
  file: Pick<CodemodFile, "mapDropped" | "compilerDropped">,
): TokenCounts {
  const out: TokenCounts = {};
  for (const counts of [file.mapDropped, file.compilerDropped])
    for (const [token, n] of Object.entries(counts))
      add(out, dropReason(token), n);
  return out;
}

/** One token string (which may expand to several) -> its PocketJS form, plus what happened. */
function rewriteOne(
  tok: string,
  literalTokens: string[],
  file: Pick<
    CodemodFile,
    "mapDropped" | "compilerDropped" | "substituted" | "mapped"
  >,
): string[] {
  if (tok === "rounded-full") {
    add(file.substituted, tok);
    return [roundedFullRadius(literalTokens)];
  }
  const mapped = rewriteToken(tok);
  if (mapped === "") {
    add(file.mapDropped, tok);
    return [];
  }
  const out = mapped.split(/\s+/).filter(Boolean);
  if (mapped !== tok) file.mapped++;
  const kept: string[] = [];
  for (const next of out) {
    if (next in SUBSTITUTE) {
      add(file.substituted, next);
      kept.push(...SUBSTITUTE[next].split(" ").filter(Boolean));
      continue;
    }
    if (DROP_PREFIX.some((prefix) => next.startsWith(prefix))) {
      add(file.substituted, next);
      continue;
    }
    // Var-bound lengths stay in the vendored source; the runtime turns them into bindings (vars.ts).
    if (parseBinding(next)) {
      kept.push(next);
      continue;
    }
    // C8: a selector stays when its body is a utility the compiler draws; the runtime resolves it.
    const selector = splitSelector(next);
    if (selector) {
      if (unknownUtilities(selector.body).length > 0)
        add(file.compilerDropped, next);
      else kept.push(next);
      continue;
    }
    if (unknownUtilities(next).length > 0) {
      add(file.compilerDropped, next);
      continue;
    }
    kept.push(next);
  }
  return kept;
}

function rewriteClassLiteral(
  text: string,
  file: Pick<
    CodemodFile,
    "mapDropped" | "compilerDropped" | "substituted" | "mapped"
  >,
): string {
  const source = text.trim().split(/\s+/).filter(Boolean);
  const out: string[] = [];
  for (const tok of source) out.push(...rewriteOne(tok, source, file));
  return out.join(" ");
}

/** Collect the AST subtrees that hold class strings (structural, not "anywhere under cva"). */
function classContexts(program: Node): Set<object> {
  const contexts = new Set<object>();
  const mark = (node: Node | undefined) => {
    if (node && typeof node === "object") contexts.add(node);
  };
  const walk = (node: Node) => {
    if (!node || typeof node !== "object") return;
    if (
      node.type === "CallExpression" &&
      CLASS_CALLEES.has(calleeName(node.callee))
    ) {
      const args: Node[] = node.arguments ?? [];
      if (calleeName(node.callee) === "cva") {
        mark(args[0]);
        const options = args[1];
        const variants = options?.properties?.find(
          (p: Node) => keyName(p) === "variants",
        );
        for (const group of variants?.value?.properties ?? []) {
          for (const option of group.value?.properties ?? [])
            mark(option.value);
        }
      } else {
        for (const arg of args) mark(arg);
      }
    }
    if (node.type === "JSXAttribute" && node.name?.name === "className")
      mark(node.value);
    for (const key in node) {
      if (["loc", "start", "end", "extra", "comments"].includes(key)) continue;
      const value = node[key];
      if (Array.isArray(value)) value.forEach(walk);
      else if (value && typeof value === "object") walk(value);
    }
  };
  walk(program);
  return contexts;
}

function transformSource(source: string, name: string): CodemodFile {
  const file: CodemodFile = {
    name,
    before: source,
    after: source,
    literals: 0,
    changed: 0,
    mapped: 0,
    mapDropped: {},
    compilerDropped: {},
    substituted: {},
    emptied: 0,
    skipped: 0,
    residual: [],
  };
  const ast = parse(source, {
    sourceType: "module",
    plugins: ["jsx", "typescript"],
  }) as unknown as Node;
  const parents = new WeakMap<object, Node>();
  const walk = (node: Node, parent: Node | undefined) => {
    if (!node || typeof node !== "object") return;
    parents.set(node, parent as Node);
    for (const key in node) {
      if (["loc", "start", "end", "extra", "comments"].includes(key)) continue;
      const value = node[key];
      if (Array.isArray(value)) value.forEach((child) => walk(child, node));
      else if (value && typeof value === "object") walk(value, node);
    }
  };
  walk(ast, undefined);

  const contexts = classContexts(ast);
  // A string is a class only when it reaches a class context through value positions
  // (&& / || operands, ternary branches). A comparison operand or a ternary test is data:
  // `position === "popper"` must keep its literal.
  const inClass = (node: Node): boolean => {
    if (contexts.has(node)) return true;
    let child: Node = node;
    for (
      let p = parents.get(node), hops = 0;
      p && hops < 16;
      child = p, p = parents.get(p), hops++
    ) {
      if (p.type === "BinaryExpression" && COMPARISON_OPS.has(p.operator))
        return false;
      if (p.type === "ConditionalExpression" && child === p.test) return false;
      if (contexts.has(p)) return true;
    }
    return false;
  };

  const edits: Edit[] = [];
  const visit = (node: Node) => {
    if (!node || typeof node !== "object") return;
    if (node.type === "TemplateLiteral" && inClass(node)) {
      if ((node.expressions ?? []).length > 0) file.skipped++;
      else {
        file.literals++;
        const text = rewriteClassLiteral(
          node.quasis[0].value.cooked ?? node.quasis[0].value.raw,
          file,
        );
        if (text !== node.quasis[0].value.cooked) {
          file.changed++;
          if (text === "") file.emptied++;
          edits.push({
            start: node.start,
            end: node.end,
            text: "\`" + text + "\`",
          });
        }
        checkResidual(text, file);
      }
    } else if (
      node.type === "StringLiteral" &&
      typeof node.value === "string" &&
      inClass(node)
    ) {
      file.literals++;
      const text = rewriteClassLiteral(node.value, file);
      if (text !== node.value) {
        file.changed++;
        if (text === "") file.emptied++;
        edits.push({
          start: node.start,
          end: node.end,
          text: JSON.stringify(text),
        });
      }
      checkResidual(text, file);
    }
    for (const key in node) {
      if (["loc", "start", "end", "extra", "comments"].includes(key)) continue;
      const value = node[key];
      if (Array.isArray(value)) value.forEach(visit);
      else if (value && typeof value === "object") visit(value);
    }
  };
  visit(ast);

  // R6/R7: only the module specifier moves; the JSX and the class strings stay byte-identical.
  for (const stmt of ast.program?.body ?? []) {
    if (stmt.type !== "ImportDeclaration") continue;
    const to = IMPORT_EDGE[stmt.source?.value];
    if (!to) continue;
    add(file.substituted, "import:" + stmt.source.value);
    edits.push({
      start: stmt.source.start,
      end: stmt.source.end,
      text: JSON.stringify(to),
    });
  }

  let after = source;
  for (const edit of edits.sort((a, b) => b.start - a.start)) {
    after = after.slice(0, edit.start) + edit.text + after.slice(edit.end);
  }
  file.after = after;
  return file;
}

function checkResidual(text: string, file: CodemodFile): void {
  if (text === "") return;
  let ok = false;
  try {
    // A var binding is resolved at run time (vars.ts), so the compiler is not asked about it.
    const compiled = text
      .split(/\s+/)
      .filter((t) => t !== "" && parseBinding(t) === null)
      .join(" ");
    ok = compiled === "" || parseClassLiteral(bodiesOnly(compiled)) !== null;
  } catch {
    ok = false;
  }
  if (!ok) file.residual.push(text);
}

/** Run the codemod over a directory. Pure: nothing is written (the CLI does that). */
export async function codemod(srcDir: string): Promise<CodemodReport> {
  const dir = resolve(srcDir);
  const names = readdirSync(dir)
    .filter((name) => /.(tsx?|jsx?)$/.test(name) && !name.endsWith(".d.ts"))
    .sort();
  const files: CodemodFile[] = [];
  for (const name of names)
    files.push(
      transformSource(await Bun.file(resolve(dir, name)).text(), name),
    );
  const totals: CodemodReport["totals"] = {
    literals: 0,
    changed: 0,
    mapped: 0,
    mapDropped: {},
    compilerDropped: {},
    substituted: {},
    reasons: {},
    emptied: 0,
    skipped: 0,
  };
  for (const file of files) {
    for (const [reason, n] of Object.entries(reasonsOf(file)))
      add(totals.reasons, reason, n);
    totals.literals += file.literals;
    totals.changed += file.changed;
    totals.mapped += file.mapped;
    totals.emptied += file.emptied;
    totals.skipped += file.skipped;
    for (const [token, n] of Object.entries(file.mapDropped))
      add(totals.mapDropped, token, n);
    for (const [token, n] of Object.entries(file.compilerDropped))
      add(totals.compilerDropped, token, n);
    for (const [token, n] of Object.entries(file.substituted))
      add(totals.substituted, token, n);
  }
  return { files, totals };
}

function printCounts(label: string, counts: TokenCounts): void {
  const entries = Object.entries(counts).sort(
    (a, b) => b[1] - a[1] || a[0].localeCompare(b[0]),
  );
  if (entries.length === 0) return;
  console.log(
    "  " +
      label +
      ": " +
      entries.map(([token, n]) => token + " x" + n).join(", "),
  );
}

export async function main(argv: string[]): Promise<number> {
  const positional = argv.filter((a) => !a.startsWith("--"));
  const [srcDir, outDir] = positional;
  if (!srcDir) {
    console.error(
      "usage: bun tools/codemod/shadcn.ts <srcDir> [outDir] [--report] [--json] [--check]",
    );
    return 2;
  }
  const report = await codemod(srcDir);
  const json = argv.includes("--json");
  const check = argv.includes("--check");

  if (check) {
    if (!outDir) {
      console.error("--check needs an outDir");
      return 2;
    }
    let drift = 0;
    for (const file of report.files) {
      const target = resolve(outDir, file.name);
      const exists = await Bun.file(target).exists();
      const current = exists ? await Bun.file(target).text() : "";
      const same = exists && current === file.after;
      if (!same) drift++;
      console.log((same ? "ok    " : "DRIFT ") + file.name);
    }
    const expected = new Set(report.files.map((f) => f.name));
    for (const name of readdirSync(resolve(outDir))) {
      if (!expected.has(name)) {
        drift++;
        console.log("DRIFT " + name + " (no upstream source)");
      }
    }
    console.log("check: " + (drift === 0 ? "clean" : drift + " file(s) drift"));
    return drift === 0 ? 0 : 1;
  }

  if (outDir) {
    for (const file of report.files)
      await Bun.write(resolve(outDir, file.name), file.after);
  }

  if (json) {
    const slim = {
      totals: report.totals,
      files: report.files.map(
        ({
          name,
          literals,
          changed,
          mapped,
          mapDropped,
          compilerDropped,
          substituted,
          emptied,
          skipped,
          residual,
        }) => ({
          name,
          literals,
          changed,
          mapped,
          mapDropped,
          compilerDropped,
          substituted,
          emptied,
          skipped,
          residual,
        }),
      ),
    };
    console.log(JSON.stringify(slim, null, 2));
    return report.files.some((f) => f.residual.length > 0) ? 1 : 0;
  }

  for (const file of report.files) {
    console.log(
      file.name +
        ": " +
        file.literals +
        " literals, " +
        file.changed +
        " changed, " +
        file.mapped +
        " mapped, " +
        Object.values(file.mapDropped).reduce((a, b) => a + b, 0) +
        " map-dropped, " +
        Object.values(file.compilerDropped).reduce((a, b) => a + b, 0) +
        " compiler-dropped, " +
        Object.values(file.substituted).reduce((a, b) => a + b, 0) +
        " substituted, " +
        file.emptied +
        " emptied, " +
        file.skipped +
        " skipped, " +
        file.residual.length +
        " residual",
    );
    printCounts("substituted", file.substituted);
    printCounts("compiler-dropped", file.compilerDropped);
    printCounts("reasons", reasonsOf(file));
    if (file.residual.length)
      console.log("  RESIDUAL: " + JSON.stringify(file.residual));
  }
  console.log(
    "totals: " +
      report.totals.literals +
      " literals, " +
      report.totals.changed +
      " changed, " +
      report.totals.mapped +
      " mapped, " +
      report.files.reduce((n, f) => n + f.residual.length, 0) +
      " residual",
  );
  printCounts("reasons", report.totals.reasons);
  return report.files.some((f) => f.residual.length > 0) ? 1 : 0;
}

if (import.meta.main) process.exit(await main(process.argv.slice(2)));
