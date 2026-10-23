// Fixture: CSS-named inline styles next to static reference swatches.

import { mount, Text, View } from "pocketjs-react";
import { useState } from "react";

function Line(props: { label: string; children: React.ReactNode }) {
  return (
    <View className="flex-row items-center gap-2 h-[14px]">
      {props.children}
      <Text className="text-xs text-white">{props.label}</Text>
    </View>
  );
}

function App() {
  const [wide, setWide] = useState(true);
  return (
    <View className="w-full h-full flex-col gap-1 p-2 bg-slate-900">
      <Line label="yellow">
        <View className="w-[30px] h-[10px] bg-yellow-500" />
      </Line>
      <Line label="styled">
        <View
          className="h-[10px]"
          style={{ width: 40, backgroundColor: "rgb(234, 179, 8)" }}
        />
      </Line>
      <Line label="dimclass">
        <View className="w-[30px] h-[10px] bg-blue-600 opacity-50" />
      </Line>
      <Line label="dimstyle">
        <View
          className="w-[30px] h-[10px] bg-blue-600"
          style={{ opacity: 0.5 }}
        />
      </Line>
      <Line label="removable">
        <View
          className="w-[120px] h-[10px] bg-emerald-700"
          style={wide ? { width: 60 } : {}}
        />
      </Line>
      <View
        className="flex-row px-3 py-1 rounded bg-slate-800 focus:bg-blue-600"
        focusable
        onPress={() => setWide(false)}
      >
        <Text className="text-xs text-white">Toggle</Text>
      </View>
    </View>
  );
}

mount(<App />);
