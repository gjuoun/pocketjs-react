// Gate 2 cases: an off-screen node (2a), a zero-width node with text (2c), a child wider than its clipping
// parent (2b), a child of a scroll container (exempt), and an in-bounds control. Named with debugName so the
// findings read by name.
import { Text, View } from "pocketjs-react";

export default function OverflowCases() {
  return (
    <View className="w-full h-full bg-white" style={{ position: "relative" }}>
      <View debugName="offscreen" className="bg-slate-900" style={{ position: "absolute", left: -40, top: 10, width: 200, height: 30 }} />
      <View debugName="zero" style={{ position: "absolute", left: 300, top: 10, width: 0, height: 40 }}>
        <Text className="text-sm text-slate-900">ZZ</Text>
      </View>
      <View debugName="clip" className="overflow-hidden" style={{ position: "absolute", left: 10, top: 100, width: 100, height: 40 }}>
        <View debugName="clip-child" className="bg-red-600" style={{ position: "absolute", left: 0, top: 0, width: 200, height: 20 }} />
      </View>
      <View debugName="scroll" className="overflow-y-auto" style={{ position: "absolute", left: 150, top: 100, width: 100, height: 40 }}>
        <View debugName="scroll-child" className="bg-red-600" style={{ width: 200, height: 20 }} />
      </View>
      <View debugName="track" className="overflow-hidden" style={{ position: "absolute", left: 10, top: 150, width: 100, height: 40 }}>
        <View debugName="track-slide-off" className="bg-slate-300" style={{ position: "absolute", left: 120, top: 0, width: 100, height: 20 }} />
      </View>
      <View debugName="control" className="bg-green-600" style={{ position: "absolute", left: 300, top: 200, width: 60, height: 30 }} />
    </View>
  );
}
