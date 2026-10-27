import { afterEach, expect, test } from "bun:test";
import { BTN, getFocused } from "@pocketjs/framework/input";
import { View } from "../../src/index.ts";
import { rootMirror, type NodeMirror } from "../../src/internal/pocket.ts";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../src/native/tabs.tsx";
import { harness, ROOT } from "./support.ts";

const h = harness();
afterEach(() => h.dispose());

function findText(node: NodeMirror, text: string): NodeMirror | undefined {
  if (typeof (node as unknown as { text?: unknown }).text === "string" && (node as unknown as { text: string }).text === text) return node;
  for (const k of node.children) { const f = findText(k, text); if (f) return f; }
  return undefined;
}

/** The label whose trigger holds focus: the focused node is the trigger View, a few levels above its text run. */
function focusedTrigger(labels: string[]): string | null {
  const focused = getFocused() as unknown as NodeMirror | null;
  if (!focused) return null;
  for (const label of labels) {
    let p: NodeMirror | undefined = findText(rootMirror, label)?.parent ?? undefined;
    for (let k = 0; p && k < 3; k++, p = p.parent ?? undefined) if (p.id === focused.id) return label;
  }
  return null;
}

const LABELS = ["Account", "Password", "Billing"];

function App(props: { changes: string[] }) {
  return (
    <View className={ROOT}>
      <Tabs defaultValue="Account" onValueChange={(v) => props.changes.push(v)}>
        <TabsList>
          <TabsTrigger value="Account">Account</TabsTrigger>
          <TabsTrigger value="Password">Password</TabsTrigger>
          <TabsTrigger value="Billing">Billing</TabsTrigger>
        </TabsList>
        <TabsContent value="Account">Account body</TabsContent>
        <TabsContent value="Password">Password body</TabsContent>
        <TabsContent value="Billing">Billing body</TabsContent>
      </Tabs>
    </View>
  );
}

test("entering the list focuses the active trigger", async () => {
  await h.boot(() => <App changes={[]} />);
  h.core.press(BTN.DOWN);
  expect(focusedTrigger(LABELS)).toBe("Account");
});

test("only the active panel is mounted", async () => {
  await h.boot(() => <App changes={[]} />);
  const drawn = h.core.texts().map((t) => t.text);
  expect(drawn).toContain("Account body");
  expect(drawn).not.toContain("Password body");
  expect(drawn).not.toContain("Billing body");
});

test("RIGHT moves focus to the next trigger and activates it, wrapping at the end", async () => {
  const changes: string[] = [];
  await h.boot(() => <App changes={changes} />);
  h.core.press(BTN.DOWN);
  h.core.press(BTN.RIGHT);
  expect(focusedTrigger(LABELS)).toBe("Password");
  expect(h.core.texts().map((t) => t.text)).toContain("Password body");
  h.core.press(BTN.RIGHT);
  h.core.press(BTN.RIGHT);
  expect(focusedTrigger(LABELS)).toBe("Account");
  expect(changes.at(-1)).toBe("Account");
});

test("LEFT from the first trigger wraps to the last and activates it", async () => {
  const changes: string[] = [];
  await h.boot(() => <App changes={changes} />);
  h.core.press(BTN.DOWN);
  h.core.press(BTN.LEFT);
  expect(focusedTrigger(LABELS)).toBe("Billing");
  expect(h.core.texts().map((t) => t.text)).toContain("Billing body");
  expect(changes).toEqual(["Billing"]);
});
