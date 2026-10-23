// The C3 consumer demo: the components a shadcn user actually writes, imported from the
// codemod output (never from upstream/). Nothing here is a shadcn source file - this is the app.
//
// Contrast note: the core has no text-color inheritance yet (the C2 known gap), so a `text-*`
// on a view does not color its text children - they keep the core's default white. The Card and
// the dialog trigger therefore carry a dark surface of their own; shadcn's default white card
// would render white-on-white until the text layer inherits color.
import { Badge } from "./ui/badge.tsx";
import { Button } from "./ui/button.tsx";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card.tsx";
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "./ui/dialog.tsx";
import { Input } from "./ui/input.tsx";

export function Demo() {
  return (
    <div className="w-full h-full flex-col gap-1 p-2 bg-slate-100">
      <div className="flex-row gap-2">
        <Button>Save</Button>
        <Button variant="destructive">Delete</Button>
        <Badge variant="secondary">Beta</Badge>
      </div>
      <Input placeholder="Name" />
      <Card className="bg-slate-900">
        <CardHeader>
          <CardTitle>Vendored card</CardTitle>
          <CardDescription>codemod output</CardDescription>
        </CardHeader>
        <CardContent>
          <span>Card body</span>
        </CardContent>
      </Card>
      <Dialog>
        <DialogTrigger className="bg-slate-900 px-2 py-1 rounded-md">Open</DialogTrigger>
        <DialogContent>
          <DialogTitle>Dialog title</DialogTitle>
          <DialogDescription>Dialog body</DialogDescription>
        </DialogContent>
      </Dialog>
    </div>
  );
}
