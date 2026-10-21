// The reader app: library -> contents -> reading view, with a START menu. Gamepad first; the
// mouse presses the same focusable things.
import { useMemo, useState } from "react";
import { BTN, bundledBooks, fileBooks, Menu, useButton, type BookEntry, type FontSize } from "pocketjs-react";
import { Library } from "./Library.tsx";
import { Toc } from "./Toc.tsx";
import { ReadingView, type Position } from "./ReadingView.tsx";
import { DARK, LIGHT } from "./theme.ts";

type Screen = { kind: "library" } | { kind: "toc"; book: BookEntry } | { kind: "read"; book: BookEntry };

export function App() {
  const bundled = useMemo(() => bundledBooks(), []);
  const files = useMemo(() => fileBooks(), []);
  const [screen, setScreen] = useState<Screen>({ kind: "library" });
  const [position, setPosition] = useState<Position>({ chapter: 0, line: 0 });
  const [size] = useState<FontSize>("S");
  const [dark] = useState(false);
  const [menu, setMenu] = useState(false);
  const theme = dark ? DARK : LIGHT;
  useButton(BTN.START, () => setMenu(true));

  const open = (book: BookEntry) => {
    setPosition({ chapter: 0, line: 0 });
    setScreen({ kind: "toc", book });
  };
  const current = screen.kind !== "library" ? screen.book : null;
  const items = [
    ...(current ? [{ label: "Contents", onSelect: () => setScreen({ kind: "toc", book: current }) }] : []),
    { label: "Library", onSelect: () => setScreen({ kind: "library" }) },
  ];

  return (
    <>
      {screen.kind === "library" ? (
        <Library bundled={bundled} files={files} theme={theme} dark={dark} onOpen={open} />
      ) : screen.kind === "toc" ? (
        <Toc
          book={screen.book.open()}
          current={position.chapter}
          theme={theme}
          onRead={(chapter) => {
            setPosition({ chapter, line: 0 });
            setScreen({ kind: "read", book: screen.book });
          }}
          onBack={() => setScreen({ kind: "library" })}
        />
      ) : (
        <ReadingView
          book={screen.book.open()}
          position={position}
          size={size}
          dark={dark}
          theme={theme}
          onMove={setPosition}
          onBack={() => setScreen({ kind: "toc", book: screen.book })}
        />
      )}
      <Menu open={menu} onClose={() => setMenu(false)} title="Menu" items={items} />
    </>
  );
}
