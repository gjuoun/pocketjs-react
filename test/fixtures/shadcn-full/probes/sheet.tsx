// Minimal usage of sheet as a shadcn consumer writes it (inventory probe, not product code).
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
  SheetClose,
} from "../ui/sheet.tsx";

export default function Probe() {
  return (
    <div className="w-full h-full flex-col gap-2 p-2 bg-slate-100">
      <Sheet defaultOpen>
        <SheetTrigger>Open</SheetTrigger>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Edit</SheetTitle>
            <SheetDescription>Make changes</SheetDescription>
          </SheetHeader>
          <SheetFooter>
            <SheetClose>Done</SheetClose>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}
