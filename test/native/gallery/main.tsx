// The native gallery entry: five pages, paged with the shoulder triggers (LTRIGGER back, RTRIGGER forward).
// The shoulder triggers keep the d-pad free for focus. Built by tools/build.ts (--name=native-gallery).
import { useState } from "react";
import { BTN, mount, View } from "../../../src/index.ts";
import { useButton } from "../../../src/input/buttons.ts";
import { ButtonPage, CardPage, DialogPage, FieldPage, PageFrame, TabsPage } from "./pages.tsx";

export const PAGE_COUNT = 5;

function Gallery() {
  const [page, setPage] = useState(0);
  const [presses, setPresses] = useState(0);
  const [name, setName] = useState("");
  const [notes, setNotes] = useState("");
  useButton(BTN.RTRIGGER, () => setPage((p) => Math.min(PAGE_COUNT - 1, p + 1)));
  useButton(BTN.LTRIGGER, () => setPage((p) => Math.max(0, p - 1)));
  return (
    <View className="w-full h-full flex-col overflow-hidden bg-slate-100">
      <PageFrame index={1} name="Button" active={page === 0}><ButtonPage presses={presses} onPress={() => setPresses((n) => n + 1)} /></PageFrame>
      <PageFrame index={2} name="Input" active={page === 1}><FieldPage name={name} notes={notes} onName={setName} onNotes={setNotes} /></PageFrame>
      <PageFrame index={3} name="Card" active={page === 2}><CardPage /></PageFrame>
      <PageFrame index={4} name="Dialog" active={page === 3}><DialogPage /></PageFrame>
      <PageFrame index={5} name="Tabs" active={page === 4}><TabsPage /></PageFrame>
    </View>
  );
}

mount(<Gallery />, { compat: { classMiss: "throw", tokenMap: false } });
