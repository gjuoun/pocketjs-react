// Minimal usage of combobox as a shadcn consumer writes it (inventory probe, not product code).
import {
  Combobox,
  ComboboxInput,
  ComboboxContent,
  ComboboxList,
  ComboboxItem,
} from "../ui/combobox.tsx";

export default function Probe() {
  return (
    <div className="w-full h-full flex-col gap-2 p-2 bg-slate-100">
      <Combobox items={["a", "b"]}>
        <ComboboxInput placeholder="Pick" />
        <ComboboxContent>
          <ComboboxList>
            <ComboboxItem value="a">A</ComboboxItem>
          </ComboboxList>
        </ComboboxContent>
      </Combobox>
    </div>
  );
}
