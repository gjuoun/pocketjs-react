import { afterEach, expect, test } from "bun:test";
import { View } from "../../src/index.ts";
import { Button } from "../../src/native/button.tsx";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../../src/native/card.tsx";
import { harness, ROOT } from "./support.ts";

const h = harness();
afterEach(() => h.dispose());

function sample() {
  return <View className={ROOT}><Card><CardHeader><CardTitle>Account</CardTitle><CardDescription>Manage it</CardDescription></CardHeader><CardContent><CardDescription>Body</CardDescription></CardContent><CardFooter><Button>Save</Button></CardFooter></Card></View>;
}

test("children stack top to bottom in declaration order", async () => {
  await h.boot(sample);
  const runs = h.core.texts();
  const y = (text: string) => runs.find((r) => r.text === text)!.y;
  expect(y("Account")).toBeLessThan(y("Manage it"));
  expect(y("Manage it")).toBeLessThan(y("Body"));
  expect(y("Body")).toBeLessThan(y("Save"));
});

test("the footer row pushes its button to the right edge", async () => {
  await h.boot(sample);
  const save = h.core.texts().find((r) => r.text === "Save")!;
  expect(save.x).toBeGreaterThan(240);
});

test("no drawn text run has zero area", async () => {
  await h.boot(sample);
  for (const r of h.core.texts()) {
    expect(r.w).toBeGreaterThan(0);
    expect(r.h).toBeGreaterThan(0);
  }
});
