// Dev aid (not a test): renders the built reader on the wasm core after a d-pad script and writes
// a PNG plus the drawn text, for looking at the screens.
//   bun test/reader-shot.ts <out-prefix> <buttons...>
import { bootApp } from "./harness.ts";
import { BTN } from "@pocketjs/framework/input";
import { FB_H, FB_W } from "../src/internal/pocket-build.ts";

const [prefix, ...script] = process.argv.slice(2);
const core = await bootApp({ js: "dist/reader.js", pak: "dist/reader.pak" });
for (const name of script) core.press((BTN as Record<string, number>)[name.toUpperCase()]);
const runs = core.texts();
console.log(runs.map((r) => r.x + "," + r.y + "," + r.w + " " + r.text).join("\n"));
const rgba = new Uint8Array(FB_W * FB_H * 4);
for (let y = 0; y < FB_H; y++) for (let x = 0; x < FB_W; x++) { const hex = core.pixel(x, y); const i = (y * FB_W + x) * 4; rgba[i] = parseInt(hex.slice(1, 3), 16); rgba[i + 1] = parseInt(hex.slice(3, 5), 16); rgba[i + 2] = parseInt(hex.slice(5, 7), 16); rgba[i + 3] = 255; }
const { encodePng } = await import("./png.ts");
await Bun.write(prefix + ".png", encodePng(rgba, FB_W, FB_H));
