// Fixture: three focusable rows styled with static class literals, including a focus: variant.
import { mount, Text, View } from "pocketjs-react";

function App() {
  return (
    <View className="w-full h-full flex-col gap-1 p-4 bg-slate-900">
      {["One", "Two", "Three"].map((label) => (
        <View key={label} className="flex-row px-3 py-1 rounded-lg bg-slate-800 focus:bg-blue-600" focusable>
          <Text className="text-sm text-white">{label}</Text>
        </View>
      ))}
    </View>
  );
}

mount(<App />);
