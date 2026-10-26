// Batch 3 wiring: `disabled` and `tabIndex` on DOM-mapped tags drive focus and the press (they are no longer dropped).
import { afterEach, expect, test } from "bun:test";
import { mount, resetCompatStats } from "../src/index.ts";
import { type NodeMirror, rootMirror } from "../src/internal/pocket.ts";
import { bootCore, type Core } from "./harness.ts";

let core: Core | undefined;
afterEach(() => {
  core?.dispose();
  core = undefined;
  resetCompatStats();
});

const BOX = "w-[40px] h-[20px] bg-slate-800";

/** Every focusable node under the mounted root, in d-pad order. */
function focusables(): NodeMirror[] {
  const out: NodeMirror[] = [];
  const walk = (n: NodeMirror) => {
    if ((n as { focusable?: boolean }).focusable) out.push(n);
    for (const k of n.children) walk(k);
  };
  walk(rootMirror);
  return out;
}

test("disabled: a disabled button takes no focus; the enabled one does", async () => {
  core = await bootCore({ classes: [BOX, "flex-col"] });
  mount(
    <div className="flex-col">
      <button disabled onClick={() => {}} className={BOX} />
      <button onClick={() => {}} className={BOX} />
    </div>,
  );
  core.step(0);
  expect(focusables().length).toBe(1);
});

test("tabIndex: a negative tabIndex keeps a node out of the d-pad order; zero keeps it in", async () => {
  core = await bootCore({ classes: [BOX, "flex-col"] });
  mount(
    <div className="flex-col">
      <div tabIndex={-1} className={BOX} />
      <div tabIndex={0} className={BOX} />
    </div>,
  );
  core.step(0);
  expect(focusables().length).toBe(1);
});
