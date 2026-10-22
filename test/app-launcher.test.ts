// The app launcher (Contents/MacOS/PocketReader): how a chooser answer or --book becomes the
// desktop host's argv. Runs the real script in a fake bundle with POCKETREADER_DRY_RUN=1, which
// prints the argv instead of exec'ing the host, and a stub for osascript.
import { afterAll, beforeAll, expect, test } from "bun:test";
import { chmodSync, copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const LAUNCHER = resolve(import.meta.dir, "../tools/app/launcher.sh");
let dir: string;
let app: string;
let book: string;

beforeAll(() => {
  dir = mkdtempSync(join(tmpdir(), "pocketreader-launcher-"));
  app = join(dir, "PocketReader.app/Contents");
  mkdirSync(join(app, "MacOS"), { recursive: true });
  mkdirSync(join(app, "Resources"), { recursive: true });
  mkdirSync(join(dir, "tmp"));
  writeFileSync(join(app, "MacOS/pocket-desktop-host"), "");
  book = join(dir, "My Book.epub");
  writeFileSync(book, new Uint8Array([80, 75, 3, 4, 0, 255, 128, 7, 1, 2, 3]));
});

afterAll(() => rmSync(dir, { recursive: true, force: true }));

/** A stub for osascript: records that it ran, then prints `answer` and exits with `code`. */
function chooser(answer: string, code: number): string {
  const stub = join(dir, "chooser-" + code + ".sh");
  writeFileSync(stub, "#!/bin/sh\necho ran > " + JSON.stringify(join(dir, "chooser-ran")) + "\nprintf '%s' " + JSON.stringify(answer) + "\nexit " + code + "\n");
  chmodSync(stub, 0o755);
  return stub;
}

function launch(args: string[], osascript?: string): { argv: string[]; chooserRan: boolean } {
  if (!existsSync(LAUNCHER)) throw new Error("no launcher at tools/app/launcher.sh");
  const exe = join(app, "MacOS/PocketReader");
  copyFileSync(LAUNCHER, exe);
  chmodSync(exe, 0o755);
  rmSync(join(dir, "chooser-ran"), { force: true });
  const env: Record<string, string> = { PATH: "/usr/bin:/bin", TMPDIR: join(dir, "tmp"), POCKETREADER_DRY_RUN: "1" };
  if (osascript) env.POCKETREADER_OSASCRIPT = osascript;
  const proc = Bun.spawnSync([exe, ...args], { env });
  if (proc.exitCode !== 0) throw new Error("launcher exit " + proc.exitCode + ": " + proc.stderr.toString());
  return { argv: proc.stdout.toString().split("\n").filter(Boolean), chooserRan: existsSync(join(dir, "chooser-ran")) };
}

const after = (argv: string[], flag: string) => argv[argv.indexOf(flag) + 1];

test("--book sends the file as base64 text through --file, with the reader's companion name", () => {
  const { argv, chooserRan } = launch(["--book", book], chooser("", 1));
  expect(chooserRan).toBe(false);
  expect(argv[0]).toBe(join(app, "MacOS/pocket-desktop-host"));
  expect(after(argv, "--companions")).toBe("reader");
  expect(after(argv, "--js")).toEndWith("Contents/MacOS/../Resources/reader.js");
  expect(after(argv, "--title")).toBe("PocketReader — My Book.epub");
  const sent = readFileSync(after(argv, "--file"), "utf8").trim();
  expect(sent).toBe(Buffer.from(readFileSync(book)).toString("base64"));
});

test("a book picked in the chooser is sent the same way", () => {
  const { argv, chooserRan } = launch([], chooser(book, 0));
  expect(chooserRan).toBe(true);
  expect(readFileSync(after(argv, "--file"), "utf8").trim()).toBe(Buffer.from(readFileSync(book)).toString("base64"));
});

test("a cancelled chooser starts the host without --file (the bundled book)", () => {
  const { argv, chooserRan } = launch([], chooser("", 1));
  expect(chooserRan).toBe(true);
  expect(argv).not.toContain("--file");
  expect(after(argv, "--companions")).toBe("reader");
  expect(after(argv, "--title")).toBe("PocketReader");
});

test("--no-chooser skips the chooser and host args after -- come last", () => {
  const { argv, chooserRan } = launch(["--no-chooser", "--", "--quit-after", "5"], chooser(book, 0));
  expect(chooserRan).toBe(false);
  expect(argv).not.toContain("--file");
  expect(argv.slice(-2)).toEqual(["--quit-after", "5"]);
});
