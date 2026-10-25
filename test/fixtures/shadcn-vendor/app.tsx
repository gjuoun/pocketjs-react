// The C3 consumer demo: the components a shadcn user actually writes, imported from the
// codemod output (never from upstream/). Nothing here is a shadcn source file - this is the app.
//
import { Badge } from "./ui/badge.tsx";
import { Button } from "./ui/button.tsx";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card.tsx";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog.tsx";
import { Input } from "./ui/input.tsx";

export function Demo() {
  return (
    <div className="w-full h-full flex-col gap-1 p-2 bg-slate-100">
      <div className="flex-row items-center gap-2">
        <Button>Save</Button>
        <Button variant="destructive">Delete</Button>
        <Badge variant="secondary">Beta</Badge>
      </div>
      <Input placeholder="Name" />
      <Card>
        <CardHeader>
          <CardTitle>Vendored card</CardTitle>
          <CardDescription>codemod output</CardDescription>
        </CardHeader>
        <CardContent>
          <span>Card body</span>
        </CardContent>
      </Card>
      <Dialog>
        <DialogTrigger asChild>
          <Button>Open</Button>
        </DialogTrigger>
        <DialogContent>
          <DialogTitle>Dialog title</DialogTitle>
          <DialogDescription>Dialog body</DialogDescription>
        </DialogContent>
      </Dialog>
    </div>
  );
}
