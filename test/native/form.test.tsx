import { afterEach, expect, test } from "bun:test";
import { Text, View } from "../../src/index.ts";
import { Form, FormField } from "../../src/native/form.tsx";
import { Input } from "../../src/native/input.tsx";
import { TOKENS } from "../../src/native/tokens.ts";
import { walk } from "../../tools/qa/acceptance/geometry.ts";
import { harness, inkAgainst, ROOT } from "./support.ts";

const h = harness();
afterEach(() => h.dispose());
const OVERLAY = !!process.env.POCKETJS_CORE_ROOT;
const ERROR_INK = "#b91c1c";

function drawn(): string[] { return h.core.texts().map((t) => t.text); }
function runOf(text: string) {
  const run = h.core.texts().find((t) => t.text === text);
  if (!run) throw new Error("no run " + text);
  return run;
}

function App(props: { errors?: Record<string, string> }) {
  return (
    <View className={ROOT}>
      <Form errors={props.errors}>
        <FormField name="email" label="Email" hint="We never share it.">
          <Input placeholder="name@mail" value="" onChange={() => {}} />
        </FormField>
        <FormField name="nickname" label="Nickname">
          <Input placeholder="Optional" value="" onChange={() => {}} />
        </FormField>
      </Form>
    </View>
  );
}

test("a valid form draws each label and its hint, and no error message", async () => {
  await h.boot(() => <App />);
  expect(drawn()).toContain("Email");
  expect(drawn()).toContain("Nickname");
  expect(drawn()).toContain("We never share it.");
  expect(drawn()).not.toContain("Enter a valid email.");
});

test("an error in the app map draws its message in the error ink, replacing the hint", async () => {
  await h.boot(() => <App errors={{ email: "Enter a valid email." }} />);
  expect(drawn()).toContain("Enter a valid email.");
  expect(drawn()).not.toContain("We never share it.");
  if (OVERLAY) expect(inkAgainst(h.core, runOf("Enter a valid email."))).toBe(ERROR_INK);
});

test("the field count and names reach the mirror: one field per name", async () => {
  await h.boot(() => <App />);
  const names: string[] = [];
  walk((await import("../../src/internal/pocket.ts")).rootMirror, (n) => {
    if (n.debugName?.startsWith("form-field:")) names.push(n.debugName.slice("form-field:".length));
  });
  expect(names).toEqual(["email", "nickname"]);
});

test("every form token exists", () => {
  for (const k of ["form.field", "form.message"]) expect(TOKENS[k as keyof typeof TOKENS]).toBeDefined();
});

test("mutant: a message that renders with no error shows a line in a valid form (the valid check above fails on it)", async () => {
  // The defect body: the message component ignores the errors map and always draws its default text.
  const Always = () => (
    <View className={ROOT}>
      <View className="flex-col gap-1 w-full">
        <Text className="text-sm font-bold text-slate-900">Email</Text>
        <View className="h-4 w-full flex-row items-center"><Text className="text-xs font-bold text-red-700">Enter a valid email.</Text></View>
      </View>
    </View>
  );
  await h.boot(() => <Always />);
  expect(drawn()).toContain("Enter a valid email.");
});
