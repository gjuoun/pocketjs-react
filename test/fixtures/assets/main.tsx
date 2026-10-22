// Fixture: exposes a bundled asset's bytes and draws symbols that only a glyph file provides.
import { mount, Text, View } from "pocketjs-react";
import { bundledAsset } from "../../../src/books/assets.ts";

(globalThis as { __asset?: Uint8Array }).__asset = bundledAsset("book.epub");

// Built from code points so the build's literal scan never sees these characters: like book
// text, they only exist at runtime.
const SYMBOLS = [0x57, 0x2211, 0x2264, 0x221e, 0xe9, 0x2014].map((c) => String.fromCodePoint(c));

mount(
  <View className="w-full h-full flex-row items-start gap-4 p-4 bg-slate-900">
    {SYMBOLS.map((s) => (
      <Text key={s} className="text-base text-white">{s}</Text>
    ))}
  </View>,
);
