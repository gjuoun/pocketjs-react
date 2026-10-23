// <Menu>: a Dialog holding a List of actions. Focus is trapped while it is open, CROSS closes
// it, and selecting an item runs it (the menu closes unless the item keeps it open).

import { Text } from "../elements.ts";
import { Dialog } from "./Dialog.tsx";
import { List } from "./List.tsx";

export interface MenuItem {
  label: string;
  onSelect: () => void;
  /** Keep the menu open after selecting (for toggles). */
  keepOpen?: boolean;
}

export interface MenuProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  items: MenuItem[];
}

export function Menu(props: MenuProps) {
  return (
    <Dialog
      open={props.open}
      onClose={props.onClose}
      title={props.title}
      panelClassName="w-[260px]"
    >
      <List
        items={props.items}
        keyOf={(item) => item.label}
        onSelect={(item) => {
          item.onSelect();
          if (!item.keepOpen) props.onClose();
        }}
        renderItem={(item) => (
          <Text className="text-sm text-white">{item.label}</Text>
        )}
      />
    </Dialog>
  );
}
