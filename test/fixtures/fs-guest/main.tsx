// Fixture: uses the unchanged @pocketjs/framework/fs SDK against whatever fs the host mounted.
import { existsSync, file, readdirSync, write } from "@pocketjs/framework/fs";
import { mount, Text, View } from "pocketjs-react";

const report: Record<string, unknown> = {};
try {
  const names = existsSync("books") ? (readdirSync("books") as string[]) : [];
  report.books = names.map((name) => [name, file("books/" + name).bytes().length]);
  const state = (existsSync("state/reader.json") ? file("state/reader.json").json() : { opens: 0 }) as { opens: number };
  report.opens = state.opens + 1;
  write("state/reader.json", JSON.stringify({ opens: report.opens }));
  try {
    write("books/x.epub", "nope");
    report.booksWritable = true;
  } catch (error) {
    report.booksWritable = String(error);
  }
} catch (error) {
  report.error = String(error);
}
(globalThis as { __out?: string }).__out = JSON.stringify(report);

mount(
  <View className="w-full h-full bg-slate-900">
    <Text className="text-sm text-white">fs fixture</Text>
  </View>,
);
