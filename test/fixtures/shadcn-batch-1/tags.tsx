// Batch 1 tags: the vendored kbd, table and native-select (codemod output, no edits) in one screen. The
// assertions read the pixels of each: a key cap's border and padding, a table's rules, a caption, a select's arrow.
import { Kbd } from "../shadcn-full/ui/kbd.tsx";
import { NativeSelect, NativeSelectOption } from "../shadcn-full/ui/native-select.tsx";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../shadcn-full/ui/table.tsx";

export function TagsScreen() {
  return (
    <div className="w-full h-full flex-col items-start gap-2 p-2 bg-slate-100">
      <Kbd>K</Kbd>
      <Table>
        <TableCaption>Recent</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell>Apple</TableCell>
          </TableRow>
        </TableBody>
      </Table>
      <div className="w-[160px]">
        <NativeSelect defaultValue="b">
          <NativeSelectOption value="a">Alpha</NativeSelectOption>
          <NativeSelectOption value="b">Beta</NativeSelectOption>
        </NativeSelect>
      </div>
    </div>
  );
}
