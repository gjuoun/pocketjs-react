// C5 consumer app: the vendored shadcn dialog (codemod output, no edits) in a small screen.
// Like app.tsx, this module does not mount: overlays-main.tsx is the built entry.
import { Button } from "./ui/button.tsx";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog.tsx";

export function Overlays() {
  return (
    <div className="w-full h-full flex-col gap-1 p-2 bg-slate-100">
      <Button>Under</Button>
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
