// C8 selector tokens: disabled:, aria-invalid:, data-[k=v]: and has-[>svg]: resolve per node from
// the node's DOM props and children. Unit cases pin the parser and the resolution; the pixel cases
// run the real core under the strict policies (classMiss throw, tokenMap on).
import { afterEach, expect, test } from "bun:test";
import type { ReactNode } from "react";
import {
  holds,
  resolveSelectors,
  selectorInputs,
  splitSelector,
} from "../src/compat/selectors.ts";
import { mount, resetCompatStats } from "../src/index.ts";
import { compileClasses } from "../src/internal/pocket-build.ts";
import { installBuildStyles } from "../src/style/build-styles.ts";
import { bootCore, type Core } from "./harness.ts";

// The compat focus border is in src/, so the real build carries its tokens too.
const TOKENS = [
  "w-full",
  "h-full",
  "p-4",
  "w-16",
  "h-16",
  "w-4",
  "h-4",
  "bg-slate-800",
  "bg-red-600",
  "px-3",
  "px-4",
  "focus:border-blue-600",
  "focus:border-2",
];
let core: Core | undefined;
afterEach(() => {
  core?.dispose();
  core = undefined;
  resetCompatStats();
  installBuildStyles({}, new Uint8Array(0), []);
});

function CheckIcon() {
  return <div className="w-4 h-4" />;
}

test("splitSelector: the first variant prefix decides, nested chains keep their body", () => {
  expect(splitSelector("disabled:opacity-50")).toMatchObject({
    prefix: "disabled",
    body: "opacity-50",
    selector: { kind: "disabled" },
  });
  expect(splitSelector("data-[state=open]:bg-accent")).toMatchObject({
    selector: { kind: "data", name: "state", value: "open" },
    body: "bg-accent",
  });
  expect(
    splitSelector("data-[variant=destructive]:focus:bg-red-600"),
  ).toMatchObject({ body: "focus:bg-red-600" });
  expect(splitSelector("has-[>svg]:px-3")).toMatchObject({
    selector: { kind: "has-svg" },
    body: "px-3",
  });
  expect(splitSelector("aria-invalid:border-red-600")).toMatchObject({
    selector: { kind: "invalid" },
  });
  // Not resolved here: a plain variant, a descendant rule and a dark: variant stay null.
  expect(splitSelector("focus:bg-red-600")).toBeNull();
  // A descendant rule parses as its own kind; it never resolves against the node itself.
  expect(splitSelector("[&_svg]:shrink-0")).toMatchObject({
    selector: { kind: "svg" },
    body: "shrink-0",
  });
  expect(splitSelector("dark:bg-red-600")).toBeNull();
  expect(splitSelector("bg-red-600")).toBeNull();
});

test("selectorInputs names the DOM props a class reads", () => {
  expect(
    [
      ...selectorInputs(
        "disabled:opacity-50 data-[state=open]:bg-accent aria-invalid:border-red-600 data-[inset]:pl-8",
      ),
    ].sort(),
  ).toEqual(["aria-invalid", "data-inset", "data-state", "disabled"]);
  expect(selectorInputs(undefined).size).toBe(0);
});

test("holds: disabled, aria-invalid, data-[k=v] and data-[k] read the node's props", () => {
  const node = (props: Record<string, unknown>) => ({ props });
  expect(holds({ kind: "disabled" }, node({ disabled: true }))).toBe(true);
  expect(holds({ kind: "disabled" }, node({ disabled: false }))).toBe(false);
  expect(holds({ kind: "disabled" }, node({ disabled: "" }))).toBe(true);
  expect(holds({ kind: "invalid" }, node({ "aria-invalid": "true" }))).toBe(
    true,
  );
  expect(holds({ kind: "invalid" }, node({}))).toBe(false);
  expect(
    holds(
      { kind: "data", name: "state", value: "open" },
      node({ "data-state": "open" }),
    ),
  ).toBe(true);
  expect(
    holds(
      { kind: "data", name: "state", value: "open" },
      node({ "data-state": "closed" }),
    ),
  ).toBe(false);
  expect(
    holds({ kind: "data", name: "inset" }, node({ "data-inset": true })),
  ).toBe(true);
  expect(holds({ kind: "data", name: "inset" }, node({}))).toBe(false);
});

function CardAction() {
  return null;
}

test("holds: has-data-[slot=v] matches a child by data-slot or by its component name (CardAction -> card-action)", () => {
  const withAction = {
    props: {},
    children: [<span key="a" />, <CardAction key="b" />],
  };
  expect(holds({ kind: "has-data", value: "card-action" }, withAction)).toBe(
    true,
  );
  expect(
    holds(
      { kind: "has-data", value: "card-action" },
      { props: {}, children: <span /> },
    ),
  ).toBe(false);
  expect(
    holds(
      { kind: "has-data", value: "card-action" },
      { props: {}, children: <div data-slot="card-action" /> },
    ),
  ).toBe(true);
});

test("holds: has-[>svg] is true for a React child that draws an icon", () => {
  expect(
    holds({ kind: "has-svg" }, { props: {}, children: <CheckIcon /> }),
  ).toBe(true);
  expect(
    holds(
      { kind: "has-svg" },
      { props: {}, children: [<span key="a" />, <CheckIcon key="b" />] },
    ),
  ).toBe(true);
  expect(holds({ kind: "has-svg" }, { props: {}, children: "text" })).toBe(
    false,
  );
});

test("resolveSelectors keeps holding bodies, drops failing ones, passes plain tokens through", () => {
  const props = { disabled: true, "data-state": "closed" };
  const out = resolveSelectors(
    "w-16 bg-slate-800 disabled:bg-red-600 data-[state=open]:bg-red-600 h-16",
    { props },
  );
  expect(out).toBe("w-16 bg-slate-800 bg-red-600 h-16");
  expect(resolveSelectors("p-4 focus:bg-red-600", { props: {} })).toBe(
    "p-4 focus:bg-red-600",
  );
});

/** Boot and mount one wrapped child; the child is a 64px box at (16, 16) inside the p-4 wrapper. */
async function render(child: ReactNode): Promise<Core> {
  const styles = compileClasses(TOKENS);
  installBuildStyles(styles.ids, styles.bin, TOKENS);
  core = await bootCore({ classes: TOKENS });
  mount(<div className="w-full h-full p-4">{child}</div>, {
    compat: { classMiss: "throw", tokenMap: true },
  });
  core.step(0);
  core.render();
  return core;
}

test("strict: a disabled node takes disabled:bg-red-600 (the core sees only the resolved class)", async () => {
  const c = await render(
    <button className="w-16 h-16 bg-slate-800 disabled:bg-red-600" disabled />,
  );
  expect(c.pixel(20, 20)).toBe("#dc2626");
});

test("strict: an enabled node keeps its own colour; the disabled body never reaches the core", async () => {
  const c = await render(
    <div className="w-16 h-16 bg-slate-800 disabled:bg-red-600" />,
  );
  expect(c.pixel(20, 20)).toBe("#1e293b");
});

test("strict: data-[state=open]: applies only while the DOM prop matches", async () => {
  const c = await render(
    <div
      className="w-16 h-16 bg-slate-800 data-[state=open]:bg-red-600"
      data-state="open"
    />,
  );
  expect(c.pixel(20, 20)).toBe("#dc2626");
});

test("strict: has-[>svg]: applies only when the node has an icon child", async () => {
  const c = await render(
    <div className="w-16 h-16 bg-slate-800 has-[>svg]:bg-red-600">
      <CheckIcon />
    </div>,
  );
  expect(c.pixel(20, 20)).toBe("#dc2626");
});
