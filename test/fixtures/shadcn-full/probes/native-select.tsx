// Minimal usage of native-select as a shadcn consumer writes it (inventory probe, not product code).
import {
  NativeSelect,
  NativeSelectOptGroup,
  NativeSelectOption,
} from "../ui/native-select.tsx";

export default function Probe() {
  return (
    <div className="w-full h-full flex-col gap-2 p-2 bg-slate-100">
      <NativeSelect defaultValue="a">
        <NativeSelectOptGroup label="Fruit">
          <NativeSelectOption value="a">Apple</NativeSelectOption>
        </NativeSelectOptGroup>
      </NativeSelect>
    </div>
  );
}
