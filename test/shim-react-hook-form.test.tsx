// Batch 4 step 13: the react-hook-form shim. A Controller's onChange writes the value the form reads back, and setError
// makes the field state and its message visible to the render function.
import { afterEach, expect, test } from "bun:test";
import { createElement } from "react";
import {
  Controller,
  FormProvider,
  useForm,
  type UseFormReturn,
} from "../src/primitives/react-hook-form.tsx";
import { mountTree, type Mounted } from "./batch4-support.ts";

let m: Mounted | undefined;
let api: UseFormReturn | undefined;
let field: { onChange(event: unknown): void } | undefined;
afterEach(() => {
  m?.dispose();
  m = undefined;
});

function Demo() {
  const form = useForm({ defaultValues: { email: "" } });
  api = form;
  return createElement(
    FormProvider,
    { ...form },
    createElement(Controller, {
      name: "email",
      control: form.control,
      render: (p: {
        field: { onChange(e: unknown): void };
        fieldState: { error?: { message?: string } };
      }) => {
        field = p.field;
        return createElement(
          "div",
          { className: "w-[200px] h-[20px]" },
          p.fieldState.error?.message ?? "clear",
        );
      },
    }),
  );
}

async function step(n = 4) {
  for (let i = 0; i < n; i++) {
    await new Promise((r) => setTimeout(r, 5));
    m!.core.step(0);
  }
  m!.core.render();
}

test("a Controller onChange writes the value the form reads", async () => {
  m = await mountTree(createElement(Demo), [import.meta.path]);
  await step();
  field!.onChange({ target: { value: "a@b.c" } });
  await step();
  expect(api!.getValues("email")).toBe("a@b.c");
});

test("setError shows the message in the field state", async () => {
  m = await mountTree(createElement(Demo), [import.meta.path]);
  await step();
  api!.setError("email", { type: "required", message: "Required" });
  await step();
  expect(m!.core.texts().map((t) => t.text)).toContain("Required");
});

test("register is a named error", async () => {
  m = await mountTree(createElement(Demo), [import.meta.path]);
  await step();
  expect(() => api!.register("x")).toThrow("register");
});
