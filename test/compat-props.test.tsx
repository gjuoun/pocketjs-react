// C1 prop policy: shadcn's data-*/aria-* and the DOM attribute surface drop + count,
// onClick aliases to onPress, unknown props throw by default and drop+count under
// mount({ compat: { unknownProps: "drop" } }), and interactive tags come out focusable.
import { afterEach, expect, test } from "bun:test";
import { bootCore, type Core } from "./harness.ts";
import { compatStats, mount, resetCompatStats } from "../src/index.ts";
import { rootMirror } from "../src/internal/pocket.ts";

let core: Core | undefined;
afterEach(() => {
  core?.dispose();
  resetCompatStats();
});
const boot = async (): Promise<Core> => (core = await bootCore({ classes: ["text-base text-white"] }));
const first = () => rootMirror.children[0].children[0];

test("data-*/aria-*/DOM attrs drop and count; the element still mounts", async () => {
  const c = await boot();
  mount(
    <div data-slot="button" aria-label="x" tabIndex={0} role="button" />,
  );
  c.step(0);
  expect(first().domTag).toBe("view");
  expect(compatStats().droppedAttrs).toEqual({ "data-slot": 1, "aria-label": 1, tabIndex: 1, role: 1 });
});

test("an unrecognized prop throws, naming the prop, the tag and the switch", async () => {
  await boot();
  expect(() => mount(<div {...({ foo: "bar" } as any)} />)).toThrow("unknown property 'foo' on <div>");
  expect(() => mount(<div {...({ foo: "bar" } as any)} />)).toThrow('unknownProps: "drop"');
});

test('under unknownProps: "drop" it renders and the count lands in the report', async () => {
  const c = await boot();
  mount(
    <div {...({ foo: "bar" } as any)} data-x={1} />,
    { compat: { unknownProps: "drop" } },
  );
  c.step(0);
  expect(first().domTag).toBe("view");
  expect(compatStats().unknownAttrs).toEqual({ foo: 1 });
  expect(compatStats().droppedAttrs).toEqual({ "data-x": 1 });
});

test("focusable defaults: button/a and onClick carriers are focusable, plain div is not", async () => {
  const c = await boot();
  const noop = () => {};
  mount(
    <div>
      <button>Save</button>
      <div onClick={noop}>clickable</div>
      <div>plain</div>
      <div {...({ focusable: false } as any)}>forced off</div>
    </div>,
  );
  c.step(0);
  const div = first().children;
  expect(div[0].focusable).toBe(true);
  expect(div[1].focusable).toBe(true);
  expect(div[1].onPress).toBe(noop);
  expect(div[2].focusable).toBeUndefined();
  expect(div[3].focusable).toBe(false);
});
