// The five gallery pages: one per native component family. Each page is a 480x272 frame with a title bar.
// Page roots carry debugName page-N so the judge can find them. Hidden pages are display:none.
import type { ReactNode } from "react";
import { Text, View } from "../../../src/index.ts";
import { Button } from "../../../src/native/button.tsx";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../../../src/native/card.tsx";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogTitle, DialogTrigger } from "../../../src/native/dialog.tsx";
import { Input, Textarea } from "../../../src/native/input.tsx";
import { Label } from "../../../src/native/label.tsx";
import { Badge } from "../../../src/native/badge.tsx";
import { Separator } from "../../../src/native/separator.tsx";
import { Avatar } from "../../../src/native/avatar.tsx";
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../../src/native/tabs.tsx";

export function PageFrame(props: { index: number; total: number; name: string; active: boolean; children?: ReactNode }) {
  const num = String(props.index).padStart(2, "0");
  const of = String(props.total).padStart(2, "0");
  return (
    <View debugName={"page-" + props.index} className="w-full h-full flex-col bg-white" style={{ display: props.active ? "flex" : "none" }}>
      <View className="w-full flex-row items-center px-2 bg-slate-900" style={{ height: 20 }}>
        <Text className="text-xs font-bold text-white">{num + "/" + of + " " + props.name}</Text>
      </View>
      <View className="w-full flex-col gap-2 p-2">{props.children}</View>
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
        <Avatar size="sm">JG</Avatar>
        <Avatar>JG</Avatar>
        <Avatar size="lg">JG</Avatar>
      </View>
      <Label>Team</Label>
    </View>
  );
}
