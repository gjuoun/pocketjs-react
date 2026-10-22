// The reader app: library -> contents -> reading view, with a START menu and settings. Gamepad
// first; the mouse presses the same focusable things. Settings and reading positions are saved
// where the host has a writable fs, and the app reopens the last book where it was left. A book
// the host delivers at launch (the macOS app's file chooser) opens straight to its contents.
import { useEffect, useLayoutEffect, useMemo, useState } from "react";
import { BTN, bundledBooks, fileBooks, loadState, Menu, saveState, useButton, useHostBook, type BookEntry, type FontSize } from "pocketjs-react";
import { Library } from "./Library.tsx";
import { Toc } from "./Toc.tsx";
import { ReadingView, type Position } from "./ReadingView.tsx";
import { Settings } from "./Settings.tsx";
import { DARK, LIGHT } from "./theme.ts";

type Screen = { kind: "library" } | { kind: "toc"; book: BookEntry } | { kind: "read"; book: BookEntry };

export function App() {
  const host = useHostBook();
  const builtIn = useMemo(() => bundledBooks(), []);
  const bundled = host.status === "opened" ? [host.book, ...builtIn] : builtIn;
  const files = useMemo(() => fileBooks(), []);
  const saved = useMemo(() => loadState(), []);
  const all = [...bundled, ...files.books];
  const resume = saved.last ? all.find((b) => b.id === saved.last) : undefined;
  const [screen, setScreen] = useState<Screen>(resume && saved.positions[resume.id] ? { kind: "read", book: resume } : { kind: "library" });
  const [positions, setPositions] = useState<Record<string, Position>>(saved.positions);
  const [size, setSize] = useState<FontSize>(saved.size);
  const [dark, setDark] = useState(saved.dark);
  const [menu, setMenu] = useState(false);
  const [settings, setSettings] = useState(false);
  const theme = dark ? DARK : LIGHT;
  useButton(BTN.START, () => setMenu(true), { enabled: !menu && !settings });
  // A layout effect: it runs in the commit that shows the new book, not on a later scheduler turn.
  useLayoutEffect(() => {
    if (host.status === "opened") setScreen({ kind: "toc", book: host.book });
  }, [host]);

  const current = screen.kind !== "library" ? screen.book : null;
  const position: Position = (current && positions[current.id]) || { chapter: 0, block: 0, offset: 0 };
  const move = (next: Position) => current && setPositions((p) => ({ ...p, [current.id]: next }));

  useEffect(() => {
    saveState({ size, dark, positions, last: screen.kind === "read" ? screen.book.id : undefined });
  }, [size, dark, positions, screen]);

  const items = [
    ...(current ? [{ label: "Contents", onSelect: () => setScreen({ kind: "toc", book: current }) }] : []),
    { label: "Settings", onSelect: () => setSettings(true) },
    { label: "Library", onSelect: () => setScreen({ kind: "library" }) },
  ];

  return (
    <>
      {screen.kind === "library" ? (
        <Library bundled={bundled} files={files} theme={theme} dark={dark} error={host.status === "failed" ? "Could not open the book from disk." : undefined} onOpen={(book) => setScreen({ kind: "toc", book })} />
      ) : screen.kind === "toc" ? (
        <Toc
          book={screen.book.open()}
          current={position.chapter}
          theme={theme}
          onRead={(chapter) => {
            move({ chapter, block: 0, offset: 0 });
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
          onMove={move}
          onBack={() => setScreen({ kind: "toc", book: screen.book })}
          active={!menu && !settings}
        />
      )}
      <Menu open={menu} onClose={() => setMenu(false)} title="Menu" items={items} />
      <Settings open={settings} onClose={() => setSettings(false)} size={size} dark={dark} onSize={setSize} onDark={setDark} />
    </>
  );
}
