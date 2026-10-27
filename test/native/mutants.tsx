// Defect mutants for the native judge: each defect is one body that must fail its gate; each -control is the same
// body done right, which must pass. Built one entry per name by tools/native/judge.ts --mutants.
// Sizes that are not in the vocabulary go through the style prop (the build scan does not collect arbitrary lengths here).
import { useState, type ReactNode } from "react";
import { Text, View } from "../../src/index.ts";
import { Button } from "../../src/native/button.tsx";
import { Focusable } from "../../src/native/focusable.tsx";
import { Card, CardTitle } from "../../src/native/card.tsx";
import { TOKENS } from "../../src/native/tokens.ts";
import type { Driver } from "../qa/acceptance/drivers.ts";

const T = TOKENS as Record<string, string>;
const ROOT = "w-full h-full flex-col bg-white p-2 gap-2";

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
};
