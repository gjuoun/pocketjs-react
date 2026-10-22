// Fixture for Grid, Tabs, Menu and windowed List; globalThis.__mode picks the screen.
import React, { useState } from "react";
import { BTN, Grid, List, Menu, mount, Tabs, Text, useButton, View } from "pocketjs-react";

const mode = (globalThis as { __mode?: string }).__mode ?? "grid";
const ITEM = "w-[60px] h-[24px] items-center justify-center rounded bg-slate-800 focus:bg-blue-600";
const g = globalThis as { __selected?: string[] };
const select = (label: string) => (g.__selected ??= []).push(label);

function Swatch() {
  return <View className="w-[30px] h-[10px] bg-blue-600" />;
}

function GridScreen() {
  return (
    <Grid columns={3} className="w-[200px] gap-1">
      {Array.from({ length: 9 }, (_, i) => (
        <View key={i} className={ITEM} focusable onPress={() => select("G" + (i + 1))}>
          <Text className="text-sm text-white">{"G" + (i + 1)}</Text>
        </View>
      ))}
    </Grid>
  );
}

function TabsScreen() {
  const panel = (prefix: string) => (
    <List items={[1, 2, 3]} keyOf={(n) => n} onSelect={(n) => select(prefix + n)} renderItem={(n) => <Text className="text-sm text-white">{prefix + n}</Text>} />
  );
  return <Tabs dark tabs={[{ title: "Books", content: panel("B") }, { title: "Files", content: panel("F") }]} />;
}

function MenuScreen() {
  const [open, setOpen] = useState(false);
  useButton(BTN.START, () => setOpen(true));
  return (
    <View className="flex-col gap-1">
      <List items={["Page"]} onSelect={() => select("Page")} renderItem={(t) => <Text className="text-sm text-white">{t}</Text>} />
      <Menu open={open} onClose={() => setOpen(false)} title="Menu" items={[{ label: "Contents", onSelect: () => select("Contents") }, { label: "Settings", onSelect: () => select("Settings") }]} />
    </View>
  );
}

function ListScreen() {
  const items = Array.from({ length: 12 }, (_, i) => "L" + (i + 1));
  return <List items={items} visibleCount={4} keyOf={(t) => t} onSelect={select} renderItem={(t) => <Text className="text-sm text-white">{t}</Text>} />;
}

const SCREENS: Record<string, () => React.ReactElement> = { grid: GridScreen, tabs: TabsScreen, menu: MenuScreen, list: ListScreen };
const Screen = SCREENS[mode];

mount(
  <View className="w-full h-full flex-col gap-2 p-2 bg-slate-900">
    <Swatch />
    <Screen />
  </View>,
);
