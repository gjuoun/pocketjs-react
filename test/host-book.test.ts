// A book the host delivers at launch (the macOS app's launcher passes it as base64 text through
// --file, which the desktop host pushes as one {"t":"load"} svc line). Played on the wasm core;
// every observation is text the core drew.
import { beforeAll, expect, test } from "bun:test";
import { BTN } from "@pocketjs/framework/input";
import { strToU8, zipSync, type Zippable } from "fflate";
import { buildReader } from "../tools/build-reader.ts";
import { bootApp, type Core } from "./harness.ts";

const WHITEPAPER = "Bitcoin: A Peer-to-Peer Electronic Cash System";
const ERROR_LINE = "Could not open the book from disk.";
let built: { js: string; pak: string };

function testEpub(): Uint8Array {
  const chapter = (title: string, body: string) =>
    strToU8('<?xml version="1.0"?><html xmlns="http://www.w3.org/1999/xhtml"><body><h1>' + title + "</h1><p>" + body + "</p></body></html>");
  const files: Zippable = {
    mimetype: [strToU8("application/epub+zip"), { level: 0 }],
    "META-INF/container.xml": strToU8('<?xml version="1.0"?><container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container"><rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles></container>'),
    "OEBPS/content.opf": strToU8('<?xml version="1.0"?><package xmlns="http://www.idpf.org/2007/opf" version="3.0"><metadata xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:title>Host Delivered Test Book</dc:title><dc:creator>Test Author</dc:creator></metadata><manifest><item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/><item id="a" href="a.xhtml" media-type="application/xhtml+xml"/><item id="b" href="b.xhtml" media-type="application/xhtml+xml"/></manifest><spine><itemref idref="a"/><itemref idref="b"/></spine></package>'),
    "OEBPS/nav.xhtml": strToU8('<?xml version="1.0"?><html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops"><body><nav epub:type="toc"><ol><li><a href="a.xhtml">Opening Chapter</a></li><li><a href="b.xhtml">Closing Chapter</a></li></ol></nav></body></html>'),
    "OEBPS/a.xhtml": chapter("Opening Chapter", "The first page of a book that came from disk."),
    "OEBPS/b.xhtml": chapter("Closing Chapter", "The last page."),
  };
  return zipSync(files);
}

/** Serve one svc batch on the next poll, the way the desktop host delivers --file at boot. */
function deliver(core: Core, lines: string[]) {
  let served = false;
  core.ops.svcPoll = () => {
    if (served) return "";
    served = true;
    return lines.join("\n") + "\n";
  };
  for (let i = 0; i < 4; i++) core.step(0);
}

beforeAll(async () => {
  built = await buildReader({ outdir: "/tmp/pocketjs-react-test/host-book" });
});

test("a book delivered at launch opens to its contents, and the library lists it first", async () => {
  const core = await bootApp(built);
  try {
    const drawn = () => core.texts().map((r) => r.text);
    deliver(core, [JSON.stringify({ t: "hello", w: 480, h: 272 }), JSON.stringify({ t: "load", text: Buffer.from(testEpub()).toString("base64") })]);
    const toc = drawn();
    expect(toc).toContain("Opening Chapter");
    expect(toc).toContain("Closing Chapter");
    expect(toc).not.toContain("Library");

    core.press(BTN.CROSS); // back to the library
    const runs = core.texts();
    const host = runs.find((r) => r.text === "Host Delivered Test Book");
    const bundled = runs.find((r) => r.text === WHITEPAPER);
    expect(runs.map((r) => r.text)).toContain("Library");
    expect(host).toBeDefined();
    expect(bundled).toBeDefined();
    expect(host!.y).toBeLessThan(bundled!.y);
    expect(runs.map((r) => r.text)).not.toContain(ERROR_LINE);
  } finally {
    core.dispose();
  }
});

test("a delivered file that is not an EPUB leaves the library with an error line", async () => {
  const core = await bootApp(built);
  try {
    deliver(core, [JSON.stringify({ t: "load", text: Buffer.from("this is not a zip file").toString("base64") })]);
    const drawn = core.texts().map((r) => r.text);
    expect(drawn).toContain("Library");
    expect(drawn).toContain(WHITEPAPER);
    expect(drawn).toContain(ERROR_LINE);
  } finally {
    core.dispose();
  }
});

test("without a delivered book the library shows the bundled whitepaper only", async () => {
  const core = await bootApp(built);
  try {
    deliver(core, [JSON.stringify({ t: "hello", w: 480, h: 272 })]);
    const drawn = core.texts().map((r) => r.text);
    expect(drawn).toContain("Library");
    expect(drawn).toContain(WHITEPAPER);
    expect(drawn).not.toContain(ERROR_LINE);
    expect(drawn).not.toContain("Host Delivered Test Book");
  } finally {
    core.dispose();
  }
});
