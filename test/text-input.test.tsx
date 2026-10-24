// C4 text input, step by step on the real wasm core: the field surface (structure and
// counters) first, then the keyboard, then the typing loop. Each test mounts its own app so
// the store (one open field) starts empty.
import { afterEach, expect, test } from "bun:test";
import { useState } from "react";
import { compatStats, mount, resetCompatStats } from "../src/index.ts";
import {
  FIELD_PLACEHOLDER_CLASS,
  FIELD_VALUE_CLASS,
} from "../src/input/text-field.ts";
import { rootMirror } from "../src/internal/pocket.ts";
import { bootCore, type Core } from "./harness.ts";

const CLASSES = [
  "w-full h-full flex-col gap-1 p-2 bg-slate-100",
  "h-9 w-full rounded-md bg-slate-800",
  FIELD_VALUE_CLASS,
  FIELD_PLACEHOLDER_CLASS,
];

let core: Core | undefined;
afterEach(() => {
  core?.dispose();
  core = undefined;
  resetCompatStats();
});

const boot = async (): Promise<Core> => (core = await bootCore({ classes: CLASSES }));
/** The app layer's first element (the app's root view). */
const appRoot = () => rootMirror.children[0].children[0];

test("an <input> mounts as a focusable view with a text child the layer owns", async () => {
  const c = await boot();
  mount(
    <div>
      <input placeholder="Name" />
    </div>,
  );
  c.step(0);
  const input = appRoot().children[0];
  expect(input.domTag).toBe("view");
  expect(input.debugName).toBe("input");
  expect(input.focusable).toBe(true);
  expect(input.children.length).toBe(1);
  expect(input.children[0].domTag).toBe("#text");
  expect(input.children[0].text).toBe("Name");
  expect(c.texts().map((r) => r.text)).toEqual(["Name"]);
});

test("a controlled value draws instead of the placeholder", async () => {
  const c = await boot();
  const seen: string[] = [];
  mount(
    <div>
      <input
        placeholder="Name"
        value="Ada"
        onChange={(e) => seen.push(e.target.value)}
      />
    </div>,
  );
  c.step(0);
  expect(appRoot().children[0].children[0].text).toBe("Ada");
  expect(c.texts().map((r) => r.text)).toEqual(["Ada"]);
  expect(seen).toEqual([]);
});

test("the field surface is counted as mapped, not dropped", async () => {
  const c = await boot();
  mount(
    <div>
      <input
        placeholder="Name"
        value="Ada"
        maxLength={8}
        onChange={() => {}}
      />
    </div>,
  );
  c.step(0);
  const stats = compatStats();
  expect(stats.mappedAttrs).toEqual({
    placeholder: 1,
    value: 1,
    maxLength: 1,
    onChange: 1,
  });
  expect(stats.droppedAttrs).toEqual({});
});

test("the rest of the DOM input surface drops and counts instead of throwing", async () => {
  const c = await boot();
  mount(
    <div>
      <textarea
        placeholder="Note"
        rows={4}
        autoComplete="off"
        spellCheck={false}
        readOnly
      />
    </div>,
  );
  c.step(0);
  expect(appRoot().children[0].focusable).toBe(true);
  expect(compatStats().droppedAttrs).toEqual({
    rows: 1,
    autoComplete: 1,
    spellCheck: 1,
    readOnly: 1,
  });
  expect(compatStats().mappedAttrs).toEqual({ placeholder: 1 });
});
