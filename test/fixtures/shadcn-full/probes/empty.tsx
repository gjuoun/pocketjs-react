// Minimal usage of empty as a shadcn consumer writes it (inventory probe, not product code).
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
} from "../ui/empty.tsx";

export default function Probe() {
  return (
    <div className="w-full h-full flex-col gap-2 p-2 bg-slate-100">
      <Empty>
        <EmptyHeader>
          <EmptyMedia>Icon</EmptyMedia>
          <EmptyTitle>No items</EmptyTitle>
          <EmptyDescription>Add one</EmptyDescription>
        </EmptyHeader>
        <EmptyContent>Action</EmptyContent>
      </Empty>
    </div>
  );
}
