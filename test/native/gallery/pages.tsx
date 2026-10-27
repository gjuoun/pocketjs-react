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
import { Sidebar, type SidebarGroup } from "../../../src/native/sidebar.tsx";
import { Slider } from "../../../src/native/slider.tsx";
import { Accordion, AccordionItem } from "../../../src/native/accordion.tsx";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../../src/native/tabs.tsx";
import { Popover, PopoverContent, PopoverTrigger } from "../../../src/native/popover.tsx";
import { Tooltip, TooltipContent, TooltipTrigger } from "../../../src/native/tooltip.tsx";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "../../../src/native/dropdown-menu.tsx";
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetFooter, SheetTitle, SheetTrigger } from "../../../src/native/sheet.tsx";
import { Toaster, toast } from "../../../src/native/toast.tsx";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../../src/native/table.tsx";
import { useState } from "react";
import { Breadcrumb } from "../../../src/native/breadcrumb.tsx";
import { Alert } from "../../../src/native/alert.tsx";
import { Empty } from "../../../src/native/empty.tsx";
import { Field } from "../../../src/native/field.tsx";
import { Pagination } from "../../../src/native/pagination.tsx";
import { InputOTP } from "../../../src/native/input-otp.tsx";
import { NavigationMenu, NavigationMenuContent, NavigationMenuItem, NavigationMenuLabel, NavigationMenuLink, NavigationMenuList, NavigationMenuTrigger } from "../../../src/native/navigation-menu.tsx";
import { Command, type CommandGroup } from "../../../src/native/command.tsx";

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
      <Label disabled={dimmed}>{dimmed ? "Nickname (dimmed)" : "Nickname"}</Label>
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

// The sidebar's groups: the page and the mutant controls read the same list.
export const SIDEBAR_GROUPS: SidebarGroup[] = [
  { heading: "Workspace", items: [{ value: "home", label: "Home", icon: "H" }, { value: "inbox", label: "Inbox", icon: "I" }, { value: "projects", label: "Projects", icon: "P" }] },
  { heading: "Account", items: [{ value: "settings", label: "Settings", icon: "S" }] },
];

export function SidebarPage() {
  const [section, setSection] = useState("home");
  const [collapsed, setCollapsed] = useState(false);
  const label = SIDEBAR_GROUPS.flatMap((g) => g.items).find((i) => i.value === section)?.label ?? "";
  return (
    <View className="flex-row gap-2 items-start">
      <Sidebar groups={SIDEBAR_GROUPS} value={section} onValueChange={setSection} collapsed={collapsed} onCollapsedChange={setCollapsed} />
      <View className="flex-col gap-2 flex-1">
        <Label>{"Section " + label}</Label>
        <Label>{collapsed ? "Rail collapsed" : "Rail expanded"}</Label>
      </View>
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

export function SheetPage() {
  const [saved, setSaved] = useState(0);
  return (
    <View className="flex-col gap-2">
      <Sheet>
        <SheetTrigger>Open sheet</SheetTrigger>
        <SheetContent side="right" size={75}>
          <SheetTitle>Account</SheetTitle>
          <SheetDescription>Edit your details here.</SheetDescription>
          <SheetFooter><SheetClose>Close</SheetClose><Button onPress={() => setSaved(saved + 1)}>Save</Button></SheetFooter>
        </SheetContent>
      </Sheet>
      <Label>{"Saved " + saved}</Label>
      <Label>Docked right, 75 percent of the screen</Label>
    </View>
  );
}

export function PopoverPage() {
  const [sent, setSent] = useState("");
  return (
    <View className="flex-col gap-2">
      <Popover>
        <PopoverTrigger>Share</PopoverTrigger>
        <PopoverContent>
          <Button onPress={() => setSent("link")}>Copy link</Button>
          <Button variant="outline" onPress={() => setSent("email")}>Email</Button>
        </PopoverContent>
      </Popover>
      <Label>{sent ? "Sent by " + sent : "Nothing sent"}</Label>
    </View>
  );
}

export function TooltipPage() {
  return (
    <View className="flex-col gap-2">
      <Tooltip>
        <TooltipTrigger>Draft hint</TooltipTrigger>
        <TooltipContent>Saves the draft</TooltipContent>
      </Tooltip>
      <Label>Focus the button to see its hint</Label>
    </View>
  );
}

export function DropdownMenuPage() {
  const [picked, setPicked] = useState("none");
  return (
    <View className="flex-col gap-2">
      <DropdownMenu onSelect={setPicked}>
        <DropdownMenuTrigger>Actions</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuLabel>Document</DropdownMenuLabel>
          <DropdownMenuItem value="edit">Edit</DropdownMenuItem>
          <DropdownMenuItem value="duplicate">Duplicate</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem value="archive" disabled>Archive</DropdownMenuItem>
          <DropdownMenuItem value="delete">Delete</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <Label>{"Chosen: " + picked}</Label>
    </View>
  );
}

export function ToastPage() {
  const [n, setN] = useState(0);
  return (
    <View className="flex-col gap-2">
      <Button onPress={() => { setN(n + 1); toast("Saved " + (n + 1)); }}>Notify</Button>
      <Label>{"Notified " + n}</Label>
      <Toaster limit={2} />
    </View>
  );
}

export function TablePage() {
  return (
    <View className="flex-col gap-2">
      <Table columns={[{ width: 150 }, { width: 70, align: "right" }, { width: 70, align: "right" }]} rows="zebra">
        <TableHeader>
          <TableRow><TableHead>Plan</TableHead><TableHead>Seats</TableHead><TableHead>Price</TableHead></TableRow>
        </TableHeader>
        <TableBody>
          <TableRow><TableCell>Starter</TableCell><TableCell>1</TableCell><TableCell>$4</TableCell></TableRow>
          <TableRow><TableCell>Team</TableCell><TableCell>10</TableCell><TableCell>$40</TableCell></TableRow>
          <TableRow><TableCell>Studio</TableCell><TableCell>25</TableCell><TableCell>$90</TableCell></TableRow>
        </TableBody>
      </Table>
      <Label>Zebra rows, right-aligned numbers</Label>
    </View>
  );
}

export function BreadcrumbPage() {
  const [picked, setPicked] = useState("none");
  return (
    <View className="flex-col gap-2">
      <Breadcrumb items={["Home", "Docs", "Guides", "Setup", "Usage", "Invoices"]} onSelect={(i) => setPicked(["Home", "Docs", "Guides", "Setup", "Usage", "Invoices"][i])} />
      <Label>{"Opened " + picked}</Label>
      <Label>Collapsed: the middle is one ellipsis; press it for the full trail</Label>
    </View>
  );
}

export function AlertPage() {
  const [dismissed, setDismissed] = useState(0);
  return (
    <View className="flex-col gap-2">
      <Alert variant="info" title="Update ready" icon={<View className="w-4 h-4 bg-blue-600" />} />
      <Alert variant="success" title="Saved" />
      <Alert variant="warning" title="Low disk space" />
      <Alert variant="destructive" title="Sync failed" dismissible onDismiss={() => setDismissed(dismissed + 1)} />
      <Label>{"Dismissed " + dismissed}</Label>
    </View>
  );
}

export function EmptyPage() {
  const [made, setMade] = useState(0);
  return (
    <View className="flex-col gap-2">
      <Empty
        icon={<View className="w-4 h-4 bg-slate-900" />}
        title="No projects yet"
        action={<Button variant="outline" size="sm" onPress={() => setMade(made + 1)}>Create project</Button>}
      >Projects you create show up here.</Empty>
      <Label>{"Created " + made}</Label>
    </View>
  );
}

export function FormFieldPage() {
  const [name, setName] = useState("");
  const [invalid, setInvalid] = useState(false);
  return (
    <View className="flex-col gap-2">
      <Field label="Name" hint="As on your ID"><Input placeholder="Full name" value={name} onChange={setName} /></Field>
      <Field label="Email" error={invalid ? "Enter a valid email." : undefined}><Input placeholder="name@mail" value="" onChange={() => {}} /></Field>
      <Button variant="outline" onPress={() => setInvalid(true)}>Validate</Button>
    </View>
  );
}

export function PaginationPage() {
  const [page, setPage] = useState(3);
  return (
    <View className="flex-col gap-2">
      <Pagination page={page} pageCount={10} onPageChange={setPage} />
      <Label>{"Page " + page + " of 10"}</Label>
    </View>
  );
}

export function InputOTPPage() {
  const [code, setCode] = useState("");
  const [verified, setVerified] = useState(0);
  return (
    <View className="flex-col gap-2">
      <InputOTP length={6} value={code} onChange={setCode} onComplete={() => setVerified(verified + 1)} />
      <Label>{code.length === 6 ? "Verified " + verified : "Enter the 6-digit code"}</Label>
    </View>
  );
}

export function NavigationPage() {
  const [picked, setPicked] = useState("none");
  return (
    <View className="flex-col gap-2">
      <NavigationMenu>
        <NavigationMenuList>
          <NavigationMenuItem value="products">
            <NavigationMenuTrigger>Products</NavigationMenuTrigger>
            <NavigationMenuContent>
              <NavigationMenuLabel>Shop by type</NavigationMenuLabel>
              <NavigationMenuLink value="hardware" onSelect={setPicked}>Hardware</NavigationMenuLink>
              <NavigationMenuLink value="software" onSelect={setPicked}>Software</NavigationMenuLink>
            </NavigationMenuContent>
          </NavigationMenuItem>
          <NavigationMenuItem value="support">
            <NavigationMenuTrigger>Support</NavigationMenuTrigger>
            <NavigationMenuContent>
              <NavigationMenuLink value="chat" onSelect={setPicked}>Chat</NavigationMenuLink>
            </NavigationMenuContent>
          </NavigationMenuItem>
        </NavigationMenuList>
      </NavigationMenu>
      <Label>{"Chosen: " + picked}</Label>
    </View>
  );
}

const COMMAND_GROUPS: CommandGroup[] = [
  { heading: "Suggestions", items: [{ value: "calendar", label: "Calendar" }, { value: "mail", label: "Mail" }] },
  { heading: "Tools", items: [{ value: "calc", label: "Calculator" }, { value: "notes", label: "Notes" }] },
];

export function CommandPage() {
  const [picked, setPicked] = useState("none");
  return (
    <View className="flex-row gap-2">
      <Command groups={COMMAND_GROUPS} onSelect={setPicked} />
      <Label>{"Selected " + picked}</Label>
    </View>
  );
}

/** The theme page: all thirty-two native components on one 480 by 252 surface. The top row (the triggers and the section
 * switch) is shared; the body is one of four sections of 204 px, shown one at a time. All four are mounted together, so one
 * theme toggle re-renders all thirty-two. Section 1 is the first twenty-four (the layout the page always had); sections 2 to 4
 * hold the eight later ones. The toggle, the section switch and each section's controls are judged by the native judge. */
export function ThemePage() {
  const [theme, setTheme] = useState<ThemeName>("light");
  return (
    <ThemeProvider theme={theme} onThemeChange={setTheme}>
      <ThemeBody />
    </ThemeProvider>
  );
}

const SECTIONS = 4;

function ThemeBody() {
  const T = useTokens() as Record<string, string>;
  const { theme, setTheme } = useTheme();
  const [section, setSection] = useState(0);
  const [checked, setChecked] = useState(true);
  const [sync, setSync] = useState(false);
  const [answer, setAnswer] = useState("yes");
  const [option, setOption] = useState("monthly");
  const [volume, setVolume] = useState(40);
  const [page, setPage] = useState(3);
  const [code, setCode] = useState("");
  const next = (section + 1) % SECTIONS;
  return (
    <View className={T["theme.page"]}>
      <View className="flex-row items-center gap-1">
        <Button onPress={() => setTheme(theme === "light" ? "dark" : "light")}>{theme === "light" ? "Dark" : "Light"}</Button>
        <Dialog>
          <DialogTrigger>Edit</DialogTrigger>
        </Dialog>
        <Sheet>
          <SheetTrigger>Sheet</SheetTrigger>
          <SheetContent side="right" size={75}>
            <SheetTitle>Account</SheetTitle>
          </SheetContent>
        </Sheet>
        <Popover>
          <PopoverTrigger>More</PopoverTrigger>
          <PopoverContent>
            <Button variant="outline">Copy link</Button>
          </PopoverContent>
        </Popover>
        <Tooltip>
          <TooltipTrigger>?</TooltipTrigger>
          <TooltipContent>Saves the draft</TooltipContent>
        </Tooltip>
        <DropdownMenu>
          <DropdownMenuTrigger>Menu</DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem value="rename">Rename</DropdownMenuItem>
            <DropdownMenuItem value="delete">Delete</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <NotifyButton />
        <Button variant="outline" size="sm" onPress={() => setSection(next)}>{(next + 1) + "/" + SECTIONS}</Button>
      </View>
      {section === 0 ? (
      <View className="w-full h-[204px] flex-col gap-2" debugName="theme-section-1">
        <View className="flex-row items-center gap-2">
          <Badge>Stable</Badge>
          <Badge variant="secondary">Beta</Badge>
          <Badge variant="destructive">Failed</Badge>
          <Progress value={60} />
          <Label>{theme + " 60%"}</Label>
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
        <View className="flex-row gap-1">
          <View className="flex-col gap-1 w-[110px]">
            <Input placeholder="Name" value="" onChange={() => {}} />
            <Card>
              <CardHeader><CardTitle>Account</CardTitle></CardHeader>
            </Card>
            <Skeleton />
          </View>
          <View className="flex-col gap-1 w-[110px]">
            <Tabs defaultValue="Info">
              <TabsList>
                <TabsTrigger value="Info">Info</TabsTrigger>
                <TabsTrigger value="Use">Use</TabsTrigger>
              </TabsList>
            </Tabs>
            <Separator />
            <View className="flex-row items-center gap-1">
              <Avatar>AK</Avatar>
              <Avatar>AK</Avatar>
              <Spinner size="sm" />
            </View>
            <Accordion type="multiple">
              <AccordionItem value="shipping" title="Shipping">{"Ships in 2 days."}</AccordionItem>
            </Accordion>
          </View>
          <View className="flex-col gap-1 w-[110px]">
            <Checkbox checked={checked} onCheckedChange={setChecked}>Email</Checkbox>
            <RadioGroup value={answer} onValueChange={setAnswer}>
              <RadioItem value="yes">Yes</RadioItem>
              <RadioItem value="no">No</RadioItem>
            </RadioGroup>
          </View>
          <View className="flex-col gap-1 w-[110px]">
            <Switch checked={sync} onCheckedChange={setSync}>Sync</Switch>
            <Table columns={[{ width: 110 }]}>
              <TableHeader>
                <TableRow><TableHead>Plan</TableHead></TableRow>
              </TableHeader>
              <TableBody>
                <TableRow><TableCell>Team</TableCell></TableRow>
              </TableBody>
            </Table>
          </View>
        </View>
      </View>) : null}
      {section === 1 ? (
      <View className="w-full h-[204px] flex-col gap-1" debugName="theme-section-2">
        <NavigationMenu>
          <NavigationMenuList>
            <NavigationMenuItem value="products">
              <NavigationMenuTrigger>Products</NavigationMenuTrigger>
              <NavigationMenuContent>
                <NavigationMenuLabel>Shop by type</NavigationMenuLabel>
                <NavigationMenuLink value="hardware">Hardware</NavigationMenuLink>
              </NavigationMenuContent>
            </NavigationMenuItem>
            <NavigationMenuItem value="support">
              <NavigationMenuTrigger>Support</NavigationMenuTrigger>
              <NavigationMenuContent>
                <NavigationMenuLink value="chat">Chat</NavigationMenuLink>
              </NavigationMenuContent>
            </NavigationMenuItem>
          </NavigationMenuList>
        </NavigationMenu>
        <Breadcrumb items={["Home", "Docs", "Guides", "Setup", "Usage", "Invoices"]} />
        <Pagination page={page} pageCount={10} onPageChange={setPage} />
        <InputOTP length={6} value={code} onChange={setCode} />
        <Alert variant="info" title="Update ready" />
      </View>) : null}
      {section === 2 ? (
      <View className="w-full h-[204px] flex-row gap-2" debugName="theme-section-3">
        <View className="flex-col gap-2 w-[216px]">
          <Field label="Email" hint="Optional"><Input placeholder="name@mail" value="" onChange={() => {}} /></Field>
          <Alert variant="destructive" title="Sync failed" dismissible />
        </View>
        <Command groups={THEME_GROUPS} />
      </View>) : null}
      {section === 3 ? (
      <View className="w-full h-[204px] flex-col gap-2" debugName="theme-section-4">
        <View className="w-[300px]">
          <Empty
            icon={<View className="w-4 h-4 bg-slate-900" />}
            title="No projects yet"
            action={<Button variant="outline" size="sm">Create project</Button>}
          >Projects you create show up here.</Empty>
        </View>
      </View>) : null}
    </View>
  );
}

const THEME_GROUPS: CommandGroup[] = [
  { heading: "Suggestions", items: [{ value: "calendar", label: "Calendar" }] },
  { heading: "Tools", items: [{ value: "calc", label: "Calculator" }] },
];

/** The Notify trigger: each press queues a toast; the host is outside the page flow. */
function NotifyButton() {
  const [n, setN] = useState(0);
  return (
    <>
      <Button onPress={() => { setN(n + 1); toast("Saved " + (n + 1)); }}>Notify</Button>
      <Toaster limit={2} />
    </>
  );
}
