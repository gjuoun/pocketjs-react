// The native gallery entry: one page per component, paged with the shoulder triggers (LTRIGGER back, RTRIGGER forward).
// The shoulder triggers keep the d-pad free for focus. Built by tools/build.ts (--name=native-gallery).
import { useState, type ReactNode } from "react";
import { BTN, mount, View } from "../../../src/index.ts";
import { useButton } from "../../../src/input/buttons.ts";
import { PAGE_NAMES, type PageName } from "./names.ts";
import { ButtonPage, CardPage, DialogPage, FieldPage, BadgePage, LabelPage, AvatarPage, PageFrame, ProgressPage, SeparatorPage, SkeletonPage, SpinnerPage, TabsPage, ThemePage } from "./pages.tsx";

export const PAGE_COUNT = PAGE_NAMES.length;

const BODY: Record<PageName, () => ReactNode> = {
  Button: () => <ButtonPageState />,
  Input: () => <FieldPageState />,
  Card: () => <CardPage />,
  Dialog: () => <DialogPage />,
  Tabs: () => <TabsPage />,
  Label: () => <LabelPage />,
  Badge: () => <BadgePage />,
  Separator: () => <SeparatorPage />,
  Avatar: () => <AvatarPage />,
  Progress: () => <ProgressPage />,
  Skeleton: () => <SkeletonPage />,
  Spinner: () => <SpinnerPage />,
  Theme: () => <ThemePage />,
};

function ButtonPageState() {
  const [presses, setPresses] = useState(0);
  return <ButtonPage presses={presses} onPress={() => setPresses((n) => n + 1)} />;
}

function FieldPageState() {
  const [name, setName] = useState("");
  const [notes, setNotes] = useState("");
  return <FieldPage name={name} notes={notes} onName={setName} onNotes={setNotes} />;
}

function Gallery() {
  const [page, setPage] = useState(0);
  useButton(BTN.RTRIGGER, () => setPage((p) => Math.min(PAGE_COUNT - 1, p + 1)));
  useButton(BTN.LTRIGGER, () => setPage((p) => Math.max(0, p - 1)));
  return (
    <View className="w-full h-full flex-col overflow-hidden bg-slate-100">
      {PAGE_NAMES.map((name, i) => (
        <PageFrame key={name} index={i + 1} total={PAGE_COUNT} name={name} active={page === i} flush={name === "Theme"}>
          {BODY[name]()}
        </PageFrame>
      ))}
    </View>
  );
}

mount(<Gallery />, { compat: { classMiss: "throw", tokenMap: false } });
