// Defect mutants for the native judge: each defect is one body that must fail its gate; each -control is the same
// body done right, which must pass. Built one entry per name by tools/native/judge.ts --mutants.
// Sizes that are not in the vocabulary go through the style prop (the build scan does not collect arbitrary lengths here).
import { BTN } from "@pocketjs/framework/input";
import { useLayoutEffect, useState, type ReactNode } from "react";
import { Text, View } from "../../src/index.ts";
import { Button } from "../../src/native/button.tsx";
import { Focusable } from "../../src/native/focusable.tsx";
import { Card, CardTitle } from "../../src/native/card.tsx";
import { TOKENS } from "../../src/native/tokens.ts";
import { Text as Txt, View as Vw } from "../../src/index.ts";
import { Badge } from "../../src/native/badge.tsx";
import { Checkbox } from "../../src/native/checkbox.tsx";
import { Switch } from "../../src/native/switch.tsx";
import { RadioGroup, RadioItem } from "../../src/native/radio.tsx";
import { Select } from "../../src/native/select.tsx";
import { Sidebar } from "../../src/native/sidebar.tsx";
import { Resizable } from "../../src/native/resizable.tsx";
import { Carousel } from "../../src/native/carousel.tsx";
import { Slider } from "../../src/native/slider.tsx";
import { Accordion, AccordionItem } from "../../src/native/accordion.tsx";
import { Chevron } from "../../src/native/chevron.tsx";
import { Avatar } from "../../src/native/avatar.tsx";
import { Progress } from "../../src/native/progress.tsx";
import { Label } from "../../src/native/label.tsx";
import { Separator } from "../../src/native/separator.tsx";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "../../src/native/sheet.tsx";
import { Popover, PopoverContent, PopoverTrigger } from "../../src/native/popover.tsx";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "../../src/native/dropdown-menu.tsx";
import { clearToasts, toast, Toaster } from "../../src/native/toast.tsx";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../src/native/table.tsx";
import { Alert } from "../../src/native/alert.tsx";
import { Empty } from "../../src/native/empty.tsx";
import { ThemePage, BreadcrumbPage, AlertPage, EmptyPage, FormFieldPage, PaginationPage, InputOTPPage, NavigationPage, CommandPage, SidebarPage, SIDEBAR_GROUPS, ResizablePage, CarouselPage, CAROUSEL_SLIDES, CalendarPage } from "./gallery/pages.tsx";
import { Breadcrumb } from "../../src/native/breadcrumb.tsx";
import type { Driver } from "../../tools/qa/acceptance/drivers.ts";

const T = TOKENS as Record<string, string>;
const ROOT = "w-full h-full flex-col bg-white p-2 gap-2";

function LiveProgress() {
  const [v, setV] = useState(30);
  return (
    <View className="flex-col gap-2">
      <Progress value={v} />
      <Label>{v + "%"}</Label>
      <Button onPress={() => setV(Math.min(100, v + 10))}>Live progress</Button>
    </View>
  );
}

function LiveCheckbox() {
  const [on, setOn] = useState(false);
  return (
    <View className="flex-col gap-2">
      <Checkbox checked={on} onCheckedChange={setOn}>Live checkbox</Checkbox>
    </View>
  );
}

function LiveSwitch() {
  const [on, setOn] = useState(false);
  return (
    <View className="flex-col gap-2">
      <Switch checked={on} onCheckedChange={setOn}>Live switch</Switch>
    </View>
  );
}

function LiveRadio() {
  const [plan, setPlan] = useState("monthly");
  return (
    <View className="flex-col gap-2">
      <RadioGroup value={plan} onValueChange={setPlan}>
        <RadioItem value="monthly">Live radio</RadioItem>
        <RadioItem value="yearly">Yearly</RadioItem>
      </RadioGroup>
      <Label>{"Plan " + plan}</Label>
    </View>
  );
}

function LiveSelect() {
  const [plan, setPlan] = useState("monthly");
  return (
    <View className="flex-col gap-2">
      <Select value={plan} onValueChange={setPlan} options={[{ value: "monthly", label: "Live select" }, { value: "yearly", label: "Yearly" }]} />
      <Label>{"Plan " + plan}</Label>
    </View>
  );
}

function LiveSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  return (
    <View className="flex-col gap-2">
      <Sidebar groups={SIDEBAR_GROUPS} defaultValue="home" collapsed={collapsed} onCollapsedChange={setCollapsed} />
      <Label>{collapsed ? "Rail collapsed" : "Rail expanded"}</Label>
    </View>
  );
}

function LiveResizable() {
  const [size, setSize] = useState(50);
  return (
    <View className="flex-col gap-2">
      <Resizable first={<Label>Files</Label>} second={<Label>Editor</Label>} size={size} onSizeChange={setSize} />
      <Label>{"Split " + size}</Label>
    </View>
  );
}

function LiveSlider() {
  const [v, setV] = useState(30);
  return (
    <View className="flex-col gap-2">
      <Slider value={v} onValueChange={setV}>Live slider</Slider>
    </View>
  );
}

function LiveAccordion() {
  return (
    <View className="flex-col gap-2">
      <Accordion type="multiple">
        <AccordionItem value="live" title="Live accordion">{"Live body."}</AccordionItem>
      </Accordion>
    </View>
  );
}

function LiveToast() {
  const [n, setN] = useState(0);
  return (
    <View className="flex-col gap-2">
      <Button onPress={() => { setN(n + 1); toast("Saved " + (n + 1)); }}>Live notify</Button>
      <Toaster />
    </View>
  );
}

function ShownToast() {
  useLayoutEffect(() => { toast("Saved 1"); }, []);
  return <Toaster />;
}

function Live() {
  const [n, setN] = useState(0);
  return (
    <View className="flex-col gap-2">
      <Button onPress={() => setN(n + 1)}>Live</Button>
      <Text className="text-sm text-slate-900">{"Live pressed " + n}</Text>
    </View>
  );
}

function LiveCrumb() {
  const [picked, setPicked] = useState("none");
  const items = ["Home", "Docs"];
  return (
    <View className="flex-col gap-2">
      <Breadcrumb items={items} onSelect={(i) => setPicked(items[i])} />
      <Label>{"Opened " + picked}</Label>
    </View>
  );
}

export interface Mutant {
  gate: "G1" | "G2" | "G3" | "G4";
  defect: boolean;
  driver: Driver | null;
  render: () => ReactNode;
}

export const MUTANTS: Record<string, Mutant> = {
  "button-contrast": {
    gate: "G1", defect: true, driver: null,
    render: () => (
      <View className={ROOT}>
        <Focusable look={[T["button.base"], T["button.size.md"], "bg-white border-transparent"].join(" ")} onPress={() => {}}>
          <Text className={[T["button.label.sm"], "text-white"].join(" ")}>Save</Text>
        </Focusable>
      </View>
    ),
  },
  "button-contrast-control": {
    gate: "G1", defect: false, driver: null,
    render: () => <View className={ROOT}><Button>Save</Button></View>,
  },
  "zero-size-card": {
    gate: "G2", defect: true, driver: null,
    render: () => <View className={ROOT}><View className="flex-col" style={{ width: 0, height: 0 }}><CardTitle>Hidden card</CardTitle></View></View>,
  },
  "zero-size-card-control": {
    gate: "G2", defect: false, driver: null,
    render: () => <View className={ROOT}><Card><CardTitle>Hidden card</CardTitle></Card></View>,
  },
  "overflow-panel": {
    gate: "G2", defect: true, driver: null,
    render: () => (
      <View className={ROOT}>
        <View className="flex-col bg-white" style={{ width: 600, height: 60 }}><Text className="text-sm font-bold text-slate-900">Wide panel</Text></View>
      </View>
    ),
  },
  "overflow-panel-control": {
    gate: "G2", defect: false, driver: null,
    render: () => (
      <View className={ROOT}>
        <View className="flex-col bg-white" style={{ width: 200, height: 60 }}><Text className="text-sm font-bold text-slate-900">Wide panel</Text></View>
      </View>
    ),
  },
  "misaligned-tabs": {
    gate: "G3", defect: true, driver: null,
    render: () => (
      <View className={ROOT}>
        <View className="flex-row items-center gap-1 p-1 bg-slate-100">
          <View className="bg-slate-900" style={{ width: 60, height: 40 }} />
          <View className="bg-slate-900" style={{ width: 60, height: 40, marginTop: 10 }} />
        </View>
      </View>
    ),
  },
  "misaligned-tabs-control": {
    gate: "G3", defect: false, driver: null,
    render: () => (
      <View className={ROOT}>
        <View className="flex-row items-center gap-1 p-1 bg-slate-100">
          <View className="bg-slate-900" style={{ width: 60, height: 40 }} />
          <View className="bg-slate-900" style={{ width: 60, height: 40 }} />
        </View>
      </View>
    ),
  },
  "dead-button": {
    gate: "G4", defect: true, driver: { kind: "driven", trigger: "Dead", metrics: ["text"] },
    render: () => <View className={ROOT}><Button>Dead</Button></View>,
  },
  "dead-button-control": {
    gate: "G4", defect: false, driver: { kind: "driven", trigger: "Live", metrics: ["text"] },
    render: () => <View className={ROOT}><Live /></View>,
  },
  "badge-contrast": {
    gate: "G1", defect: true, driver: null,
    render: () => (
      <View className={ROOT}>
        <View className={[T["badge.base"], "bg-white border-transparent"].join(" ")}>
          <Text className={[T["badge.label"], "text-white"].join(" ")}>Failed</Text>
        </View>
      </View>
    ),
  },
  "badge-contrast-control": {
    gate: "G1", defect: false, driver: null,
    render: () => <View className={ROOT}><Badge variant="destructive">Failed</Badge></View>,
  },
  "zero-size-avatar": {
    gate: "G2", defect: true, driver: null,
    render: () => <View className={ROOT}><View className="flex-col" style={{ width: 0, height: 0 }}><Text className={T["avatar.text.md"]}>AK</Text></View></View>,
  },
  "zero-size-avatar-control": {
    gate: "G2", defect: false, driver: null,
    render: () => <View className={ROOT}><Avatar>AK</Avatar></View>,
  },
  "wide-progress": {
    gate: "G2", defect: true, driver: null,
    render: () => <View className={ROOT}><View className="h-2 rounded-[4px] bg-slate-200" style={{ width: 600 }} /></View>,
  },
  "wide-progress-control": {
    gate: "G2", defect: false, driver: null,
    render: () => <View className={ROOT}><Progress value={50} /></View>,
  },
  "misaligned-separator": {
    gate: "G3", defect: true, driver: null,
    render: () => (
      <View className={ROOT}>
        <View className="flex-row items-center h-8 gap-2">
          <Label>Home</Label>
          <View className="h-full w-[1px] bg-slate-200" style={{ marginTop: 10 }} />
          <Label>Docs</Label>
        </View>
      </View>
    ),
  },
  "misaligned-separator-control": {
    gate: "G3", defect: false, driver: null,
    render: () => (
      <View className={ROOT}>
        <View className="flex-row items-center h-8 gap-2">
          <Label>Home</Label>
          <Separator orientation="vertical" />
          <Label>Docs</Label>
        </View>
      </View>
    ),
  },
  "dead-progress": {
    gate: "G4", defect: true, driver: { kind: "driven", trigger: "Dead progress", metrics: ["text"] },
    render: () => (
      <View className={ROOT}>
        <View className="flex-col gap-2">
          <Progress value={30} />
          <Label>30%</Label>
          <Button>Dead progress</Button>
        </View>
      </View>
    ),
  },
  "dead-progress-control": {
    gate: "G4", defect: false, driver: { kind: "driven", trigger: "Live progress", metrics: ["text"] },
    render: () => <View className={ROOT}><LiveProgress /></View>,
  },
  "dead-theme": {
    gate: "G4", defect: true, driver: { kind: "driven", trigger: "Dead theme", metrics: ["text"] },
    render: () => <View className={ROOT}><Button>Dead theme</Button></View>,
  },
  "dead-theme-control": {
    gate: "G4", defect: false, driver: { kind: "driven", trigger: "Dark", metrics: ["text"] },
    render: () => <ThemePage />,
  },
  "dead-checkbox": {
    gate: "G4", defect: true, driver: { kind: "driven", trigger: "Dead checkbox", metrics: ["ink"] },
    render: () => <View className={ROOT}><Checkbox checked={false}>Dead checkbox</Checkbox></View>,
  },
  "dead-checkbox-control": {
    gate: "G4", defect: false, driver: { kind: "driven", trigger: "Live checkbox", metrics: ["ink"] },
    render: () => <View className={ROOT}><LiveCheckbox /></View>,
  },
  "checkbox-contrast": {
    gate: "G1", defect: true, driver: null,
    render: () => (
      <View className={ROOT}>
        <Focusable look={T["checkbox.row"]}>
          <View className={[T["checkbox.box"], T["checkbox.box.off"]].join(" ")} />
          <Text className="text-base text-slate-300">Faint checkbox</Text>
        </Focusable>
      </View>
    ),
  },
  "checkbox-contrast-control": {
    gate: "G1", defect: false, driver: null,
    render: () => <View className={ROOT}><Checkbox checked={false}>Faint checkbox</Checkbox></View>,
  },
  "dead-switch": {
    gate: "G4", defect: true, driver: { kind: "driven", trigger: "Dead switch", metrics: ["offset"] },
    render: () => <View className={ROOT}><Switch checked={false}>Dead switch</Switch></View>,
  },
  "dead-switch-control": {
    gate: "G4", defect: false, driver: { kind: "driven", trigger: "Live switch", metrics: ["offset"] },
    render: () => <View className={ROOT}><LiveSwitch /></View>,
  },
  "dead-radio": {
    gate: "G4", defect: true, driver: { kind: "driven", trigger: "Dead radio", metrics: ["text"], keys: [BTN.RIGHT] },
    render: () => (
      <View className={ROOT}>
        <RadioGroup value="monthly">
          <RadioItem value="monthly">Dead radio</RadioItem>
          <RadioItem value="yearly">Yearly</RadioItem>
        </RadioGroup>
        <Label>Plan monthly</Label>
      </View>
    ),
  },
  "dead-radio-control": {
    gate: "G4", defect: false, driver: { kind: "driven", trigger: "Live radio", metrics: ["text"], keys: [BTN.RIGHT] },
    render: () => <View className={ROOT}><LiveRadio /></View>,
  },
  "dead-select": {
    gate: "G4", defect: true, driver: { kind: "driven", trigger: "Dead select", metrics: ["text"], keys: [BTN.CIRCLE, BTN.DOWN, BTN.CIRCLE] },
    render: () => (
      <View className={ROOT}>
        <Focusable look={[T["select.trigger"], T["select.focus"]].join(" ")}>
          <Text className={T["select.value"]}>Dead select</Text>
        </Focusable>
      </View>
    ),
  },
  "dead-select-control": {
    gate: "G4", defect: false, driver: { kind: "driven", trigger: "Live select", metrics: ["text"], keys: [BTN.CIRCLE, BTN.DOWN, BTN.CIRCLE] },
    render: () => <View className={ROOT}><LiveSelect /></View>,
  },
  "dead-slider": {
    gate: "G4", defect: true, driver: { kind: "driven", trigger: "Dead slider", metrics: ["offset"], keys: [BTN.RIGHT] },
    render: () => <View className={ROOT}><Slider value={30}>Dead slider</Slider></View>,
  },
  "dead-slider-control": {
    gate: "G4", defect: false, driver: { kind: "driven", trigger: "Live slider", metrics: ["offset"], keys: [BTN.RIGHT] },
    render: () => <View className={ROOT}><LiveSlider /></View>,
  },
  "dead-accordion": {
    gate: "G4", defect: true, driver: { kind: "driven", trigger: "Dead accordion", metrics: ["text"] },
    render: () => (
      <View className={ROOT}>
        <Focusable look={[T["accordion.trigger"], T["accordion.focus"]].join(" ")}>
          <Text className={T["accordion.trigger.text"]}>Dead accordion</Text>
          <Chevron turn={0} />
        </Focusable>
      </View>
    ),
  },
  "dead-accordion-control": {
    gate: "G4", defect: false, driver: { kind: "driven", trigger: "Live accordion", metrics: ["text"] },
    render: () => <View className={ROOT}><LiveAccordion /></View>,
  },
  "dead-sheet": {
    gate: "G4", defect: true, driver: { kind: "driven", trigger: "Dead sheet", metrics: ["layer"] },
    render: () => <View className={ROOT}><Button>Dead sheet</Button></View>,
  },
  "dead-sheet-control": {
    gate: "G4", defect: false, driver: { kind: "driven", trigger: "Live sheet", metrics: ["layer"] },
    render: () => (
      <View className={ROOT}>
        <Sheet>
          <SheetTrigger>Live sheet</SheetTrigger>
          <SheetContent size={75}><SheetTitle>Account</SheetTitle></SheetContent>
        </Sheet>
      </View>
    ),
  },
  "sheet-zero-width": {
    gate: "G2", defect: true, driver: null,
    render: () => <View className={ROOT}><View className="absolute inset-0"><View className="h-full flex-col" style={{ width: 0 }}><SheetTitle>Account</SheetTitle></View></View></View>,
  },
  "sheet-zero-width-control": {
    gate: "G2", defect: false, driver: null,
    render: () => <View className={ROOT}><Sheet defaultOpen><SheetContent size={75}><SheetTitle>Account</SheetTitle></SheetContent></Sheet></View>,
  },
  "dead-popover": {
    gate: "G4", defect: true, driver: { kind: "driven", trigger: "Dead popover", metrics: ["layer"] },
    render: () => <View className={ROOT}><Button>Dead popover</Button></View>,
  },
  "dead-popover-control": {
    gate: "G4", defect: false, driver: { kind: "driven", trigger: "Live popover", metrics: ["layer"] },
    render: () => (
      <View className={ROOT}>
        <Popover>
          <PopoverTrigger>Live popover</PopoverTrigger>
          <PopoverContent><Text className="text-sm text-slate-900">Shared</Text></PopoverContent>
        </Popover>
      </View>
    ),
  },
  "popover-contrast": {
    gate: "G1", defect: true, driver: null,
    render: () => (
      <View className={ROOT}>
        <View className="flex-col gap-2 p-3 w-[220px] bg-white border border-slate-200 rounded-md">
          <Text className="text-sm text-slate-300">Faint popover</Text>
        </View>
      </View>
    ),
  },
  "popover-contrast-control": {
    gate: "G1", defect: false, driver: null,
    render: () => (
      <View className={ROOT}>
        <Popover defaultOpen>
          <PopoverTrigger>Share</PopoverTrigger>
          <PopoverContent><Text className="text-sm text-slate-900">Shared</Text></PopoverContent>
        </Popover>
      </View>
    ),
  },
  "tooltip-contrast": {
    gate: "G1", defect: true, driver: null,
    render: () => (
      <View className={ROOT}>
        <View className="px-2 py-1 rounded-md bg-white border border-white"><Text className="text-xs font-bold text-white">Faint hint</Text></View>
      </View>
    ),
  },
  "tooltip-contrast-control": {
    gate: "G1", defect: false, driver: null,
    render: () => (
      <View className={ROOT}>
        <View className={[T["tooltip.panel"]].join(" ")}><Text className={T["tooltip.text"]}>Faint hint</Text></View>
      </View>
    ),
  },
  "dead-dropdown": {
    gate: "G4", defect: true, driver: { kind: "driven", trigger: "Dead actions", metrics: ["layer"] },
    render: () => <View className={ROOT}><Button>Dead actions</Button></View>,
  },
  "dead-dropdown-control": {
    gate: "G4", defect: false, driver: { kind: "driven", trigger: "Live actions", metrics: ["menu"] },
    render: () => (
      <View className={ROOT}>
        <DropdownMenu>
          <DropdownMenuTrigger>Live actions</DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem value="edit">Edit</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </View>
    ),
  },
  "dropdown-contrast": {
    gate: "G1", defect: true, driver: null,
    render: () => <View className={ROOT}><View className="flex-col p-1 w-[200px] bg-white"><Text className="px-2 text-xs font-bold text-slate-300">Document</Text></View></View>,
  },
  "dropdown-contrast-control": {
    gate: "G1", defect: false, driver: null,
    render: () => (
      <View className={ROOT}>
        <DropdownMenu defaultOpen>
          <DropdownMenuTrigger>Actions</DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuLabel>Document</DropdownMenuLabel>
            <DropdownMenuItem value="edit">Edit</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </View>
    ),
  },
  "dead-toast": {
    gate: "G4", defect: true, driver: { kind: "driven", trigger: "Dead notify", metrics: ["text"] },
    render: () => { clearToasts(); return <View className={ROOT}><Button>Dead notify</Button></View>; },
  },
  "dead-toast-control": {
    gate: "G4", defect: false, driver: { kind: "driven", trigger: "Live notify", metrics: ["text"] },
    render: () => { clearToasts(); return <View className={ROOT}><LiveToast /></View>; },
  },
  "toast-overflow": {
    gate: "G2", defect: true, driver: null,
    render: () => {
      clearToasts();
      return (
        <View className={ROOT}>
          <View className="absolute bottom-0 w-full flex-col items-center">
            <View className="px-3 py-2 bg-slate-900" style={{ width: 600 }}><Text className={T["toast.text"]}>Saved 1</Text></View>
          </View>
        </View>
      );
    },
  },
  "toast-overflow-control": {
    gate: "G2", defect: false, driver: null,
    render: () => { clearToasts(); return <View className={ROOT}><ShownToast /></View>; },
  },
  "misaligned-table": {
    gate: "G3", defect: true, driver: null,
    render: () => (
      <View className={ROOT}>
        <View className="flex-row items-center h-8">
          <View className="h-8 flex-row items-center" style={{ width: 80, marginTop: 10 }}><Text className={T["table.cell.text"]}>Team</Text></View>
          <View className="h-8 flex-row items-center" style={{ width: 80 }}><Text className={T["table.cell.text"]}>Pro</Text></View>
        </View>
      </View>
    ),
  },
  "misaligned-table-control": {
    gate: "G3", defect: false, driver: null,
    render: () => (
      <View className={ROOT}>
        <Table columns={[{ width: 80 }, { width: 80 }]}>
          <TableBody>
            <TableRow><TableCell>Team</TableCell><TableCell>Pro</TableCell></TableRow>
          </TableBody>
        </Table>
      </View>
    ),
  },
  "table-overflow": {
    gate: "G2", defect: true, driver: null,
    render: () => (
      <View className={ROOT}>
        <Table columns={[{ width: 40 }]}>
          <TableBody>
            <TableRow><TableCell>Enterprise</TableCell></TableRow>
          </TableBody>
        </Table>
      </View>
    ),
  },
  "table-overflow-control": {
    gate: "G2", defect: false, driver: null,
    render: () => (
      <View className={ROOT}>
        <Table columns={[{ width: 120 }]}>
          <TableBody>
            <TableRow><TableCell>Enterprise</TableCell></TableRow>
          </TableBody>
        </Table>
      </View>
    ),
  },
  "breadcrumb-contrast": {
    gate: "G1", defect: true, driver: null,
    render: () => <View className={ROOT}><View className={[T["breadcrumb.item"], T["breadcrumb.idle.rest"]].join(" ")}><Text className="text-sm text-slate-300">Home</Text></View></View>,
  },
  "breadcrumb-contrast-control": {
    gate: "G1", defect: false, driver: null,
    render: () => <View className={ROOT}><Breadcrumb items={["Home", "Docs"]} /></View>,
  },
  "dead-breadcrumb": {
    gate: "G4", defect: true, driver: { kind: "driven", trigger: "Dead crumb", metrics: ["text"] },
    render: () => <View className={ROOT}><Focusable look={[T["breadcrumb.item"], T["breadcrumb.idle.rest"], T["breadcrumb.focus"]].join(" ")}><Text className={T["breadcrumb.link"]}>Dead crumb</Text></Focusable></View>,
  },
  "dead-breadcrumb-control": {
    gate: "G4", defect: false, driver: { kind: "driven", trigger: "Home", metrics: ["text"] },
    render: () => <View className={ROOT}><LiveCrumb /></View>,
  },
  "alert-contrast": {
    gate: "G1", defect: true, driver: null,
    render: () => <View className={ROOT}><View className={[T["alert.base"], T["alert.info.rest"]].join(" ")}><Text className="text-sm font-bold text-blue-300">Faint alert</Text></View></View>,
  },
  "alert-contrast-control": {
    gate: "G1", defect: false, driver: null,
    render: () => <View className={ROOT}><Alert variant="info" title="Live alert">Clear text.</Alert></View>,
  },
  "zero-size-alert": {
    gate: "G2", defect: true, driver: null,
    render: () => <View className={ROOT}><View className="flex-col" style={{ width: 0, height: 0 }}><Text className={T["alert.title"]}>Hidden alert</Text></View></View>,
  },
  "zero-size-alert-control": {
    gate: "G2", defect: false, driver: null,
    render: () => <View className={ROOT}><Alert title="Shown alert" /></View>,
  },
  "empty-contrast": {
    gate: "G1", defect: true, driver: null,
    render: () => <View className={ROOT}><View className={T["empty.base"]}><Text className="text-sm text-slate-300">Faint empty</Text></View></View>,
  },
  "empty-contrast-control": {
    gate: "G1", defect: false, driver: null,
    render: () => <View className={ROOT}><Empty title="Nothing yet">Clear text.</Empty></View>,
  },
  "dead-empty": {
    gate: "G4", defect: true, driver: { kind: "driven", trigger: "Dead action", metrics: ["text"] },
    render: () => <View className={ROOT}><Empty title="Nothing yet" action={<Button>Dead action</Button>} /></View>,
  },
  "dead-empty-control": {
    gate: "G4", defect: false, driver: { kind: "driven", trigger: "Create project", metrics: ["text"] },
    render: () => <View className={ROOT}><EmptyPage /></View>,
  },
  "field-contrast": {
    gate: "G1", defect: true, driver: null,
    render: () => <View className={ROOT}><Text className="text-xs text-slate-300">Faint hint</Text></View>,
  },
  "field-contrast-control": {
    gate: "G1", defect: false, driver: null,
    render: () => <View className={ROOT}><FormFieldPage /></View>,
  },
  "dead-field": {
    gate: "G4", defect: true, driver: { kind: "driven", trigger: "Dead validate", metrics: ["text"] },
    render: () => <View className={ROOT}><Button>Dead validate</Button></View>,
  },
  "dead-field-control": {
    gate: "G4", defect: false, driver: { kind: "driven", trigger: "Validate", metrics: ["text"] },
    render: () => <View className={ROOT}><FormFieldPage /></View>,
  },
  "pagination-contrast": {
    gate: "G1", defect: true, driver: null,
    render: () => <View className={ROOT}><Text className="text-sm text-slate-300">Faint page 4</Text></View>,
  },
  "pagination-contrast-control": {
    gate: "G1", defect: false, driver: null,
    render: () => <View className={ROOT}><PaginationPage /></View>,
  },
  "dead-pagination": {
    gate: "G4", defect: true, driver: { kind: "driven", trigger: "Dead next", metrics: ["text"] },
    render: () => <View className={ROOT}><Focusable look={[T["pagination.wide"], T["pagination.idle.rest"], T["pagination.focus"]].join(" ")}><Text className={T["pagination.text"]}>Dead next</Text></Focusable></View>,
  },
  "dead-pagination-control": {
    gate: "G4", defect: false, driver: { kind: "driven", trigger: "Next", metrics: ["text"] },
    render: () => <View className={ROOT}><PaginationPage /></View>,
  },
  "misaligned-otp": {
    gate: "G3", defect: true, driver: null,
    render: () => (
      <View className={ROOT}>
        <View className="flex-row items-center gap-2">
          <View className={T["otp.cell"]} />
          <View className={T["otp.cell"]} style={{ marginTop: 10 }} />
        </View>
      </View>
    ),
  },
  "misaligned-otp-control": {
    gate: "G3", defect: false, driver: null,
    render: () => <View className={ROOT}><InputOTPPage /></View>,
  },
  "dead-otp": {
    gate: "G4", defect: true, driver: { kind: "driven", trigger: "_", metrics: ["ink"] },
    render: () => <View className={ROOT}><Focusable look={[T["otp.cell"], T["otp.focus"]].join(" ")}><Text className={T["field.placeholder"]}>_</Text></Focusable></View>,
  },
  "dead-otp-control": {
    gate: "G4", defect: false, driver: { kind: "driven", trigger: "_", metrics: ["ink"] },
    render: () => <View className={ROOT}><InputOTPPage /></View>,
  },
  "dead-menu": {
    gate: "G4", defect: true, driver: { kind: "driven", trigger: "Dead menu", metrics: ["layer"] },
    render: () => <View className={ROOT}><Focusable look={[T["nav.trigger"], T["nav.focus"]].join(" ")}><Text className={T["nav.trigger.text"]}>Dead menu</Text></Focusable></View>,
  },
  "dead-menu-control": {
    gate: "G4", defect: false, driver: { kind: "driven", trigger: "Products", metrics: ["layer"] },
    render: () => <View className={ROOT}><NavigationPage /></View>,
  },
  "nav-contrast": {
    gate: "G1", defect: true, driver: null,
    render: () => <View className={ROOT}><Focusable look={[T["nav.trigger"], T["nav.focus"]].join(" ")}><Text className="text-sm text-slate-300">Faint menu</Text></Focusable></View>,
  },
  "nav-contrast-control": {
    gate: "G1", defect: false, driver: null,
    render: () => <View className={ROOT}><NavigationPage /></View>,
  },
  "dead-command": {
    gate: "G4", defect: true, driver: { kind: "driven", trigger: "Dead item", metrics: ["text"] },
    render: () => <View className={ROOT}><Focusable look={[T["command.item"], T["command.focus"]].join(" ")}><Text className={T["command.item.text"]}>Dead item</Text></Focusable></View>,
  },
  "dead-command-control": {
    gate: "G4", defect: false, driver: { kind: "driven", trigger: "Calendar", metrics: ["text"] },
    render: () => <View className={ROOT}><CommandPage /></View>,
  },
  "command-contrast": {
    gate: "G1", defect: true, driver: null,
    render: () => <View className={ROOT}><Text className="text-xs font-bold text-slate-300">Faint heading</Text></View>,
  },
  "command-contrast-control": {
    gate: "G1", defect: false, driver: null,
    render: () => <View className={ROOT}><CommandPage /></View>,
  },
  "dead-sidebar": {
    gate: "G4", defect: true, driver: { kind: "driven", trigger: "Hide", metrics: ["text"] },
    render: () => <View className={ROOT}><Focusable look={[T["sidebar.toggle"], T["sidebar.focus"]].join(" ")}><Text className={T["sidebar.toggle.text"]}>Hide</Text></Focusable></View>,
  },
  "dead-sidebar-control": {
    gate: "G4", defect: false, driver: { kind: "driven", trigger: "Hide", metrics: ["text"] },
    render: () => <View className={ROOT}><LiveSidebar /></View>,
  },
  "sidebar-contrast": {
    gate: "G1", defect: true, driver: null,
    render: () => <View className={ROOT}><View className={T["sidebar.root"]}><Text className="text-sm text-slate-300">Faint item</Text></View></View>,
  },
  "sidebar-contrast-control": {
    gate: "G1", defect: false, driver: null,
    render: () => <View className={ROOT}><SidebarPage /></View>,
  },
  "sidebar-zero-width": {
    gate: "G2", defect: true, driver: null,
    render: () => <View className={ROOT}><View className={T["sidebar.root"]} style={{ width: 0 }}><Text className={T["sidebar.label"]}>Home</Text></View></View>,
  },
  "sidebar-zero-width-control": {
    gate: "G2", defect: false, driver: null,
    render: () => <View className={ROOT}><SidebarPage /></View>,
  },
  "misaligned-sidebar": {
    gate: "G3", defect: true, driver: null,
    render: () => (
      <View className={ROOT}>
        <View className="flex-row items-center gap-2">
          <View className={T["sidebar.item"]}><Text className={T["sidebar.label"]}>Home</Text></View>
          <View className={T["sidebar.item"]} style={{ marginTop: 10 }}><Text className={T["sidebar.label"]}>Inbox</Text></View>
        </View>
      </View>
    ),
  },
  "misaligned-sidebar-control": {
    gate: "G3", defect: false, driver: null,
    render: () => <View className={ROOT}><SidebarPage /></View>,
  },
  "dead-resizable": {
    gate: "G4", defect: true, driver: { kind: "driven", trigger: "::", metrics: ["offset"], keys: [BTN.RIGHT, BTN.RIGHT] },
    render: () => (
      <View className={ROOT}>
        <View className={T["resizable.group"]}>
          <View className={T["resizable.pane"]} style={{ width: 120 }}><Label>Files</Label></View>
          <Focusable look={[T["resizable.divider"], T["resizable.focus"]].join(" ")}><Text className={T["resizable.grip"]}>::</Text></Focusable>
          <View className={T["resizable.pane.rest"]}><Label>Editor</Label></View>
        </View>
      </View>
    ),
  },
  "dead-resizable-control": {
    gate: "G4", defect: false, driver: { kind: "driven", trigger: "::", metrics: ["offset"], keys: [BTN.RIGHT, BTN.RIGHT] },
    render: () => <View className={ROOT}><LiveResizable /></View>,
  },
  "resizable-contrast": {
    gate: "G1", defect: true, driver: null,
    render: () => <View className={ROOT}><View className={T["resizable.divider"]}><View className={T["resizable.fill"]}><Text className="text-sm text-slate-300">::</Text></View></View></View>,
  },
  "resizable-contrast-control": {
    gate: "G1", defect: false, driver: null,
    render: () => <View className={ROOT}><ResizablePage /></View>,
  },
  "resizable-zero-width": {
    gate: "G2", defect: true, driver: null,
    render: () => (
      <View className={ROOT}>
        <View className={T["resizable.group"]}>
          <View className={T["resizable.pane"]} style={{ width: 0 }}><Label>Files</Label></View>
          <View className={T["resizable.pane.rest"]}><Label>Editor</Label></View>
        </View>
      </View>
    ),
  },
  "resizable-zero-width-control": {
    gate: "G2", defect: false, driver: null,
    render: () => <View className={ROOT}><ResizablePage /></View>,
  },
  "misaligned-resizable": {
    gate: "G3", defect: true, driver: null,
    render: () => (
      <View className={ROOT}>
        <View className="flex-row items-center gap-2">
          <View className={T["resizable.divider"]} style={{ height: 40 }} />
          <View className={T["resizable.divider"]} style={{ height: 40, marginTop: 10 }} />
        </View>
      </View>
    ),
  },
  "misaligned-resizable-control": {
    gate: "G3", defect: false, driver: null,
    render: () => (
      <View className={ROOT}>
        <View className="flex-row items-center gap-2">
          <View className={T["resizable.divider"]} style={{ height: 40 }} />
          <View className={T["resizable.divider"]} style={{ height: 40 }} />
        </View>
      </View>
    ),
  },
  "dead-carousel": {
    gate: "G4", defect: true, driver: { kind: "driven", trigger: "Next slide", metrics: ["text"] },
    render: () => (
      <View className={ROOT}>
        <View className={T["carousel.root"]}>
          <Focusable look={[T["carousel.nav"], T["carousel.focus"], T["carousel.nav.idle"]].join(" ")}><Text className={T["carousel.nav.text"]}>Next slide</Text></Focusable>
          <Text className={T["carousel.indicator"]}>1 / 3</Text>
        </View>
      </View>
    ),
  },
  "dead-carousel-control": {
    gate: "G4", defect: false, driver: { kind: "driven", trigger: "Next slide", metrics: ["text"] },
    render: () => <View className={ROOT}><CarouselPage /></View>,
  },
  "carousel-contrast": {
    gate: "G1", defect: true, driver: null,
    render: () => <View className={ROOT}><View className={T["carousel.root"]}><Text className="text-sm text-slate-300">1 / 3</Text></View></View>,
  },
  "carousel-contrast-control": {
    gate: "G1", defect: false, driver: null,
    render: () => <View className={ROOT}><CarouselPage /></View>,
  },
  "carousel-overflow": {
    gate: "G2", defect: true, driver: null,
    render: () => (
      <View className={ROOT}>
        <View className="w-[120px] h-[96px] overflow-hidden bg-white border border-slate-200 rounded-md">
          <View className={[T["carousel.slide"], T["carousel.at"]].join(" ")}><Text className={T["carousel.text"]}>{CAROUSEL_SLIDES[0]}</Text></View>
        </View>
      </View>
    ),
  },
  "carousel-overflow-control": {
    gate: "G2", defect: false, driver: null,
    render: () => <View className={ROOT}><CarouselPage /></View>,
  },
  "misaligned-carousel": {
    gate: "G3", defect: true, driver: null,
    render: () => (
      <View className={ROOT}>
        <View className="flex-row items-center gap-2">
          <View className={[T["carousel.nav"], T["carousel.nav.idle"]].join(" ")}><Text className={T["carousel.nav.text"]}>Prev slide</Text></View>
          <View className={[T["carousel.nav"], T["carousel.nav.idle"]].join(" ")} style={{ marginTop: 10 }}><Text className={T["carousel.nav.text"]}>Next slide</Text></View>
        </View>
      </View>
    ),
  },
  "misaligned-carousel-control": {
    gate: "G3", defect: false, driver: null,
    render: () => <View className={ROOT}><CarouselPage /></View>,
  },
  "dead-calendar": {
    gate: "G4", defect: true, driver: { kind: "driven", trigger: "Next month", metrics: ["text"] },
    render: () => (
      <View className={ROOT}>
        <View className={T["calendar.root"]}>
          <View className={T["calendar.header"]}>
            <Focusable look={[T["calendar.nav"], T["calendar.nav.idle"], T["calendar.focus"]].join(" ")}><Text className={T["calendar.nav.text"]}>Next month</Text></Focusable>
            <Text className={T["calendar.title"]}>October 2026</Text>
          </View>
        </View>
      </View>
    ),
  },
  "dead-calendar-control": {
    gate: "G4", defect: false, driver: { kind: "driven", trigger: "Next month", metrics: ["text"] },
    render: () => <View className={ROOT}><CalendarPage /></View>,
  },
  "calendar-contrast": {
    gate: "G1", defect: true, driver: null,
    render: () => <View className={ROOT}><View className={T["calendar.root"]}><Text className="text-sm text-slate-300">15</Text></View></View>,
  },
  "calendar-contrast-control": {
    gate: "G1", defect: false, driver: null,
    render: () => <View className={ROOT}><CalendarPage /></View>,
  },
  "calendar-zero-width": {
    gate: "G2", defect: true, driver: null,
    render: () => (
      <View className={ROOT}>
        <View className={T["calendar.root"]}>
          <View className={T["calendar.cell"]} style={{ width: 0 }}><Text className={T["calendar.day.text"]}>15</Text></View>
        </View>
      </View>
    ),
  },
  "calendar-zero-width-control": {
    gate: "G2", defect: false, driver: null,
    render: () => <View className={ROOT}><CalendarPage /></View>,
  },
  "misaligned-calendar": {
    gate: "G3", defect: true, driver: null,
    render: () => (
      <View className={ROOT}>
        <View className="flex-row items-center">
          <View className={T["calendar.cell"]}><Text className={T["calendar.weekday"]}>Su</Text></View>
          <View className={T["calendar.cell"]} style={{ marginTop: 10 }}><Text className={T["calendar.weekday"]}>Mo</Text></View>
        </View>
      </View>
    ),
  },
  "misaligned-calendar-control": {
    gate: "G3", defect: false, driver: null,
    render: () => <View className={ROOT}><CalendarPage /></View>,
  },
};
