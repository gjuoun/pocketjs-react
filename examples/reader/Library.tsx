// Library: bundled books and books from the file system, as two tabs (L/R switch them), each a
// grid of book cards, one per row at 480 px since titles do not wrap (the d-pad moves through it,
// CIRCLE opens a book).
import { useLayoutEffect, useRef } from "react";
import { focusNode } from "@pocketjs/framework/input";
import { Grid, Tabs, Text, View, type BookEntry, type FileBooks } from "pocketjs-react";
import type { Theme } from "./theme.ts";

function Card(props: { book: BookEntry; theme: Theme; onOpen: (book: BookEntry) => void; autoFocus?: boolean }) {
  const ref = useRef(null);
  useLayoutEffect(() => {
    if (props.autoFocus && ref.current) focusNode(ref.current);
  }, []);
  return (
    <View ref={ref} className={props.theme.card} focusable onPress={() => props.onOpen(props.book)}>
      <Text className={props.theme.title}>{props.book.title}</Text>
      <Text className={props.theme.muted}>{props.book.author || (props.book.origin === "file" ? "From files" : "Bundled")}</Text>
    </View>
  );
}

export function Library(props: { bundled: BookEntry[]; files: FileBooks; theme: Theme; dark: boolean; onOpen: (book: BookEntry) => void }) {
  const { theme } = props;
  const filesPanel = !props.files.available ? (
    <Text className={theme.muted}>This host has no file system. Bundled books only.</Text>
  ) : props.files.books.length === 0 ? (
    <Text className={theme.muted}>No books yet. Add EPUB files with the page's file picker.</Text>
  ) : (
    <Grid columns={1} className="gap-2">
      {props.files.books.map((book) => <Card key={book.id} book={book} theme={theme} onOpen={props.onOpen} />)}
    </Grid>
  );
  return (
    <View className={theme.screen}>
      <Text className={theme.title}>Library</Text>
      <Tabs
        dark={props.dark}
        tabs={[
          {
            title: "Bundled",
            content: (
              <Grid columns={1} className="gap-2">
                {props.bundled.map((book, i) => <Card key={book.id} book={book} theme={theme} onOpen={props.onOpen} autoFocus={i === 0} />)}
              </Grid>
            ),
          },
          { title: "Files", content: filesPanel },
        ]}
      />
      <Text className={theme.muted}>CIRCLE open  ·  L/R tabs  ·  START menu</Text>
    </View>
  );
}
