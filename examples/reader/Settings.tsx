// Settings: font size (S/M/L) and light/dark, as a menu whose items change in place.
import { type FontSize, Menu } from "pocketjs-react";

const NEXT_SIZE: Record<FontSize, FontSize> = { S: "M", M: "L", L: "S" };

export function Settings(props: {
  open: boolean;
  onClose: () => void;
  size: FontSize;
  dark: boolean;
  onSize: (size: FontSize) => void;
  onDark: (dark: boolean) => void;
}) {
  return (
    <Menu
      open={props.open}
      onClose={props.onClose}
      title="Settings"
      items={[
        {
          label: "Font size: " + props.size,
          onSelect: () => props.onSize(NEXT_SIZE[props.size]),
          keepOpen: true,
        },
        {
          label: "Theme: " + (props.dark ? "dark" : "light"),
          onSelect: () => props.onDark(!props.dark),
          keepOpen: true,
        },
      ]}
    />
  );
}
