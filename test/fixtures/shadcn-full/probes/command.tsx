// Minimal usage of command as a shadcn consumer writes it (inventory probe, not product code).
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandShortcut,
  CommandSeparator,
} from "../ui/command.tsx";

export default function Probe() {
  return (
    <div className="w-full h-full flex-col gap-2 p-2 bg-slate-100">
      <Command>
        <CommandInput placeholder="Search" />
        <CommandList>
          <CommandEmpty>None</CommandEmpty>
          <CommandGroup heading="Suggestions">
            <CommandItem>
              Calendar<CommandShortcut>⌘K</CommandShortcut>
            </CommandItem>
            <CommandSeparator />
          </CommandGroup>
        </CommandList>
      </Command>
    </div>
  );
}
