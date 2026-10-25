// Build-only entry: every class literal the C5 primitives and their tests use reaches the build's
// token table, so in-process tests compile the same vocabulary a built app gets.
import { View } from "../../../src/index.ts";
export * as Dialog from "../../../src/primitives/dialog.tsx";
export * as DropdownMenu from "../../../src/primitives/dropdown-menu.tsx";
export * as Select from "../../../src/primitives/select.tsx";
export { ModalLayer } from "../../../src/primitives/modal-layer.tsx";

export function Samples() {
  return (
    <View className="w-full h-full flex-col gap-1 p-2 bg-slate-100">
      <View className="bg-slate-900 px-2 py-1 rounded-md" />
      <View className="px-2 py-1 bg-slate-800 focus:bg-blue-600" />
    </View>
  );
}
