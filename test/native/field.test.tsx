import { afterEach, expect, test } from "bun:test";
import { BTN, focusNode } from "@pocketjs/framework/input";
import { rootMirror } from "../../src/internal/pocket.ts";
import { View } from "../../src/index.ts";
import { ThemeProvider } from "../../src/native/theme.tsx";
import { triggerNode } from "../../tools/qa/acceptance/interaction.ts";
import { harness, inkAgainst, ROOT, settle, tick } from "./support.ts";

const h = harness();
afterEach(() => h.dispose());
const runOf = (text: string) => h.core.texts().find((t) => t.text === text)!;
const control = (label: string) => triggerNode(rootMirror, label);
async function press(key: number) { h.core.press(key); await tick(); await settle(h.core); }
/** WCAG contrast ratio of two #rrggbb colours. */
function ratio(a: string, b: string): number {
  const lum = (hex: string) => {
    const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  };
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

import { Button } from "../../src/native/button.tsx";
import { Field } from "../../src/native/field.tsx";
import { Input } from "../../src/native/input.tsx";
import { useState } from "react";

const RED_BORDER = "#dc2626";
const fieldRef: { current: { focusable: boolean } | null } = { current: null };
const SLATE_BORDER = "#cbd5e1";
/** The control's left border, read at the placeholder's centre row: px-3 puts the text 13 px inside the 1 px border. */
const borderOf = (placeholder: string) => { const r = runOf(placeholder); return h.core.pixel(r.x - 13, r.y + Math.floor(r.h / 2)); };

function Form(props: { error?: string; hint?: string; disabled?: boolean }) {
  return <View className={ROOT}><Field label="Email" hint={props.hint} error={props.error} disabled={props.disabled}><Input placeholder="name@mail" value="" onChange={() => {}} nodeRef={fieldRef as never} /></Field></View>;
}

function Toggle() {
  const [err, setErr] = useState(false);
  return (
    <View className={ROOT}>
      <Field label="Email" hint="Optional" error={err ? "Enter a valid email." : undefined}><Input placeholder="name@mail" value="" onChange={() => {}} nodeRef={fieldRef as never} /></Field>
      <Button onPress={() => setErr(true)}>Validate</Button>
    </View>
  );
}

test("a Field draws its label, the control and the hint in slate-500", async () => {
  await h.boot(() => <Form hint="We never share it." />);
  const drawn = h.core.texts().map((t) => t.text);
  expect(drawn).toContain("Email");
  expect(drawn).toContain("name@mail");
  expect(ratio(inkAgainst(h.core, runOf("We never share it.")), "#ffffff")).toBeGreaterThanOrEqual(4.5);
});

test("an invalid Field draws its control border red and its message in red-700", async () => {
  await h.boot(() => <Form error="Enter a valid email." />);
  expect(borderOf("name@mail")).toBe(RED_BORDER);
  expect(inkAgainst(h.core, runOf("Enter a valid email."))).toBe("#b91c1c");
});

test("a valid Field keeps the slate border", async () => {
  await h.boot(() => <Form hint="Optional" />);
  expect(borderOf("name@mail")).toBe(SLATE_BORDER);
});

test("the error line moves nothing: the control and the label keep their rows when the error appears", async () => {
  await h.boot(() => <Toggle />);
  const before = runOf("name@mail");
  const labelBefore = runOf("Email");
  focusNode(control("Validate") as never);
  await press(BTN.CIRCLE);
  const after = runOf("name@mail");
  expect(h.core.texts().map((t) => t.text)).toContain("Enter a valid email.");
  expect(after.y).toBe(before.y);
  expect(after.x).toBe(before.x);
  expect(runOf("Email").y).toBe(labelBefore.y);
  expect(borderOf("name@mail")).toBe(RED_BORDER);
});

test("a disabled Field dims its label to slate-500 and takes no focus", async () => {
  await h.boot(() => <Form disabled />);
  expect(inkAgainst(h.core, runOf("Email"))).toBe("#64748b");
  expect(fieldRef.current?.focusable).toBeFalsy();
});
