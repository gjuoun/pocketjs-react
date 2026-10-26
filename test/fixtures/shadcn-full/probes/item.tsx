// Minimal usage of item as a shadcn consumer writes it (inventory probe, not product code).
import {
  ItemGroup,
  Item,
  ItemMedia,
  ItemContent,
  ItemTitle,
  ItemDescription,
  ItemActions,
  ItemSeparator,
} from "../ui/item.tsx";

export default function Probe() {
  return (
    <div className="w-full h-full flex-col gap-2 p-2 bg-slate-100">
      <ItemGroup>
        <Item>
          <ItemMedia>M</ItemMedia>
          <ItemContent>
            <ItemTitle>Title</ItemTitle>
            <ItemDescription>Desc</ItemDescription>
          </ItemContent>
          <ItemActions>Act</ItemActions>
        </Item>
        <ItemSeparator />
      </ItemGroup>
    </div>
  );
}
