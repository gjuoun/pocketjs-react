// Gate 3 cases: a centred row (items-center), a top-aligned row (items-start, not a centred row), and a centred
// row whose second child is nudged 3 px with a relative offset (the defect: centre lines 3 px apart).
import { View } from "pocketjs-react";

export default function AlignmentCases() {
  return (
    <View className="w-full h-full flex-col bg-white">
      <View debugName="row-centred" className="flex-row items-center" style={{ height: 40, width: 300 }}>
        <View debugName="field" className="bg-slate-200" style={{ width: 120, height: 36 }} />
        <View debugName="addon" className="bg-slate-500" style={{ width: 20, height: 20 }} />
      </View>
      <View debugName="row-start" className="flex-row items-start" style={{ height: 40, width: 300 }}>
        <View debugName="field-s" className="bg-slate-200" style={{ width: 120, height: 36 }} />
        <View debugName="addon-s" className="bg-slate-500" style={{ width: 20, height: 20 }} />
      </View>
      <View debugName="row-off" className="flex-row items-center" style={{ height: 40, width: 300 }}>
        <View debugName="field-off" className="bg-slate-200" style={{ width: 120, height: 36 }} />
        <View debugName="addon-off" className="bg-slate-500" style={{ width: 20, height: 20, position: "relative", top: 3 }} />
      </View>
    </View>
  );
}
