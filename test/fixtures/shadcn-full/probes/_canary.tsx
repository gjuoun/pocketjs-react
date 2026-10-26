// Canary: the seven vendored components of the C1-C5 fixtures, mounted by the same harness.
import { Badge } from "../../shadcn-vendor/ui/badge.tsx";
import { Button } from "../../shadcn-vendor/ui/button.tsx";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../shadcn-vendor/ui/card.tsx";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "../../shadcn-vendor/ui/dialog.tsx";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../../shadcn-vendor/ui/dropdown-menu.tsx";
import { Input } from "../../shadcn-vendor/ui/input.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../shadcn-vendor/ui/select.tsx";

export default function Probe() {
  return (
    <div className="w-full h-full flex-col gap-2 p-2 bg-slate-100">
      <Button>Save</Button>
      <Button variant="destructive">Delete</Button>
      <Badge variant="secondary">Beta</Badge>
      <Input placeholder="Name" />
      <Card>
        <CardHeader>
          <CardTitle>Vendored card</CardTitle>
          <CardDescription>codemod output</CardDescription>
        </CardHeader>
        <CardContent>Card body</CardContent>
      </Card>
      <Dialog>
        <DialogTrigger>Open</DialogTrigger>
        <DialogContent>
          <DialogTitle>Dialog title</DialogTitle>
          <DialogDescription>Dialog body</DialogDescription>
        </DialogContent>
      </Dialog>
      <DropdownMenu open>
        <DropdownMenuTrigger>Menu</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem>Item</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <Select open defaultValue="a">
        <SelectTrigger>
          <SelectValue placeholder="Pick" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="a">Apple</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
