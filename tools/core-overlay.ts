// Build a PocketJS core at a pinned upstream commit into a local overlay root, for the compat tests and
// demos. The upstream clone is read only: its tree is exported with git archive, and cargo builds
// inside the export, so the clone's tracked hosts/web/pocketjs.wasm is never rewritten.
//
//   bun tools/core-overlay.ts [--sha 30c23d2] [--src ~/code/pocket-nexus/pocketjs]
//
// Output: .cache/core-overlay/<sha>/ (the core root) with MANIFEST.json (ref, wasm sha256, cargo).
// Use it with POCKETJS_CORE_ROOT=<that dir>. Git-ignored; regenerate freely.
import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { homedir } from "node:os";
import { delimiter, join, resolve } from "node:path";

const REPO = resolve(import.meta.dir, "..");
const CACHE = join(REPO, ".cache/core-overlay");

function arg(name: string, fallback: string): string {
  const i = process.argv.indexOf(name);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}

function run(
  cmd: string[],
  opts: { cwd?: string; env?: Record<string, string> } = {},
): string {
  const proc = Bun.spawnSync(cmd, {
    cwd: opts.cwd,
    env: { ...process.env, ...opts.env },
    stdout: "pipe",
    stderr: "inherit",
  });
  if (proc.exitCode !== 0) {
    console.error("core-overlay: failed: " + cmd.join(" "));
    process.exit(proc.exitCode ?? 1);
  }
  return proc.stdout.toString().trim();
}

const srcArg = arg("--src", "~/code/pocket-nexus/pocketjs").replace(
  /^~(?=$|\/)/,
  homedir(),
);
const src = resolve(srcArg);
const shortSha = arg("--sha", "30c23d2");

const fullSha = run(["git", "rev-parse", "--verify", shortSha + "^{commit}"], {
  cwd: src,
});
if (!fullSha.startsWith(shortSha)) {
  console.error(
    "core-overlay: sha mismatch: asked " + shortSha + ", resolved " + fullSha,
  );
  process.exit(1);
}
const sha = fullSha.slice(0, shortSha.length);
const out = join(CACHE, sha);
const target = join(CACHE, "target");

// Always re-export: an overlay is never reused, so its MANIFEST always describes the tree it was built from.
const manifestPath = join(out, "MANIFEST.json");
rmSync(out, { recursive: true, force: true });

mkdirSync(out, { recursive: true });
run([
  "sh",
  "-c",
  "git -C " +
    JSON.stringify(src) +
    " archive " +
    fullSha +
    " | tar -x -C " +
    JSON.stringify(out),
]);

const cargoBin = join(homedir(), ".cargo/bin");
const env = {
  PATH: cargoBin + delimiter + (process.env.PATH ?? ""),
  CARGO_TARGET_DIR: target,
};
run(["cargo", "build", "--release", "--target", "wasm32-unknown-unknown"], {
  cwd: join(out, "engine/wasm"),
  env,
});

const built = join(target, "wasm32-unknown-unknown/release/pocketjs_wasm.wasm");
if (!existsSync(built)) {
  console.error("core-overlay: cargo did not produce " + built);
  process.exit(1);
}
const bytes = readFileSync(built);
writeFileSync(join(out, "hosts/web/pocketjs.wasm"), bytes);
const digest = createHash("sha256").update(bytes).digest("hex");
const cargo = run(["cargo", "--version"], { env });
writeFileSync(
  manifestPath,
  JSON.stringify(
    {
      ref: fullSha,
      wasm: "hosts/web/pocketjs.wasm",
      sha256: digest,
      bytes: bytes.byteLength,
      cargo,
    },
    null,
    2,
  ) + "\n",
);
console.log("core-overlay: " + out);
console.log(
  "core-overlay: wasm " + bytes.byteLength + " bytes sha256 " + digest,
);
