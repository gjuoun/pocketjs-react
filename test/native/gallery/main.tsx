// The native gallery entry: one page per component, paged with the shoulder triggers (LTRIGGER back, RTRIGGER forward)
// or by touch: a tap in the left eighth of the canvas goes back, one in the right eighth goes forward. The middle is left
// to the page; a tap that lands on a control, or within a finger's margin of one, presses it and never pages (touch.ts).
// The shoulder triggers keep the d-pad free for focus.
// Built by tools/build.ts (--name=native-gallery).
import { useEffect, useState, type ReactNode } from "react";
import { getOps, hostViewport } from "@pocketjs/framework/host";
import { BTN, mount, View } from "../../../src/index.ts";
import { useButton } from "../../../src/input/buttons.ts";
import { onPointerTap } from "../../../src/input/pointer.ts";
import { touchTap } from "./touch.ts";
import { PAGE_NAMES, type PageName } from "./names.ts";
import { ButtonPage, CardPage, CheckboxPage, SwitchPage, RadioPage, SelectPage, SliderPage, AccordionPage, SheetPage, PopoverPage, TooltipPage, DropdownMenuPage, ToastPage, TablePage, DialogPage, FieldPage, BadgePage, LabelPage, AvatarPage, PageFrame, ProgressPage, SeparatorPage, SkeletonPage, SpinnerPage, TabsPage, ThemePage, BreadcrumbPage, AlertPage, EmptyPage, FormFieldPage, PaginationPage, InputOTPPage, NavigationPage, CommandPage } from "./pages.tsx";

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
  Checkbox: () => <CheckboxPage />,
  Switch: () => <SwitchPage />,
  RadioGroup: () => <RadioPage />,
  Select: () => <SelectPage />,
  Slider: () => <SliderPage />,
  Accordion: () => <AccordionPage />,
  Sheet: () => <SheetPage />,
  Popover: () => <PopoverPage />,
  Tooltip: () => <TooltipPage />,
  DropdownMenu: () => <DropdownMenuPage />,
  Toast: () => <ToastPage />,
  Table: () => <TablePage />,
  Breadcrumb: () => <BreadcrumbPage />,
  Alert: () => <AlertPage />,
  Empty: () => <EmptyPage />,
  Field: () => <FormFieldPage />,
  Pagination: () => <PaginationPage />,
  InputOTP: () => <InputOTPPage />,
  NavigationMenu: () => <NavigationPage />,
  Command: () => <CommandPage />,
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
  const back = () => setPage((p) => Math.max(0, p - 1));
  const forward = () => setPage((p) => Math.min(PAGE_COUNT - 1, p + 1));
  useButton(BTN.RTRIGGER, forward);
  useButton(BTN.LTRIGGER, back);
  // Touch paging: a tap that lands near a control presses it; otherwise the left and right eighths of the logical
  // canvas (480 px wide on the web host) page back and forward (touch.ts).
  useEffect(
    () =>
      onPointerTap((x, y) => touchTap(x, y, hostViewport(getOps())?.w ?? 480, { back, forward })),
    [],
  );
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
