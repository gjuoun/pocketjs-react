// Fixture: "text-sm" and "font-bold" never appear in one literal. The build still bakes the
// 14 px bold atlas, because a runtime class combination may join them.
import { mount, Text, View } from "pocketjs-react";

export const EMPHASIS = "font-bold";

mount(
  <View className="w-full h-full flex-col p-4 bg-slate-900">
    <Text className="text-sm text-white">Bold Plain</Text>
  </View>,
);
