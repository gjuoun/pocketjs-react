// C5 primitives on the real wasm core, mounted in-process like the C3 demo. The class vocabulary
// comes from building test/fixtures/primitives/all.tsx, so it is the one a built app gets.
import { afterEach, expect, test } from "bun:test";
import { BTN, getFocused } from "@pocketjs/framework/input";
import { type ReactNode } from "react";
import { mount, resetCompatStats, Text, View } from "../src/index.ts";
import { compileClasses } from "../src/internal/pocket-build.ts";
import * as Dialog from "../src/primitives/dialog.tsx";
import * as DropdownMenu from "../src/primitives/dropdown-menu.tsx";
import * as Select from "../src/primitives/select.tsx";
import { installBuildStyles } from "../src/style/build-styles.ts";
import { build } from "../tools/build.ts";
import { bootCore, type Core } from "./harness.ts";

let core: Core | undefined;
let unmount: (() => void) | undefined;
afterEach(() => {
  unmount?.();
  unmount = undefined;
  core?.dispose();
  core = undefined;
  resetCompatStats();
  installBuildStyles({}, new Uint8Array(0), []);
});

async function start(element: ReactNode): Promise<Core> {
  const built = await build("test/fixtures/primitives/all.tsx", {
    outdir: "/tmp/pocketjs-react-test/compat-c5-prim",
    name: "primitives",
  });
  core = await bootCore({ classes: built.tokens });
  installBuildStyles({}, compileClasses([]).bin, built.tokens);
  unmount = mount(element);
  core.step(0);
  return core;
}
const press = (c: Core, button: number) => c.press(button, 4);
const visible = (c: Core): string[] => c.texts().map((r) => r.text);
/** Text of the focused node's first text descendant. */
function focused(): string | undefined {
  const walk = (node: { text?: string; children: unknown[] }): string | undefined => {
    if (node.text) return node.text;
    for (const child of node.children as (typeof node)[]) {
      const found = walk(child);
      if (found) return found;
    }
    return undefined;
  };
  const node = getFocused();
  return node ? walk(node as never) : undefined;
}
function focusOn(c: Core, label: string): void {
  for (let i = 0; i < 4 && focused() !== label; i++) press(c, BTN.DOWN);
  expect(focused()).toBe(label);
}
const screen = (children: ReactNode) => (
  <View className="w-full h-full flex-col gap-1 p-2 bg-slate-100">{children}</View>
);

test("root: uncontrolled Trigger toggles and reports each change once", async () => {
  const calls: boolean[] = [];
  const c = await start(
    screen(
      <Dialog.Root onOpenChange={(open) => calls.push(open)}>
        <Dialog.Trigger className="bg-slate-900 px-2 py-1 rounded-md">Open</Dialog.Trigger>
      </Dialog.Root>,
    ),
  );
  focusOn(c, "Open");
  press(c, BTN.CIRCLE);
  press(c, BTN.CIRCLE);
  expect(calls).toEqual([true, false]);
});

test("root: controlled open ignores its own state and only reports the request", async () => {
  const calls: boolean[] = [];
  const c = await start(
    screen(
      <Dialog.Root open={false} onOpenChange={(open) => calls.push(open)}>
        <Dialog.Trigger className="bg-slate-900 px-2 py-1 rounded-md">Open</Dialog.Trigger>
      </Dialog.Root>,
    ),
  );
  focusOn(c, "Open");
  press(c, BTN.CIRCLE);
  expect(calls).toEqual([true]);
});

test("root: asChild merges the press onto the child and keeps the child's own onClick", async () => {
  const childClicks: number[] = [];
  const calls: boolean[] = [];
  function Go(props: { className?: string; onClick?: () => void }) {
    return (
      <View className={props.className} focusable onPress={props.onClick}>
        <Text className="text-sm text-white">Go</Text>
      </View>
    );
  }
  const c = await start(
    screen(
      <Dialog.Root onOpenChange={(open) => calls.push(open)}>
        <Dialog.Trigger asChild>
          <Go className="px-2 py-1 bg-slate-800 focus:bg-blue-600" onClick={() => childClicks.push(1)} />
        </Dialog.Trigger>
      </Dialog.Root>,
    ),
  );
  focusOn(c, "Go");
  press(c, BTN.CIRCLE);
  expect(childClicks).toEqual([1]);
  expect(calls).toEqual([true]);
});

/** A dialog with the vendored parts' shape: trigger, overlay, content with title and body. */
const dialogScreen = (onOpenChange?: (open: boolean) => void) =>
  screen(
    <Dialog.Root onOpenChange={onOpenChange}>
      <Dialog.Trigger className="bg-slate-900 px-2 py-1 rounded-md">Open</Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay />
        <Dialog.Content>
          <Dialog.Title>Dialog title</Dialog.Title>
          <Dialog.Description>Dialog body</Dialog.Description>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>,
  );

test("dialog: content mounts into the overlay on open and is absent while closed", async () => {
  const c = await start(dialogScreen());
  expect(visible(c)).not.toContain("Dialog title");
  focusOn(c, "Open");
  press(c, BTN.CIRCLE);
  expect(visible(c)).toContain("Dialog title");
  expect(visible(c)).toContain("Dialog body");
});

test("dialog: CROSS closes the content and focus returns to the trigger", async () => {
  const calls: boolean[] = [];
  const c = await start(dialogScreen((open) => calls.push(open)));
  focusOn(c, "Open");
  press(c, BTN.CIRCLE);
  expect(visible(c)).toContain("Dialog title");
  press(c, BTN.CROSS);
  expect(visible(c)).not.toContain("Dialog title");
  expect(focused()).toBe("Open");
  expect(calls).toEqual([true, false]);
});

test("dialog: the panel owns a dark surface (F4), not shadcn's white", async () => {
  const c = await start(dialogScreen());
  focusOn(c, "Open");
  press(c, BTN.CIRCLE);
  const title = c.texts().find((r) => r.text === "Dialog title")!;
  // The title sits inside the panel's p-3 padding: a point just left of it is panel surface.
  const surface = c.pixel(title.x - 4, title.y + 2);
  const channels = [1, 3, 5].map((i) => parseInt(surface.slice(i, i + 2), 16));
  expect(Math.max(...channels)).toBeLessThan(0x80);
});

test("dropdown: the trigger opens the menu, the d-pad moves, CROSS closes it and focus returns", async () => {
  const picks: string[] = [];
  const c = await start(
    screen(
      <DropdownMenu.Root>
        <DropdownMenu.Trigger className="bg-slate-900 px-2 py-1 rounded-md">Menu</DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content>
            <DropdownMenu.Item onSelect={() => picks.push("Edit")}>Edit</DropdownMenu.Item>
            <DropdownMenu.Item onSelect={() => picks.push("Delete")}>Delete</DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>,
    ),
  );
  focusOn(c, "Menu");
  press(c, BTN.CIRCLE);
  expect(visible(c)).toContain("Edit");
  expect(focused()).toBe("Edit");
  press(c, BTN.DOWN);
  expect(focused()).toBe("Delete");
  press(c, BTN.CROSS);
  expect(visible(c)).not.toContain("Edit");
  expect(focused()).toBe("Menu");
  expect(picks).toEqual([]);
});

test("dropdown: preventDefault in onSelect keeps the menu open; a plain select closes it", async () => {
  const events: boolean[] = [];
  const c = await start(
    screen(
      <DropdownMenu.Root>
        <DropdownMenu.Trigger className="bg-slate-900 px-2 py-1 rounded-md">Menu</DropdownMenu.Trigger>
        <DropdownMenu.Content>
          <DropdownMenu.Item
            onSelect={(event) => {
              event.preventDefault();
              events.push(true);
            }}
          >
            Keep
          </DropdownMenu.Item>
          <DropdownMenu.Item onSelect={() => events.push(false)}>Close</DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Root>,
    ),
  );
  focusOn(c, "Menu");
  press(c, BTN.CIRCLE);
  focusOn(c, "Keep");
  press(c, BTN.CIRCLE);
  expect(events).toEqual([true]);
  expect(visible(c)).toContain("Keep");
  focusOn(c, "Close");
  press(c, BTN.CIRCLE);
  expect(events).toEqual([true, false]);
  expect(visible(c)).not.toContain("Keep");
});

test("select: the trigger shows the placeholder, then the chosen label; onValueChange fires once", async () => {
  const changes: string[] = [];
  const c = await start(
    screen(
      <Select.Root onValueChange={(value) => changes.push(value)}>
        <Select.Trigger className="bg-slate-900 px-2 py-1 rounded-md">
          <Select.Value placeholder="Pick" />
        </Select.Trigger>
        <Select.Portal>
          <Select.Content>
            <Select.Item value="apple"><Select.ItemText>Apple</Select.ItemText></Select.Item>
            <Select.Item value="banana"><Select.ItemText>Banana</Select.ItemText></Select.Item>
          </Select.Content>
        </Select.Portal>
      </Select.Root>,
    ),
  );
  expect(visible(c)).toContain("Pick");
  focusOn(c, "Pick");
  press(c, BTN.CIRCLE);
  focusOn(c, "Banana");
  press(c, BTN.CIRCLE);
  expect(changes).toEqual(["banana"]);
  expect(visible(c)).toContain("Banana");
  expect(visible(c)).not.toContain("Apple");
});

test("select: an Item without a value is an error, not a silent empty choice", async () => {
  await expect(
    start(screen(<Select.Root><Select.Item value="">x</Select.Item></Select.Root>)),
  ).rejects.toThrow("value");
});
