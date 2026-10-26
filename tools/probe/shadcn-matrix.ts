// Inventory probe for shadcn-full. Static facts come from the generated tree
// (codemod totals, JSX tags, radix and glyph names, package specifiers). Dynamic facts come from one
// child process per probe and mode, so no mount state leaks from one component into the next.
//
//   bun tools/probe/shadcn-matrix.ts               full run -> /tmp/pocketjs-react-probe/shadcn-full/matrix.json
//   bun tools/probe/shadcn-matrix.ts --canary      the seven vendored fixtures; exit 1 unless strict ok, classMiss 0
//   bun tools/probe/shadcn-matrix.ts --summary     print the saved matrix.json
//   bun tools/probe/shadcn-matrix.ts --one <probe> --mode strict|census     (child; prints one RESULT line)
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { parse } from "@babel/parser";
import { createElement, type ReactNode } from "react";
import type { CompatOptions } from "../../src/compat/index.ts";
import { compatStats, mount, resetCompatStats } from "../../src/index.ts";
import { hostTypeOf } from "../../src/compat/tags.ts";
import { bodiesOnly } from "../../src/compat/selectors.ts";
import { dropReason, rewriteLiteral } from "../../src/compat/tokens.ts";
import * as GLYPH from "../../src/primitives/glyph-icons.tsx";
import * as RADIX from "../../src/primitives/radix.ts";
import {
  compileClasses,
  unknownUtilities,
} from "../../src/internal/pocket-build.ts";
import { installBuildStyles } from "../../src/style/build-styles.ts";
import { bootCore } from "../../test/harness.ts";
import { codemod } from "../codemod/shadcn.ts";
import { collect } from "../collect.ts";

type Mode = "strict" | "census";
type Node = Record<string, any>;

const ROOT = resolve(import.meta.dir, "../..");
const FIXTURE = join(ROOT, "test/fixtures/shadcn-full");
const UPSTREAM = join(FIXTURE, "upstream");
const UI = join(FIXTURE, "ui");
const PROBES = join(FIXTURE, "probes");
const OUT_DIR = "/tmp/pocketjs-react-probe/shadcn-full";
const OUT = join(OUT_DIR, "matrix.json");
const CONCURRENCY = 4;

const argOf = (flag: string): string | undefined => {
  const i = process.argv.indexOf(flag);
  return i >= 0 ? process.argv[i + 1] : undefined;
};

function firstLine(e: unknown): string {
  return String((e as Error)?.message ?? e)
    .split("\n")[0]
    .slice(0, 300);
}

function linkFailure(e: unknown) {
  const message = firstLine(e);
  const kind = /Cannot find (package|module)|Could not resolve/.test(message)
    ? "missing-package"
    : /Export named|not found in module|does not provide an export/.test(
          message,
        )
      ? "missing-export"
      : "error";
  const name = /['"]([^'"]+)['"]/.exec(message)?.[1];
  return { ok: false, kind, name, message };
}

function tokensFrom(literals: string[]): string[] {
  const out = new Set<string>();
  for (const lit of literals.map(rewriteLiteral).map(bodiesOnly))
    for (const tok of lit.split(/\s+/))
      if (tok && unknownUtilities(tok).length === 0) out.add(tok);
  return [...out];
}

async function mountOnce(
  component: () => ReactNode,
  literals: string[],
  tokens: string[],
  mode: Mode,
) {
  const core = await bootCore({ classes: literals });
  // The same table the build installs: its animation records must be in the base table too.
  const compiled = compileClasses(literals);
  installBuildStyles(compiled.ids, compiled.bin, tokens);
  resetCompatStats();
  const compat: CompatOptions =
    mode === "strict"
      ? { classMiss: "throw", unknownProps: "throw", tokenMap: true }
      : { classMiss: "drop", unknownProps: "drop", tokenMap: true };
  let unmount: (() => void) | undefined;
  let status: "ok" | "throw" = "ok";
  let error = "";
  let texts = 0;
  try {
    unmount = mount(createElement(component as never), { compat });
    core.step(0);
    core.step(0);
    texts = core.texts().length;
  } catch (e) {
    status = "throw";
    error = firstLine(e);
  }
  const stats = compatStats();
  try {
    unmount?.();
  } catch {}
  core.dispose();
  installBuildStyles({}, new Uint8Array(0), []);
  resetCompatStats();
  return {
    status,
    error,
    texts,
    stats: {
      classMiss: stats.classMiss,
      tokenMap: stats.tokenMap,
      unknownTags: stats.unknownTags,
      unknownAttrs: stats.unknownAttrs,
      droppedAttrs: stats.droppedAttrs,
      mappedAttrs: stats.mappedAttrs,
      unsupported: stats.unsupported,
      iconMiss: stats.iconMiss,
    },
  };
}

/** Child: one probe, one mode. Prints a single RESULT line. */
async function child(name: string, mode: Mode): Promise<void> {
  const path = join(PROBES, name + ".tsx");
  const emit = (value: unknown) =>
    console.log("RESULT " + JSON.stringify(value));
  let mod: { default?: unknown };
  try {
    mod = await import(path);
  } catch (e) {
    emit({ name, mode, link: linkFailure(e) });
    return;
  }
  if (typeof mod.default !== "function") {
    emit({
      name,
      mode,
      link: { ok: false, kind: "no-default", message: "no default export" },
    });
    return;
  }
  const src = await collect(join(ROOT, "src/index.ts"), [join(ROOT, "src")]);
  const own = await collect(path, []);
  const literals = [...new Set([...src.literals, ...own.literals])]
    .map(rewriteLiteral)
    .map(bodiesOnly);
  const tokens = tokensFrom(literals);
  const result = await mountOnce(
    mod.default as () => ReactNode,
    literals,
    tokens,
    mode,
  );
  emit({ name, mode, link: { ok: true }, tokens: tokens.length, ...result });
}

async function runChild(
  name: string,
  mode: Mode,
): Promise<Record<string, any>> {
  const proc = Bun.spawn(
    ["bun", import.meta.path, "--one", name, "--mode", mode],
    {
      cwd: ROOT,
      stdout: "pipe",
      stderr: "pipe",
    },
  );
  const [out, err] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ]);
  await proc.exited;
  const line = out.split("\n").find((l) => l.startsWith("RESULT "));
  if (!line)
    return {
      name,
      mode,
      crash: true,
      error: err.trim().split("\n").slice(-3).join(" | ").slice(0, 400),
    };
  return JSON.parse(line.slice("RESULT ".length));
}

async function pool<T, R>(
  limit: number,
  items: T[],
  run: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: limit }, async () => {
      while (next < items.length) {
        const i = next++;
        results[i] = await run(items[i]);
      }
    }),
  );
  return results;
}

function walk(node: unknown, visit: (n: Node) => void): void {
  if (!node || typeof node !== "object") return;
  const n = node as Node;
  if (typeof n.type === "string") visit(n);
  for (const key in n) {
    if (["loc", "start", "end", "extra", "comments"].includes(key)) continue;
    const value = n[key];
    if (Array.isArray(value)) value.forEach((c) => walk(c, visit));
    else if (value && typeof value === "object") walk(value, visit);
  }
}

/** Static facts: codemod totals, tag census, radix and glyph names, package specifiers. */
async function staticFacts() {
  const report = await codemod(UPSTREAM);
  const reasonTokens: Record<
    string,
    Record<string, { n: number; files: string[] }>
  > = {};
  for (const f of report.files) {
    for (const counts of [f.mapDropped, f.compilerDropped])
      for (const [tok, n] of Object.entries(counts)) {
        const reason = dropReason(tok);
        const bucket = (reasonTokens[reason] ??= {});
        const entry = (bucket[tok] ??= { n: 0, files: [] });
        entry.n += n;
        if (!entry.files.includes(f.name)) entry.files.push(f.name);
      }
  }
  const tags: Record<
    string,
    { count: number; files: string[]; missing: boolean }
  > = {};
  const radix: Record<string, { files: string[]; missing: boolean }> = {};
  const glyphs: Record<string, { files: string[]; missing: boolean }> = {};
  const packages: Record<string, { files: string[]; resolvable: boolean }> = {};
  const domAttrs: Record<string, number> = {};
  for (const file of readdirSync(UI)
    .filter((f) => /\.tsx?$/.test(f))
    .sort()) {
    const ast = parse(readFileSync(join(UI, file), "utf8"), {
      sourceType: "module",
      plugins: ["jsx", "typescript"],
    }) as unknown as Node;
    const add = <T extends { files: string[] }>(
      bucket: Record<string, T>,
      key: string,
      init: T,
    ) => {
      const entry = (bucket[key] ??= init);
      if (!entry.files.includes(file)) entry.files.push(file);
      return entry;
    };
    walk(ast, (n) => {
      if (
        n.type === "JSXOpeningElement" &&
        n.name?.type === "JSXIdentifier" &&
        /^[a-z]/.test(n.name.name)
      ) {
        const tag = n.name.name as string;
        const entry = (tags[tag] ??= {
          count: 0,
          files: [],
          missing: hostTypeOf(tag) === null,
        });
        entry.count++;
        if (!entry.files.includes(file)) entry.files.push(file);
        for (const attr of n.attributes ?? [])
          if (attr.type === "JSXAttribute" && attr.name?.name)
            domAttrs[attr.name.name] = (domAttrs[attr.name.name] ?? 0) + 1;
      }
      if (n.type === "ImportDeclaration") {
        const source = n.source?.value as string;
        for (const spec of n.specifiers ?? []) {
          const imported = spec.imported?.name ?? spec.imported?.value;
          if (!imported) continue;
          if (source === "pocketjs-react/radix" || source === "radix-ui")
            add(radix, imported, { files: [], missing: !(imported in RADIX) });
          if (
            source === "pocketjs-react/glyph-icons" ||
            source === "lucide-react"
          )
            add(glyphs, imported, { files: [], missing: !(imported in GLYPH) });
        }
        if (
          !source.startsWith(".") &&
          !source.startsWith("pocketjs-react") &&
          source !== "react"
        ) {
          let resolvable = true;
          try {
            Bun.resolveSync(source, UI);
          } catch {
            resolvable = false;
          }
          add(packages, source, { files: [], resolvable });
        }
      }
    });
  }
  return {
    codemod: {
      files: report.files.length,
      totals: report.totals,
      perFile: report.files.map((f) => ({
        name: f.name,
        literals: f.literals,
        changed: f.changed,
        residual: f.residual.length,
        asChildFlattened: f.asChildFlattened,
      })),
    },
    reasonTokens,
    tags,
    radix,
    glyphs,
    packages,
    domAttrs,
  };
}

function summarize(probes: Record<string, any>[]): string {
  const lines = [
    "name | link | strict | census | classMiss | unknownTags | unknownAttrs | unsupported",
  ];
  for (const p of probes) {
    const link = p.strict?.link ?? p.census?.link ?? p.link;
    const linkCell = link?.ok
      ? "ok"
      : link
        ? link.kind + (link.name ? " " + link.name : "")
        : "-";
    const s = p.strict?.stats ?? {};
    const c = p.census?.stats ?? {};
    const strictCell = p.strict?.crash ? "crash" : (p.strict?.status ?? "-");
    const censusCell = p.census?.crash ? "crash" : (p.census?.status ?? "-");
    const unsupported = Object.entries(c.unsupported ?? {})
      .sort((a: any, b: any) => b[1] - a[1])
      .slice(0, 4)
      .map(([k, v]) => k + "x" + v)
      .join(" ");
    lines.push(
      [
        p.name,
        linkCell,
        strictCell +
          (p.strict?.error ? " (" + p.strict.error.slice(0, 90) + ")" : ""),
        censusCell,
        c.classMiss ? c.classMiss.tokens : "-",
        c.unknownTags ?? "-",
        Object.keys(c.unknownAttrs ?? {}).join(",") || "-",
        unsupported || "-",
      ].join(" | "),
    );
  }
  return lines.join("\n");
}

async function parent(canary: boolean): Promise<number> {
  const names = canary
    ? ["_canary"]
    : readdirSync(PROBES)
        .filter((f) => f.endsWith(".tsx") && !f.startsWith("_"))
        .map((f) => f.slice(0, -4))
        .sort();
  const jobs = names.flatMap((name) =>
    (["strict", "census"] as Mode[]).map((mode) => ({ name, mode })),
  );
  const results = await pool(CONCURRENCY, jobs, (j) =>
    runChild(j.name, j.mode),
  );
  const probes = names.map((name) => ({
    name,
    link: results.find((r) => r.name === name)?.link,
    strict: results.find((r) => r.name === name && r.mode === "strict"),
    census: results.find((r) => r.name === name && r.mode === "census"),
  }));
  if (canary) {
    const s = probes[0].strict;
    const ok = s?.status === "ok" && s?.stats?.classMiss?.tokens === 0;
    console.log(
      "canary: " +
        (ok ? "strict ok, classMiss 0" : "FAILED") +
        " (" +
        (s?.error ?? "") +
        ")",
    );
    console.log(summarize(probes));
    return ok ? 0 : 1;
  }
  const facts = await staticFacts();
  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(
    OUT,
    JSON.stringify(
      { generated: new Date().toISOString(), facts, probes },
      null,
      2,
    ),
  );
  console.log(summarize(probes));
  console.log("matrix: " + OUT);
  return 0;
}

async function main(): Promise<number> {
  if (process.argv.includes("--one")) {
    await child(argOf("--one")!, (argOf("--mode") ?? "strict") as Mode);
    return 0;
  }
  if (process.argv.includes("--summary")) {
    const saved = JSON.parse(readFileSync(OUT, "utf8"));
    console.log(summarize(saved.probes));
    return 0;
  }
  return parent(process.argv.includes("--canary"));
}

process.exit(await main());
