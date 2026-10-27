// Defect mutants for the native judge: each defect is one body that must fail its gate; each -control is the same
// body done right, which must pass. Built one entry per name by tools/native/judge.ts --mutants.
// Sizes that are not in the vocabulary go through the style prop (the build scan does not collect arbitrary lengths here).
import { BTN } from "@pocketjs/framework/input";
import { useState, type ReactNode } from "react";
import { Text, View } from "../../src/index.ts";
import { Button } from "../../src/native/button.tsx";
import { Focusable } from "../../src/native/focusable.tsx";
import { Card, CardTitle } from "../../src/native/card.tsx";
import { TOKENS } from "../../src/native/tokens.ts";
import { Text as Txt, View as Vw } from "../../src/index.ts";
import { Badge } from "../../src/native/badge.tsx";
import { Checkbox } from "../../src/native/checkbox.tsx";
import { Switch } from "../../src/native/switch.tsx";
import { RadioGroup, RadioItem } from "../../src/native/radio.tsx";
import { Select } from "../../src/native/select.tsx";
import { Slider } from "../../src/native/slider.tsx";
import { Avatar } from "../../src/native/avatar.tsx";
import { Progress } from "../../src/native/progress.tsx";
import { Label } from "../../src/native/label.tsx";
import { Separator } from "../../src/native/separator.tsx";
import { ThemePage } from "./gallery/pages.tsx";
import type { Driver } from "../../tools/qa/acceptance/drivers.ts";

const T = TOKENS as Record<string, string>;
const ROOT = "w-full h-full flex-col bg-white p-2 gap-2";

function LiveProgress() {
  const [v, setV] = useState(30);
  return (
    <View className="flex-col gap-2">
      <Progress value={v} />
      <Label>{v + "%"}</Label>
      <Button onPress={() => setV(Math.min(100, v + 10))}>Live progress</Button>
    </View>
  );
}

function LiveCheckbox() {
  const [on, setOn] = useState(false);
  return (
    <View className="flex-col gap-2">
      <Checkbox checked={on} onCheckedChange={setOn}>Live checkbox</Checkbox>
    </View>
  );
}

function LiveSwitch() {
  const [on, setOn] = useState(false);
  return (
    <View className="flex-col gap-2">
      <Switch checked={on} onCheckedChange={setOn}>Live switch</Switch>
    </View>
  );
}

function LiveRadio() {
  const [plan, setPlan] = useState("monthly");
  return (
    <View className="flex-col gap-2">
      <RadioGroup value={plan} onValueChange={setPlan}>
        <RadioItem value="monthly">Live radio</RadioItem>
        <RadioItem value="yearly">Yearly</RadioItem>
      </RadioGroup>
      <Label>{"Plan " + plan}</Label>
    </View>
  );
}

function LiveSelect() {
  const [plan, setPlan] = useState("monthly");
  return (
    <View className="flex-col gap-2">
      <Select value={plan} onValueChange={setPlan} options={[{ value: "monthly", label: "Live select" }, { value: "yearly", label: "Yearly" }]} />
      <Label>{"Plan " + plan}</Label>
    </View>
  );
}

function LiveSlider() {
  const [v, setV] = useState(30);
  return (
    <View className="flex-col gap-2">
      <Slider value={v} onValueChange={setV}>Live slider</Slider>
    </View>
  );
}

function Live() {
  const [n, setN] = useState(0);
  return (
    <View className="flex-col gap-2">
      <Button onPress={() => setN(n + 1)}>Live</Button>
      <Text className="text-sm text-slate-900">{"Live pressed " + n}</Text>
    </View>
  );
}

export interface Mutant {
  gate: "G1" | "G2" | "G3" | "G4";
  defect: boolean;
  driver: Driver | null;
  render: () => ReactNode;
}

export const MUTANTS: Record<string, Mutant> = {
  "button-contrast": {
    gate: "G1", defect: true, driver: null,
    render: () => (
      <View className={ROOT}>
        <Focusable look={[T["button.base"], T["button.size.md"], "bg-white border-transparent"].join(" ")} onPress={() => {}}>
          <Text className={[T["button.label.sm"], "text-white"].join(" ")}>Save</Text>
        </Focusable>
      </View>
    ),
  },
  "button-contrast-control": {
    gate: "G1", defect: false, driver: null,
    render: () => <View className={ROOT}><Button>Save</Button></View>,
  },
  "zero-size-card": {
    gate: "G2", defect: true, driver: null,
    render: () => <View className={ROOT}><View className="flex-col" style={{ width: 0, height: 0 }}><CardTitle>Hidden card</CardTitle></View></View>,
  },
  "zero-size-card-control": {
    gate: "G2", defect: false, driver: null,
    render: () => <View className={ROOT}><Card><CardTitle>Hidden card</CardTitle></Card></View>,
  },
  "overflow-panel": {
    gate: "G2", defect: true, driver: null,
    render: () => (
      <View className={ROOT}>
        <View className="flex-col bg-white" style={{ width: 600, height: 60 }}><Text className="text-sm font-bold text-slate-900">Wide panel</Text></View>
      </View>
    ),
  },
  "overflow-panel-control": {
    gate: "G2", defect: false, driver: null,
    render: () => (
      <View className={ROOT}>
        <View className="flex-col bg-white" style={{ width: 200, height: 60 }}><Text className="text-sm font-bold text-slate-900">Wide panel</Text></View>
      </View>
    ),
  },
  "misaligned-tabs": {
    gate: "G3", defect: true, driver: null,
    render: () => (
      <View className={ROOT}>
        <View className="flex-row items-center gap-1 p-1 bg-slate-100">
          <View className="bg-slate-900" style={{ width: 60, height: 40 }} />
          <View className="bg-slate-900" style={{ width: 60, height: 40, marginTop: 10 }} />
        </View>
      </View>
    ),
  },
  "misaligned-tabs-control": {
    gate: "G3", defect: false, driver: null,
    render: () => (
      <View className={ROOT}>
        <View className="flex-row items-center gap-1 p-1 bg-slate-100">
          <View className="bg-slate-900" style={{ width: 60, height: 40 }} />
          <View className="bg-slate-900" style={{ width: 60, height: 40 }} />
        </View>
      </View>
    ),
  },
  "dead-button": {
    gate: "G4", defect: true, driver: { kind: "driven", trigger: "Dead", metrics: ["text"] },
    render: () => <View className={ROOT}><Button>Dead</Button></View>,
  },
  "dead-button-control": {
    gate: "G4", defect: false, driver: { kind: "driven", trigger: "Live", metrics: ["text"] },
    render: () => <View className={ROOT}><Live /></View>,
  },
  "badge-contrast": {
    gate: "G1", defect: true, driver: null,
    render: () => (
      <View className={ROOT}>
        <View className={[T["badge.base"], "bg-white border-transparent"].join(" ")}>
          <Text className={[T["badge.label"], "text-white"].join(" ")}>Failed</Text>
        </View>
      </View>
    ),
  },
  "badge-contrast-control": {
    gate: "G1", defect: false, driver: null,
    render: () => <View className={ROOT}><Badge variant="destructive">Failed</Badge></View>,
  },
  "zero-size-avatar": {
    gate: "G2", defect: true, driver: null,
    render: () => <View className={ROOT}><View className="flex-col" style={{ width: 0, height: 0 }}><Text className={T["avatar.text.md"]}>AK</Text></View></View>,
  },
  "zero-size-avatar-control": {
    gate: "G2", defect: false, driver: null,
    render: () => <View className={ROOT}><Avatar>AK</Avatar></View>,
  },
  "wide-progress": {
    gate: "G2", defect: true, driver: null,
    render: () => <View className={ROOT}><View className="h-2 rounded-[4px] bg-slate-200" style={{ width: 600 }} /></View>,
  },
  "wide-progress-control": {
    gate: "G2", defect: false, driver: null,
    render: () => <View className={ROOT}><Progress value={50} /></View>,
  },
  "misaligned-separator": {
    gate: "G3", defect: true, driver: null,
    render: () => (
      <View className={ROOT}>
        <View className="flex-row items-center h-8 gap-2">
          <Label>Home</Label>
          <View className="h-full w-[1px] bg-slate-200" style={{ marginTop: 10 }} />
          <Label>Docs</Label>
        </View>
      </View>
    ),
  },
  "misaligned-separator-control": {
    gate: "G3", defect: false, driver: null,
    render: () => (
      <View className={ROOT}>
        <View className="flex-row items-center h-8 gap-2">
          <Label>Home</Label>
          <Separator orientation="vertical" />
          <Label>Docs</Label>
        </View>
      </View>
    ),
  },
  "dead-progress": {
    gate: "G4", defect: true, driver: { kind: "driven", trigger: "Dead progress", metrics: ["text"] },
    render: () => (
      <View className={ROOT}>
        <View className="flex-col gap-2">
          <Progress value={30} />
          <Label>30%</Label>
          <Button>Dead progress</Button>
        </View>
      </View>
    ),
  },
  "dead-progress-control": {
    gate: "G4", defect: false, driver: { kind: "driven", trigger: "Live progress", metrics: ["text"] },
    render: () => <View className={ROOT}><LiveProgress /></View>,
  },
  "dead-theme": {
    gate: "G4", defect: true, driver: { kind: "driven", trigger: "Dead theme", metrics: ["text"] },
    render: () => <View className={ROOT}><Button>Dead theme</Button></View>,
  },
  "dead-theme-control": {
    gate: "G4", defect: false, driver: { kind: "driven", trigger: "Dark", metrics: ["text"] },
    render: () => <ThemePage />,
  },
  "dead-checkbox": {
    gate: "G4", defect: true, driver: { kind: "driven", trigger: "Dead checkbox", metrics: ["ink"] },
    render: () => <View className={ROOT}><Checkbox checked={false}>Dead checkbox</Checkbox></View>,
  },
  "dead-checkbox-control": {
    gate: "G4", defect: false, driver: { kind: "driven", trigger: "Live checkbox", metrics: ["ink"] },
    render: () => <View className={ROOT}><LiveCheckbox /></View>,
  },
  "checkbox-contrast": {
    gate: "G1", defect: true, driver: null,
    render: () => (
      <View className={ROOT}>
        <Focusable look={T["checkbox.row"]}>
          <View className={[T["checkbox.box"], T["checkbox.box.off"]].join(" ")} />
          <Text className="text-base text-slate-300">Faint checkbox</Text>
        </Focusable>
      </View>
    ),
  },
  "checkbox-contrast-control": {
    gate: "G1", defect: false, driver: null,
    render: () => <View className={ROOT}><Checkbox checked={false}>Faint checkbox</Checkbox></View>,
  },
  "dead-switch": {
    gate: "G4", defect: true, driver: { kind: "driven", trigger: "Dead switch", metrics: ["offset"] },
    render: () => <View className={ROOT}><Switch checked={false}>Dead switch</Switch></View>,
  },
  "dead-switch-control": {
    gate: "G4", defect: false, driver: { kind: "driven", trigger: "Live switch", metrics: ["offset"] },
    render: () => <View className={ROOT}><LiveSwitch /></View>,
  },
  "dead-radio": {
    gate: "G4", defect: true, driver: { kind: "driven", trigger: "Dead radio", metrics: ["text"], keys: [BTN.RIGHT] },
    render: () => (
      <View className={ROOT}>
        <RadioGroup value="monthly">
          <RadioItem value="monthly">Dead radio</RadioItem>
          <RadioItem value="yearly">Yearly</RadioItem>
        </RadioGroup>
        <Label>Plan monthly</Label>
      </View>
    ),
  },
  "dead-radio-control": {
    gate: "G4", defect: false, driver: { kind: "driven", trigger: "Live radio", metrics: ["text"], keys: [BTN.RIGHT] },
    render: () => <View className={ROOT}><LiveRadio /></View>,
  },
  "dead-select": {
    gate: "G4", defect: true, driver: { kind: "driven", trigger: "Dead select", metrics: ["text"] },
    render: () => (
      <View className={ROOT}>
        <Focusable look={[T["select.trigger"], T["select.focus"]].join(" ")}>
          <Text className={T["select.value"]}>Dead select</Text>
        </Focusable>
      </View>
    ),
  },
  "dead-select-control": {
    gate: "G4", defect: false, driver: { kind: "driven", trigger: "Live select", metrics: ["text"] },
    render: () => <View className={ROOT}><LiveSelect /></View>,
  },
  "dead-slider": {
    gate: "G4", defect: true, driver: { kind: "driven", trigger: "Dead slider", metrics: ["offset"], keys: [BTN.RIGHT] },
    render: () => <View className={ROOT}><Slider value={30}>Dead slider</Slider></View>,
  },
  "dead-slider-control": {
    gate: "G4", defect: false, driver: { kind: "driven", trigger: "Live slider", metrics: ["offset"], keys: [BTN.RIGHT] },
    render: () => <View className={ROOT}><LiveSlider /></View>,
  },
};
