// Build a PocketJS core at a pinned upstream commit into a local overlay root, for the compat tests and
// demos. The upstream clone is read only: its tree is exported with git archive, and cargo builds
// inside the export, so the clone's tracked platforms/web/pocketjs.wasm is never rewritten.
//
//   bun tools/core-overlay.ts [--sha 7853cd83] [--src ~/code/pocket-nexus/pocketjs]
//
// The build is upstream's own (tools/wasm.ts): programs/web/wasm, package pocketjs-wasm, LTO, --locked, and
// the rustup toolchain pinned in tools/build/toolchains/rust.ts of the exported tree.
//
// Output: .cache/core-overlay/<sha>/ (the core root) with MANIFEST.json (ref, wasm sha256, toolchain, cargo).
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
/** Where upstream's build writes the wasm, and the web host binding it pairs with. */
const WASM_REL = "platforms/web/pocketjs.wasm";
const BINDING_REL = "platforms/web/wasm-ops.js";
/** The text worker's wasm: the host page starts it beside the core (tools/text-wasm.ts upstream). */
const TEXT_REL = "platforms/web/pocket_text.wasm";

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
const shortSha = arg("--sha", "7853cd83");

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

const rustPin = readFileSync(
  join(out, "tools/build/toolchains/rust.ts"),
  "utf8",
).match(/STABLE_RUST_TOOLCHAIN = "([^"]+)"/)?.[1];
if (!rustPin) {
  console.error("core-overlay: no STABLE_RUST_TOOLCHAIN in tools/build/toolchains/rust.ts");
  process.exit(1);
}

// cargo lives in ~/.cargo/bin, which non-login shells may not have on PATH.
const cargoBin = join(homedir(), ".cargo/bin");
const env = {
  PATH: cargoBin + delimiter + (process.env.PATH ?? ""),
  CARGO_TARGET_DIR: target,
  CARGO_PROFILE_RELEASE_LTO: "true",
};
run(
  [
    "cargo",
    "+" + rustPin,
    "build",
    "-p",
    "pocketjs-wasm",
    "--locked",
    "--release",
    "--target",
    "wasm32-unknown-unknown",
  ],
  { cwd: join(out, "programs/web/wasm"), env },
);

// The text worker (upstream tools/text-wasm.ts): its own crate, built the same way.
run(
  [
    "cargo",
    "+" + rustPin,
    "build",
    "--release",
    "--locked",
    "--target",
    "wasm32-unknown-unknown",
    "--manifest-path",
    join(out, "engine/crates/pocket-text/Cargo.toml"),
  ],
  { env: { ...env, CARGO_TARGET_DIR: join(CACHE, "target-text") } },
);
const textBuilt = join(CACHE, "target-text/wasm32-unknown-unknown/release/pocket_text.wasm");
if (!existsSync(textBuilt)) {
  console.error("core-overlay: cargo did not produce " + textBuilt);
  process.exit(1);
}
const textBytes = readFileSync(textBuilt);
writeFileSync(join(out, TEXT_REL), textBytes);

const built = join(target, "wasm32-unknown-unknown/release/pocketjs_wasm.wasm");
if (!existsSync(built)) {
  console.error("core-overlay: cargo did not produce " + built);
  process.exit(1);
}
if (!existsSync(join(out, BINDING_REL))) {
  console.error("core-overlay: exported tree has no " + BINDING_REL);
  process.exit(1);
}
const bytes = readFileSync(built);
mkdirSync(join(out, "platforms/web"), { recursive: true });
writeFileSync(join(out, WASM_REL), bytes);
const digest = createHash("sha256").update(bytes).digest("hex");
const cargo = run(["cargo", "+" + rustPin, "--version"], { env });
writeFileSync(
  manifestPath,
  JSON.stringify(
    {
      ref: fullSha,
      wasm: WASM_REL,
      binding: BINDING_REL,
      sha256: digest,
      bytes: bytes.byteLength,
      text: TEXT_REL,
      textSha256: createHash("sha256").update(textBytes).digest("hex"),
      toolchain: rustPin,
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
console.log("core-overlay: text " + textBytes.byteLength + " bytes");
