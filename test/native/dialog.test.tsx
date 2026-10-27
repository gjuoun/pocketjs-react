import { afterEach, expect, test } from "bun:test";
import { BTN } from "@pocketjs/framework/input";
import { View } from "../../src/index.ts";
import { Button } from "../../src/native/button.tsx";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogTitle, DialogTrigger } from "../../src/native/dialog.tsx";
import { harness, ROOT } from "./support.ts";

const h = harness();
afterEach(() => h.dispose());

// Trigger is the first node (0,0): its left border column at mid-height (rounded-md clips the corner).
const TRIGGER_EDGE = { x: 0, y: 18 };
const FOCUS = "#2563eb";
// Outside the centred 300 px panel and inside the scrim: dimmed when open, white when closed.
const OUTSIDE = { x: 5, y: 250 };

function App(props: { counts: { trigger: number; save: number }; open?: boolean }) {
  return (
    <View className={ROOT}>
      <Dialog open={props.open} defaultOpen={false}>
        <DialogTrigger onPress={() => { props.counts.trigger++; }}>Open</DialogTrigger>
        <DialogContent>
          <DialogTitle>Edit</DialogTitle>
          <DialogDescription>Change the name</DialogDescription>
          <DialogFooter>
            <DialogClose>Cancel</DialogClose>
            <Button onPress={() => { props.counts.save++; }}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </View>
  );
}

test("CIRCLE on the trigger opens the dialog and draws its title", async () => {
  const counts = { trigger: 0, save: 0 };
  await h.boot(() => <App counts={counts} />);
  expect(h.core.texts().map((t) => t.text)).not.toContain("Edit");
  h.core.press(BTN.DOWN);
  h.core.press(BTN.CIRCLE);
  expect(h.core.texts().map((t) => t.text)).toContain("Edit");
});

test("the d-pad cannot leave the open dialog: focus stays on its last button", async () => {
  const counts = { trigger: 0, save: 0 };
  await h.boot(() => <App counts={counts} />);
  h.core.press(BTN.DOWN);
  h.core.press(BTN.CIRCLE);
  for (let i = 0; i < 3; i++) h.core.press(BTN.DOWN);
  h.core.press(BTN.CIRCLE);
  expect(counts.save).toBe(1);
  expect(counts.trigger).toBe(1);
});

test("CROSS closes the dialog and gives focus back to the trigger", async () => {
  const counts = { trigger: 0, save: 0 };
  await h.boot(() => <App counts={counts} />);
  h.core.press(BTN.DOWN);
  h.core.press(BTN.CIRCLE);
  h.core.press(BTN.CROSS);
  expect(h.core.texts().map((t) => t.text)).not.toContain("Edit");
  h.core.render();
  expect(h.core.pixel(TRIGGER_EDGE.x, TRIGGER_EDGE.y)).toBe(FOCUS);
});

test("a controlled open prop shows the dialog without a press", async () => {
  const counts = { trigger: 0, save: 0 };
  await h.boot(() => <App counts={counts} open />);
  expect(h.core.texts().map((t) => t.text)).toContain("Edit");
});

test("the scrim dims the page outside the panel while open", async () => {
  const counts = { trigger: 0, save: 0 };
  await h.boot(() => <App counts={counts} />);
  h.core.render();
  expect(h.core.pixel(OUTSIDE.x, OUTSIDE.y)).toBe("#ffffff");
  h.core.press(BTN.DOWN);
  h.core.press(BTN.CIRCLE);
  h.core.render();
  expect(h.core.pixel(OUTSIDE.x, OUTSIDE.y)).not.toBe("#ffffff");
});
