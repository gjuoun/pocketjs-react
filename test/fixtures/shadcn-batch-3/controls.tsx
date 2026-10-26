// Batch 3 controls on the vendored shadcn sources (codemod output, never edited). One section per screen, so
// a test mounts only the control it measures. `on` records every change; `p` carries the section's props.
import { Text, View } from "pocketjs-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "../shadcn-full/ui/accordion.tsx";
import {
  Breadcrumb,
  BreadcrumbEllipsis,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "../shadcn-full/ui/breadcrumb.tsx";
import { Checkbox } from "../shadcn-full/ui/checkbox.tsx";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "../shadcn-full/ui/collapsible.tsx";
import { DirectionProvider, useDirection } from "../shadcn-full/ui/direction.tsx";
import { RadioGroup, RadioGroupItem } from "../shadcn-full/ui/radio-group.tsx";
import { Slider } from "../shadcn-full/ui/slider.tsx";
import { Switch } from "../shadcn-full/ui/switch.tsx";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../shadcn-full/ui/tabs.tsx";
import { Toggle } from "../shadcn-full/ui/toggle.tsx";
import { ToggleGroup, ToggleGroupItem } from "../shadcn-full/ui/toggle-group.tsx";

export type Recorder = (name: string, value: unknown) => void;
export interface ControlsProps {
  which: string;
  on?: Recorder;
  p?: Record<string, any>;
}

function DirectionProbe() {
  return <Text className="text-sm text-slate-900">{useDirection()}</Text>;
}

export function Controls({ which, on = () => {}, p = {} }: ControlsProps) {
  switch (which) {
    case "checkbox":
      return (
        <View className="w-full h-full flex-col items-start p-2 bg-white">
          <Checkbox checked={p.checked} defaultChecked={p.defaultChecked} disabled={p.disabled} onCheckedChange={(v: boolean) => on("checkbox", v)} />
        </View>
      );
    case "switch":
      return (
        <View className="w-full h-full flex-col items-start p-2 bg-white">
          <Switch defaultChecked={p.defaultChecked} onCheckedChange={(v: boolean) => on("switch", v)} />
        </View>
      );
    case "radio-group":
      return (
        <View className="w-full h-full flex-col items-start p-2 bg-white">
          <RadioGroup defaultValue={p.defaultValue} onValueChange={(v: string) => on("radio", v)}>
            <RadioGroupItem value="a" />
            <RadioGroupItem value="b" />
            <RadioGroupItem value="c" />
          </RadioGroup>
        </View>
      );
    case "toggle":
      return (
        <View className="w-full h-full flex-col items-start p-2 bg-white">
          <Toggle defaultPressed={p.defaultPressed} onPressedChange={(v: boolean) => on("toggle", v)}>Bold</Toggle>
        </View>
      );
    case "toggle-group":
      return (
        <View className="w-full h-full flex-col items-start p-2 bg-white">
          <ToggleGroup type={p.type} defaultValue={p.defaultValue} onValueChange={(v: unknown) => on("group", v)}>
            <ToggleGroupItem value="a">A</ToggleGroupItem>
            <ToggleGroupItem value="b">B</ToggleGroupItem>
            <ToggleGroupItem value="c">C</ToggleGroupItem>
          </ToggleGroup>
        </View>
      );
    case "accordion":
      return (
        <View className="w-full h-full flex-col items-start p-2 bg-white">
          <Accordion type="single" collapsible onValueChange={(v: unknown) => on("accordion", v)}>
            <AccordionItem value="one">
              <AccordionTrigger>First</AccordionTrigger>
              <AccordionContent>Alpha body</AccordionContent>
            </AccordionItem>
            <AccordionItem value="two">
              <AccordionTrigger>Second</AccordionTrigger>
              <AccordionContent>Beta body</AccordionContent>
            </AccordionItem>
          </Accordion>
        </View>
      );
    case "collapsible":
      return (
        <View className="w-full h-full flex-col items-start p-2 bg-white">
          <Collapsible defaultOpen={p.defaultOpen} onOpenChange={(v: boolean) => on("collapsible", v)}>
            <CollapsibleTrigger>More</CollapsibleTrigger>
            <CollapsibleContent>Hidden body</CollapsibleContent>
          </Collapsible>
        </View>
      );
    case "tabs":
      return (
        <View className="w-full h-full flex-col items-start p-2 bg-white">
          <Tabs defaultValue={p.defaultValue ?? "a"} onValueChange={(v: string) => on("tabs", v)}>
            <TabsList>
              <TabsTrigger value="a">Account</TabsTrigger>
              <TabsTrigger value="b">Password</TabsTrigger>
            </TabsList>
            <TabsContent value="a">Make changes</TabsContent>
            <TabsContent value="b">Change password</TabsContent>
          </Tabs>
        </View>
      );
    case "slider":
      return (
        <View className="w-[200px] h-full flex-col items-start p-2 bg-white">
          <Slider
            defaultValue={p.defaultValue ?? [25]}
            min={0}
            max={100}
            step={p.step ?? 1}
            onValueChange={(v: number[]) => on("slider", v[0])}
            onValueCommit={(v: number[]) => on("commit", v[0])}
          />
        </View>
      );
    case "direction":
      return (
        <View className="w-full h-full flex-col items-start p-2 bg-white">
          <DirectionProvider dir={p.dir}>
            <DirectionProbe />
          </DirectionProvider>
        </View>
      );
    case "breadcrumb":
      return (
        <View className="w-full h-full flex-col items-start p-2 bg-white">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem><BreadcrumbLink>Home</BreadcrumbLink></BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem><BreadcrumbEllipsis /></BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem><BreadcrumbPage>Shoes</BreadcrumbPage></BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </View>
      );
    default:
      throw new Error("unknown section: " + which);
  }
}
