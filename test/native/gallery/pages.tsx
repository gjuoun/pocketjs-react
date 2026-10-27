// The gallery pages: one per native component, plus the theme page. Each page is a 480x272 frame with a title bar.
// Page roots carry debugName page-N so the judge can find them. Hidden pages are display:none.
import type { ReactNode } from "react";
import { Text, View } from "../../../src/index.ts";
import { Button } from "../../../src/native/button.tsx";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../../../src/native/card.tsx";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogTitle, DialogTrigger } from "../../../src/native/dialog.tsx";
import { Input, Textarea } from "../../../src/native/input.tsx";
import { ThemeProvider, useTheme, useTokens } from "../../../src/native/theme.tsx";
import type { ThemeName } from "../../../src/native/tokens.ts";
import { Label } from "../../../src/native/label.tsx";
import { Badge } from "../../../src/native/badge.tsx";
import { Separator } from "../../../src/native/separator.tsx";
import { Avatar } from "../../../src/native/avatar.tsx";
import { Progress } from "../../../src/native/progress.tsx";
import { Skeleton } from "../../../src/native/skeleton.tsx";
import { Spinner } from "../../../src/native/spinner.tsx";
import { Checkbox } from "../../../src/native/checkbox.tsx";
import { Switch } from "../../../src/native/switch.tsx";
import { RadioGroup, RadioItem } from "../../../src/native/radio.tsx";
import { Select } from "../../../src/native/select.tsx";
import { Slider } from "../../../src/native/slider.tsx";
import { Accordion, AccordionItem } from "../../../src/native/accordion.tsx";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../../src/native/tabs.tsx";
import { useState } from "react";

export function PageFrame(props: { index: number; total: number; name: string; active: boolean; flush?: boolean; children?: ReactNode }) {
  const num = String(props.index).padStart(2, "0");
  const of = String(props.total).padStart(2, "0");
  return (
    <View debugName={"page-" + props.index} className="w-full h-full flex-col bg-white" style={{ display: props.active ? "flex" : "none" }}>
      <View className="w-full flex-row items-center px-2 bg-slate-900" style={{ height: 20 }}>
        <Text className="text-xs font-bold text-white">{num + "/" + of + " " + props.name}</Text>
      </View>
      <View className={props.flush ? "w-full h-[252px] flex-col" : "w-full flex-col gap-2 p-2"}>{props.children}</View>
    </View>
  );
}

export function ButtonPage(props: { presses: number; onPress: () => void }) {
  return (
    <View className="flex-col gap-2">
      <View className="flex-row gap-2">
        <Button onPress={props.onPress}>Default</Button>
        <Button variant="secondary">Secondary</Button>
        <Button variant="destructive">Destructive</Button>
      </View>
      <View className="flex-row gap-2">
        <Button variant="outline">Outline</Button>
        <Button variant="ghost">Ghost</Button>
        <Button disabled>Disabled</Button>
      </View>
      <Text className="text-sm text-slate-900">{"Presses: " + props.presses}</Text>
    </View>
  );
}

export function FieldPage(props: { name: string; notes: string; onName: (v: string) => void; onNotes: (v: string) => void }) {
  return (
    <View className="flex-col gap-2">
      <Input placeholder="Name" value={props.name} onChange={props.onName} />
      <Textarea placeholder="Notes" value={props.notes} onChange={props.onNotes} />
    </View>
  );
}

export function CardPage() {
  return (
    <Card>
      <CardHeader><CardTitle>Account</CardTitle><CardDescription>Manage your details</CardDescription></CardHeader>
      <CardContent><CardDescription>Your plan renews monthly.</CardDescription></CardContent>
      <CardFooter><Button variant="outline">Cancel</Button><Button>Save</Button></CardFooter>
    </Card>
  );
}

export function DialogPage() {
  return (
    <Dialog>
      <DialogTrigger>Open dialog</DialogTrigger>
      <DialogContent>
        <DialogTitle>Edit profile</DialogTitle>
        <DialogDescription>Make changes here.</DialogDescription>
        <DialogFooter><DialogClose>Close</DialogClose><Button>Save changes</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function TabsPage() {
  return (
    <Tabs defaultValue="Account">
      <TabsList>
        <TabsTrigger value="Account">Account</TabsTrigger>
        <TabsTrigger value="Password">Password</TabsTrigger>
        <TabsTrigger value="Billing">Billing</TabsTrigger>
      </TabsList>
      <TabsContent value="Account">Account settings here</TabsContent>
      <TabsContent value="Password">Password settings here</TabsContent>
      <TabsContent value="Billing">Billing details here</TabsContent>
    </Tabs>
  );
}

export function LabelPage() {
  const [dimmed, setDimmed] = useState(false);
  return (
    <View className="flex-col gap-2">
      <Label>Email address</Label>
      <Label disabled>Account number</Label>
      <Label disabled={dimmed}>Nickname</Label>
      <Button variant="outline" onPress={() => setDimmed(!dimmed)}>{dimmed ? "Restore nickname" : "Dim nickname"}</Button>
    </View>
  );
}

export function BadgePage() {
  return (
    <View className="flex-col gap-2">
      <View className="flex-row gap-2">
        <Badge>Stable</Badge>
        <Badge variant="secondary">Beta</Badge>
        <Badge variant="destructive">Failed</Badge>
        <Badge variant="outline">Draft</Badge>
      </View>
      <Label>Release channel</Label>
    </View>
  );
}

export function SeparatorPage() {
  return (
    <View className="flex-col gap-2">
      <Label>Profile</Label>
      <Separator />
      <Label>Billing</Label>
      <View className="flex-row items-center h-8 gap-2">
        <Label>Home</Label>
        <Separator orientation="vertical" />
        <Label>Docs</Label>
      </View>
    </View>
  );
}

export function AvatarPage() {
  const [missing, setMissing] = useState("");
  return (
    <View className="flex-col gap-2">
      <View className="flex-row items-center gap-2">
        <Avatar size="sm">AK</Avatar>
        <Avatar>AK</Avatar>
        <Avatar size="lg">AK</Avatar>
      </View>
      <View className="flex-row items-center gap-2">
        <Avatar src="team/ak.png" onImageMissing={setMissing}>AK</Avatar>
        <Label>{missing ? "No image built: " + missing + ", initials shown" : "Team"}</Label>
      </View>
    </View>
  );
}

export function ProgressPage() {
  const [value, setValue] = useState(30);
  return (
    <View className="flex-col gap-2">
      <Progress value={value} />
      <Label>{value + "%"}</Label>
      <Button variant="outline" onPress={() => setValue(Math.min(100, value + 10))}>Add 10%</Button>
    </View>
  );
}

export function SkeletonPage() {
  return (
    <View className="flex-row items-center gap-2">
      <Skeleton shape="circle" />
      <View className="flex-col gap-2">
        <Skeleton />
        <Skeleton shape="short" />
      </View>
    </View>
  );
}

export function SpinnerPage() {
  return (
    <View className="flex-col gap-2">
      <View className="flex-row items-center gap-2"><Spinner size="sm" /><Label>Loading</Label></View>
      <View className="flex-row items-center gap-2"><Spinner /><Label>Saving</Label></View>
      <View className="flex-row items-center gap-2"><Spinner size="lg" /><Label>Syncing</Label></View>
      <Label>Eight steps of 45 degrees, one step every 5 frames</Label>
    </View>
  );
}

export function CheckboxPage() {
  const [email, setEmail] = useState(false);
  const [terms, setTerms] = useState(true);
  return (
    <View className="flex-col gap-2">
      <Checkbox checked={email} onCheckedChange={setEmail}>Email me updates</Checkbox>
      <Checkbox checked={terms} onCheckedChange={setTerms}>Accept terms</Checkbox>
      <Checkbox checked="indeterminate">Select all</Checkbox>
      <Checkbox checked disabled>Locked on</Checkbox>
      <Checkbox disabled>Locked off</Checkbox>
      <Label>{"Email " + (email ? "on" : "off")}</Label>
    </View>
  );
}

export function SwitchPage() {
  const [airplane, setAirplane] = useState(false);
  const [sync, setSync] = useState(true);
  return (
    <View className="flex-col gap-2">
      <Switch checked={airplane} onCheckedChange={setAirplane}>Airplane mode</Switch>
      <Switch checked={sync} onCheckedChange={setSync}>Sync on Wi-Fi</Switch>
      <Switch checked disabled>Locked on</Switch>
      <Switch disabled>Locked off</Switch>
      <Label>{"Airplane mode " + (airplane ? "on" : "off")}</Label>
    </View>
  );
}

export function RadioPage() {
  const [plan, setPlan] = useState("monthly");
  const [size, setSize] = useState("m");
  return (
    <View className="flex-col gap-2">
      <RadioGroup value={plan} onValueChange={setPlan}>
        <RadioItem value="monthly">Monthly</RadioItem>
        <RadioItem value="yearly">Yearly</RadioItem>
        <RadioItem value="lifetime" disabled>Lifetime</RadioItem>
      </RadioGroup>
      <RadioGroup value={size} onValueChange={setSize} orientation="horizontal">
        <RadioItem value="s">Small</RadioItem>
        <RadioItem value="m">Medium</RadioItem>
        <RadioItem value="l">Large</RadioItem>
      </RadioGroup>
      <Label>{"Plan " + plan + ", size " + size}</Label>
    </View>
  );
}

export function SelectPage() {
  const [plan, setPlan] = useState("monthly");
  return (
    <View className="flex-col gap-2">
      <Select
        value={plan}
        onValueChange={setPlan}
        options={[
          { value: "monthly", label: "Per month" },
          { value: "yearly", label: "Per year" },
          { value: "weekly", label: "Per week" },
        ]}
      />
      <Label>{"Billing " + plan}</Label>
    </View>
  );
}

export function SliderPage() {
  const [volume, setVolume] = useState(40);
  return (
    <View className="flex-col gap-2">
      <Slider value={volume} onValueChange={setVolume}>Volume</Slider>
      <Slider value={70}>Brightness</Slider>
      <Label>{"Volume at " + volume}</Label>
    </View>
  );
}

export function AccordionPage() {
  const [open, setOpen] = useState<string[]>([]);
  return (
    <View className="flex-col gap-2">
      <Accordion type="multiple" value={open} onValueChange={(v) => setOpen(Array.isArray(v) ? v : [v])}>
        <AccordionItem value="shipping" title="Shipping">{["Ships in 2 days.", "Free over $50."]}</AccordionItem>
        <AccordionItem value="returns" title="Returns">{"30 days, unused items."}</AccordionItem>
        <AccordionItem value="warranty" title="Warranty">{"One year on parts."}</AccordionItem>
      </Accordion>
    </View>
  );
}

/** The theme page: all eighteen native components on one 480 by 252 surface, in four bands. The toggle is a state change
 * of the provider, so every component under it re-renders with the other table. Sizes are the components' own tokens: the
 * page is sized so nothing shrinks (a squeezed row drew its badges and avatars at 15 px before this layout). */
export function ThemePage() {
  const [theme, setTheme] = useState<ThemeName>("light");
  return (
    <ThemeProvider theme={theme} onThemeChange={setTheme}>
      <ThemeBody />
    </ThemeProvider>
  );
}

function ThemeBody() {
  const T = useTokens() as Record<string, string>;
  const { theme, setTheme } = useTheme();
  const [checked, setChecked] = useState(true);
  const [sync, setSync] = useState(false);
  const [answer, setAnswer] = useState("yes");
  const [option, setOption] = useState("monthly");
  const [volume, setVolume] = useState(40);
  return (
    <View className={T["theme.page"]}>
      <View className="flex-row items-center gap-2">
        <Button onPress={() => setTheme(theme === "light" ? "dark" : "light")}>{theme === "light" ? "Dark" : "Light"}</Button>
        <Dialog>
          <DialogTrigger>Edit</DialogTrigger>
        </Dialog>
        <Badge>Stable</Badge>
        <Badge variant="secondary">Beta</Badge>
        <Badge variant="destructive">Failed</Badge>
      </View>
      <View className="flex-row items-center gap-2">
        <Select
          value={option}
          onValueChange={setOption}
          options={[
            { value: "monthly", label: "Per month" },
            { value: "yearly", label: "Per year" },
          ]}
        />
        <Slider value={volume} onValueChange={setVolume} />
      </View>
      <View className="flex-row items-center gap-2">
        <Progress value={60} />
        <Label>60%</Label>
      </View>
      <View className="flex-row gap-2">
        <View className="flex-col gap-2 w-[110px]">
          <Input placeholder="Name" value="" onChange={() => {}} />
          <Card>
            <CardHeader><CardTitle>Account</CardTitle></CardHeader>
          </Card>
        </View>
        <View className="flex-col gap-2 w-[110px]">
          <Tabs defaultValue="Info">
            <TabsList>
              <TabsTrigger value="Info">Info</TabsTrigger>
              <TabsTrigger value="Use">Use</TabsTrigger>
            </TabsList>
          </Tabs>
          <Separator />
          <View className="flex-row items-center gap-2">
            <Avatar>AK</Avatar>
            <Avatar>AK</Avatar>
            <Spinner size="sm" />
          </View>
          <Skeleton />
        </View>
        <View className="flex-col gap-2 w-[110px]">
          <Checkbox checked={checked} onCheckedChange={setChecked}>Email</Checkbox>
          <RadioGroup value={answer} onValueChange={setAnswer}>
            <RadioItem value="yes">Yes</RadioItem>
            <RadioItem value="no">No</RadioItem>
          </RadioGroup>
        </View>
        <View className="flex-col gap-2 w-[110px]">
          <Accordion type="multiple">
            <AccordionItem value="shipping" title="Shipping">{"Ships in 2 days."}</AccordionItem>
            <AccordionItem value="returns" title="Returns">{"30 days."}</AccordionItem>
          </Accordion>
          <Switch checked={sync} onCheckedChange={setSync}>Sync</Switch>
        </View>
      </View>
    </View>
  );
}
