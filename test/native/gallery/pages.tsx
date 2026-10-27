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
  return (
    <View className="flex-col gap-2">
      <View className="flex-row items-center gap-2">
        <Avatar size="sm">AK</Avatar>
        <Avatar>AK</Avatar>
        <Avatar size="lg">AK</Avatar>
      </View>
      <Label>Team</Label>
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

/** The theme page: all twelve native components on one surface. The toggle is a state change of the provider. */
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
  return (
    <View className={T["theme.page"]}>
      <View className="flex-row gap-4">
        <View className="flex-col gap-2 w-[216px]">
          <View className="flex-row items-center gap-2">
            <Button onPress={() => setTheme(theme === "light" ? "dark" : "light")}>{theme === "light" ? "Dark" : "Light"}</Button>
            <Dialog>
              <DialogTrigger>Edit</DialogTrigger>
            </Dialog>
          </View>
          <View className="flex-row gap-1">
            <Badge>Stable</Badge>
            <Badge variant="secondary">Beta</Badge>
            <Badge variant="destructive">Failed</Badge>
          </View>
          <Input placeholder="Name" value="" onChange={() => {}} />
          <Card>
            <CardHeader><CardTitle>Account</CardTitle><CardDescription>Plan renews monthly</CardDescription></CardHeader>
          </Card>
        </View>
        <View className="flex-col gap-2 w-[216px]">
          <Tabs defaultValue="Overview">
            <TabsList>
              <TabsTrigger value="Overview">Overview</TabsTrigger>
              <TabsTrigger value="Usage">Usage</TabsTrigger>
            </TabsList>
            <TabsContent value="Overview">Usage this month</TabsContent>
          </Tabs>
          <Separator />
          <View className="flex-row items-center gap-2">
            <Avatar size="sm">AK</Avatar>
            <Avatar>AK</Avatar>
            <Spinner />
            <Label>Loading</Label>
          </View>
          <View className="flex-row items-center gap-2">
            <Skeleton shape="circle" />
            <View className="flex-col gap-2"><Skeleton /></View>
          </View>
        </View>
      </View>
      <View className="flex-row items-center gap-2">
        <Progress value={60} />
        <Label>60%</Label>
      </View>
    </View>
  );
}
