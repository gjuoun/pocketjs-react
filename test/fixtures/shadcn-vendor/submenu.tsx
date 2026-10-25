// C9 consumer app: the vendored shadcn dropdown menu with a sub-menu (codemod output, no edits) in a
// small screen. Like overlays.tsx, this module does not mount: submenu-main.tsx is the built entry.

import { Text } from "pocketjs-react";
import { useState } from "react";
import { Button } from "./ui/button.tsx";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu.tsx";

export function Submenu() {
  const [copies, setCopies] = useState(0);
  return (
    <div className="w-full h-full flex-col items-start gap-1 p-2 bg-slate-100">
      <Text className="text-sm w-full">{`Copies ${copies}`}</Text>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button>Menu</Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem>Edit</DropdownMenuItem>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>More</DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <DropdownMenuItem onSelect={() => setCopies((n) => n + 1)}>
                Copy
              </DropdownMenuItem>
              <DropdownMenuItem>Paste</DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        </DropdownMenuContent>
      </DropdownMenu>
      <Button>Below</Button>
    </div>
  );
}
