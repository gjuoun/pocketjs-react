// C1 tag mapping: DOM tags mount onto PocketJS host types, carry their DOM tag as
// provenance (debugName), and interactive tags come out focusable.
import { afterEach, expect, test } from "bun:test";
import { bootCore, type Core } from "./harness.ts";
import { mount } from "../src/index.ts";
import { rootMirror } from "../src/internal/pocket.ts";

let core: Core | undefined;
afterEach(() => core?.dispose());
// A class list is required even for unstyled nodes: it is what bakes the font atlas the
// drawn text runs come from.
const boot = async (): Promise<Core> => (core = await bootCore({ classes: ["text-base text-white"] }));
const appLayer = () => rootMirror.children[0];

test("<div> mounts as a view with its DOM tag as provenance", async () => {
  const c = await boot();
  mount(<div />);
  c.step(0);
  const div = appLayer().children[0];
  expect(div.domTag).toBe("view");
  expect(div.debugName).toBe("div");
});

test("<span> mounts as text and draws its run", async () => {
  const c = await boot();
  // The run needs a font slot: only styled text draws, so the span carries the boot class.
  mount(
    <div>
      <span className="text-base text-white">after</span>
    </div>,
  );
  c.step(0);
  expect(c.texts().map((r) => r.text)).toEqual(["after"]);
  const span = appLayer().children[0].children[0];
  expect(span.domTag).toBe("text");
  expect(span.children[0].text).toBe("after");
});

test("<button> mounts as a focusable view with provenance", async () => {
  const c = await boot();
  mount(
    <div>
      <button>Save</button>
    </div>,
  );
  c.step(0);
  const button = appLayer().children[0].children[0];
  expect(button.domTag).toBe("view");
  expect(button.debugName).toBe("button");
  expect(button.focusable).toBe(true);
  expect(button.children[0].text).toBe("Save");
});

test("a DOM tag outside the compat table is rejected with an actionable message", async () => {
  await boot();
  expect(() => mount(<article />)).toThrow("unknown host element <article>");
  expect(() => mount(<article />)).toThrow("compat table");
});
