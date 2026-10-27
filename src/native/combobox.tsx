// Combobox: a Popover whose panel is a Command. The trigger shows the selected item's label, or the placeholder while nothing
// is chosen. A press opens the panel and its Command takes focus (the search input first). CIRCLE on an item, or DOWN from the
// input and CIRCLE, reports onValueChange(value) and closes the panel; focus returns to the trigger. CROSS and a tap outside
// close it with no change. It adds no primitive: it composes Popover (its wide panel holds the Command's 240 px list) and Command.
import { useControllableState } from "../primitives/state.ts";
import { Command, type CommandGroup } from "./command.tsx";
import { Popover, PopoverContent, PopoverTrigger } from "./popover.tsx";

/** The label of the item with this value, or undefined when no item has it. */
export function comboboxLabel(groups: CommandGroup[], value: string): string | undefined {
  return groups.flatMap((g) => g.items).find((i) => i.value === value)?.label;
}

export interface ComboboxProps {
  groups: CommandGroup[];
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** The trigger's text while nothing is chosen (default "Select...").  */
  placeholder?: string;
}

export function Combobox(props: ComboboxProps) {
  const [value, setValue] = useControllableState(props.value, props.defaultValue ?? "", props.onValueChange);
  const [open, setOpen] = useControllableState(props.open, props.defaultOpen ?? false, props.onOpenChange);
  const label = comboboxLabel(props.groups, value) ?? props.placeholder ?? "Select...";
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger>{label}</PopoverTrigger>
      <PopoverContent wide>
        <Command
          groups={props.groups}
          placeholder="Search"
          onSelect={(v) => {
            setValue(v);
            setOpen(false);
          }}
        />
      </PopoverContent>
    </Popover>
  );
}
