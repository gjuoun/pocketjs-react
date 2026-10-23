// bun run measure:desktop — the example on the macOS desktop host (QuickJS), RUNS runs of
// the scripted d-pad sequence. Opens a real window and quits by itself (--quit-after).
//
// runDesktop(profile) is the same runner for a profile defined outside this repo.
import { join } from "node:path";
import {
  OUT,
  type Profile,
  profileFromArgs,
  RUNS,
  type RunSummary,
  report,
  summarize,
  wrapGuest,
} from "./common.ts";
import { DESKTOP_KEY, desktopHost } from "./desktop-host.ts";

/** Run one profile on the desktop host, RUNS times; returns the report's exit code. */
export async function runDesktop(
  profile: Profile,
  out: string = OUT,
): Promise<number> {
  const host = desktopHost();
  const built = await profile.build();
  const guest = await wrapGuest(built.js, join(out, "desktop-guest.js"));
  const presses = profile.script.flatMap((name, i) => [
    "--press",
    DESKTOP_KEY[name] + "@" + (30 + i * 10),
  ]);
  const quitAfter = String(30 + profile.script.length * 10 + 40);
  const runs: RunSummary[] = [];
  for (let i = 0; i < RUNS; i++) {
    const proc = Bun.spawnSync(
      [
        host.bin,
        "--app",
        "pocketjs-react",
        "--title",
        "pocketjs-react measure",
        "--viewport",
        "480x272",
        "--density",
        "2",
        "--fixed",
        "--quit-after",
        quitAfter,
        "--js",
        guest,
        "--pak",
        built.pak,
        ...presses,
      ],
      {
        cwd: host.root,
        env: { ...process.env, RUST_LOG: "info" },
      },
    );
    const lines = (proc.stdout.toString() + proc.stderr.toString())
      .split("\n")
      .filter((l) => l.includes("MEASURE "))
      .map((l) => l.slice(l.indexOf("MEASURE ")));
    console.log("== desktop run " + (i + 1) + " exit=" + proc.exitCode);
    for (const line of lines) console.log(line);
    if (proc.exitCode !== 0) return 1;
    runs.push(summarize(lines, profile));
  }
  return report("desktop", runs, built, profile);
}

if (import.meta.main) process.exit(await runDesktop(profileFromArgs()));
