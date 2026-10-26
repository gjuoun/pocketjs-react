// Batch 4 step 16: the embla shim moves the carousel track one viewport length per Next press and back on Previous. The
// slide texts are read from where the core draws them. The vendored carousel loads at run time (its own types are not part
// of the project check).
import { afterEach, expect, test } from "bun:test";
import { BTN, focusNode } from "@pocketjs/framework/input";
import { createElement } from "react";
import { type NodeMirror } from "../src/internal/pocket.ts";
import { mountTree, uiFiles, type Mounted } from "./batch4-support.ts";

const CAROUSEL = new URL(
  "../test/fixtures/shadcn-full/ui/carousel.tsx",
  import.meta.url,
).pathname;
const C = (await import(CAROUSEL)) as Record<string, any>;

let m: Mounted | undefined;
afterEach(() => {
  m?.dispose();
  m = undefined;
});

function tree() {
  return createElement(
    "div",
    { className: "w-[200px] h-[80px]" },
    createElement(
      C.Carousel,
      { className: "w-full h-full" },
      createElement(
        C.CarouselContent,
        null,
        ...["One", "Two", "Three"].map((t) =>
          createElement(
            C.CarouselItem,
            { key: t },
            createElement("div", { className: "h-[40px] w-full" }, t),
          ),
        ),
      ),
      createElement(C.CarouselPrevious, null),
      createElement(C.CarouselNext, null),
    ),
  );
}

async function step(n = 4) {
  for (let i = 0; i < n; i++) {
    await new Promise((r) => setTimeout(r, 5));
    m!.core.step(0);
  }
  m!.core.render();
}

const focusables = () =>
  m!
    .nodes()
    .filter((x) => (x as { focusable?: boolean }).focusable) as NodeMirror[];
const labelX = (t: string) =>
  m!.core.texts().find((x) => x.text === t)?.x ?? NaN;

test("Next moves the track one slide and Previous moves it back", async () => {
  m = await mountTree(tree(), [import.meta.path, ...uiFiles()], {
    width: 480,
    height: 272,
  });
  await step();
  // One slide step: Two moves to where One was. Previous is disabled at the start, so Next is the only focusable.
  const one = labelX("One");
  const two = labelX("Two");
  focusNode(focusables()[0]);
  m!.core.press(BTN.CIRCLE);
  await step();
  expect(Math.abs(labelX("Two") - one)).toBeLessThanOrEqual(2);
  // Previous is now the first focusable and moves back by the same step.
  focusNode(focusables()[0]);
  m!.core.press(BTN.CIRCLE);
  await step();
  expect(Math.abs(labelX("Two") - two)).toBeLessThanOrEqual(2);
});
