// C5 consumer app: the vendored shadcn dialog and dropdown menu (codemod output, no edits) in a
// small screen. Like app.tsx, this module does not mount: overlays-main.tsx is the built entry.

import { Text } from "pocketjs-react";
import { useState } from "react";
import { Button } from "./ui/button.tsx";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog.tsx";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select.tsx";

export function Overlays() {
  const [deletes, setDeletes] = useState(0);
  const [fruit, setFruit] = useState("");
  const [changes, setChanges] = useState(0);
  return (
    <div className="w-full h-full flex-col gap-1 p-2 bg-slate-100">
      <Button>Under</Button>
      <Dialog>
        <DialogTrigger className="bg-slate-900 px-2 py-1 rounded-md">
          Open
        </DialogTrigger>
        <DialogContent>
          <DialogTitle>Dialog title</DialogTitle>
          <DialogDescription>Dialog body</DialogDescription>
        </DialogContent>
      </Dialog>
      <DropdownMenu>
        <DropdownMenuTrigger className="bg-slate-900 px-2 py-1 rounded-md">
          Menu
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem>Edit</DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setDeletes((n) => n + 1)}>
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <Text className="text-sm text-white">{`Deletes ${deletes}`}</Text>
      <Select
        value={fruit}
        onValueChange={(next) => {
          setFruit(next);
          setChanges((n) => n + 1);
        }}
      >
        <SelectTrigger>
          <SelectValue placeholder="Pick fruit" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="apple">Apple</SelectItem>
          <SelectItem value="banana">Banana</SelectItem>
        </SelectContent>
      </Select>
      <Text className="text-sm text-white">{`Fruit changes ${changes}`}</Text>
    </div>
  );
}
