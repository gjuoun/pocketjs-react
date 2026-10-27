import { afterEach, expect, test } from "bun:test";
import { View } from "../../src/index.ts";
import { Label } from "../../src/native/label.tsx";
import { ThemeProvider } from "../../src/native/theme.tsx";
import { TOKENS } from "../../src/native/tokens.ts";
import { harness, inkOf, ROOT } from "./support.ts";

const h = harness();
afterEach(() => h.dispose());
const runOf = (text: string) => h.core.texts().find((t) => t.text === text)!;

test("a Label at rest draws its text in slate-900 on the page", async () => {
  await h.boot(() => <View className={ROOT}><Label>Email address</Label></View>);
  expect(inkOf(h.core, runOf("Email address"))).toBe("#0f172a");
});

test("a disabled Label draws its text in slate-500 (4.76:1 on white)", async () => {
  await h.boot(() => <View className={ROOT}><Label disabled>Account number</Label></View>);
  expect(inkOf(h.core, runOf("Account number"))).toBe("#64748b");
});

test("the disabled prop picks the ink: enabled on one mount, disabled on another", async () => {
  const app = (off: boolean) => <View className={ROOT}><Label disabled={off}>Nickname</Label></View>;
  await h.boot(() => app(false));
  const before = inkOf(h.core, runOf("Nickname"));
  h.dispose();
  await h.boot(() => app(true));
  expect(before).toBe("#0f172a");
  expect(inkOf(h.core, runOf("Nickname"))).toBe("#64748b");
});

test("the dark theme draws a Label in white at rest", async () => {
  await h.boot(() => <ThemeProvider theme="dark"><View className={ROOT}><Label>Email address</Label></View></ThemeProvider>);
  expect(inkOf(h.core, runOf("Email address"))).toBe("#ffffff");
});

test("every Label state has a token (structure)", () => {
  for (const k of ["label.base", "label.rest", "label.disabled"] as const) expect(TOKENS[k]).toBeDefined();
});
