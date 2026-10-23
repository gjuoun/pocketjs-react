// useFrame: one callback per host frame, with a 0-based counter, stopped on unmount.
import { expect, test } from "bun:test";
import { mount, useFrame, View } from "../src/index.ts";
import { bootCore } from "./harness.ts";

let seen: number[] = [];
function Probe() {
  useFrame((frame) => {
    seen.push(frame);
  });
  return <View style={{ width: 4, height: 4 }} />;
}

test("useFrame runs once per host frame with a 0-based counter", async () => {
  const core = await bootCore({ classes: [] });
  seen = [];
  const dispose = mount(<Probe />, { styles: {} });
  try {
    for (let i = 0; i < 5; i++) core.step(0);
    expect(seen).toEqual([0, 1, 2, 3, 4]);
  } finally {
    dispose();
    core.dispose();
  }
});

test("useFrame stops after unmount", async () => {
  const core = await bootCore({ classes: [] });
  seen = [];
  const dispose = mount(<Probe />, { styles: {} });
  try {
    core.step(0);
    core.step(0);
    expect(seen).toEqual([0, 1]);
    dispose();
    core.step(0);
    expect(seen).toEqual([0, 1]);
  } finally {
    core.dispose();
  }
});
