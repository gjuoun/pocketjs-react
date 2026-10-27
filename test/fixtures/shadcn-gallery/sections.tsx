// The 61 section bodies: each vendored component's default usage, as a shadcn consumer writes it (the
// shapes match test/fixtures/shadcn-full/probes). Overlays are CLOSED by default: an open dialog, sheet or
// drawer is a full-screen layer and would cover the page, so each one shows its trigger and holds its
// open state here (useState + onOpenChange). The chart is a placeholder child: the recharts shim throws on
// Bar/Line/Axis, so no series is rendered.

import { useForm } from "pocketjs-react/react-hook-form";
import { toast } from "pocketjs-react/sonner";
import type { ReactElement } from "react";
import { useState } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "../shadcn-full/ui/accordion.tsx";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "../shadcn-full/ui/alert.tsx";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "../shadcn-full/ui/alert-dialog.tsx";
import { AspectRatio } from "../shadcn-full/ui/aspect-ratio.tsx";
import {
  Attachment,
  AttachmentContent,
  AttachmentDescription,
  AttachmentMedia,
  AttachmentTitle,
} from "../shadcn-full/ui/attachment.tsx";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "../shadcn-full/ui/avatar.tsx";
import { Badge } from "../shadcn-full/ui/badge.tsx";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "../shadcn-full/ui/breadcrumb.tsx";
import {
  Bubble,
  BubbleContent,
  BubbleGroup,
} from "../shadcn-full/ui/bubble.tsx";
import { Button } from "../shadcn-full/ui/button.tsx";
import {
  ButtonGroup,
  ButtonGroupSeparator,
} from "../shadcn-full/ui/button-group.tsx";
import { Calendar } from "../shadcn-full/ui/calendar.tsx";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "../shadcn-full/ui/card.tsx";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "../shadcn-full/ui/carousel.tsx";
import { ChartContainer } from "../shadcn-full/ui/chart.tsx";
import { Checkbox } from "../shadcn-full/ui/checkbox.tsx";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "../shadcn-full/ui/collapsible.tsx";
import {
  Combobox,
  ComboboxContent,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "../shadcn-full/ui/combobox.tsx";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "../shadcn-full/ui/command.tsx";
import {
  ContextMenu,
  ContextMenuCheckboxItem,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuTrigger,
} from "../shadcn-full/ui/context-menu.tsx";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../shadcn-full/ui/dialog.tsx";
import { DirectionProvider } from "../shadcn-full/ui/direction.tsx";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "../shadcn-full/ui/drawer.tsx";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "../shadcn-full/ui/dropdown-menu.tsx";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "../shadcn-full/ui/empty.tsx";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "../shadcn-full/ui/field.tsx";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../shadcn-full/ui/form.tsx";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "../shadcn-full/ui/hover-card.tsx";
import { Input } from "../shadcn-full/ui/input.tsx";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
  InputGroupText,
} from "../shadcn-full/ui/input-group.tsx";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
} from "../shadcn-full/ui/input-otp.tsx";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemMedia,
  ItemSeparator,
  ItemTitle,
} from "../shadcn-full/ui/item.tsx";
import { Kbd, KbdGroup } from "../shadcn-full/ui/kbd.tsx";
import { Label } from "../shadcn-full/ui/label.tsx";
import { Marker, MarkerContent } from "../shadcn-full/ui/marker.tsx";
import {
  Menubar,
  MenubarCheckboxItem,
  MenubarContent,
  MenubarItem,
  MenubarMenu,
  MenubarSeparator,
  MenubarShortcut,
  MenubarTrigger,
} from "../shadcn-full/ui/menubar.tsx";
import {
  Message,
  MessageAvatar,
  MessageContent,
  MessageFooter,
  MessageGroup,
  MessageHeader,
} from "../shadcn-full/ui/message.tsx";
import {
  MessageScroller,
  MessageScrollerButton,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerViewport,
} from "../shadcn-full/ui/message-scroller.tsx";
import {
  NativeSelect,
  NativeSelectOptGroup,
  NativeSelectOption,
} from "../shadcn-full/ui/native-select.tsx";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "../shadcn-full/ui/navigation-menu.tsx";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "../shadcn-full/ui/pagination.tsx";
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "../shadcn-full/ui/popover.tsx";
import { Progress } from "../shadcn-full/ui/progress.tsx";
import { RadioGroup, RadioGroupItem } from "../shadcn-full/ui/radio-group.tsx";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "../shadcn-full/ui/resizable.tsx";
import { ScrollArea, ScrollBar } from "../shadcn-full/ui/scroll-area.tsx";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "../shadcn-full/ui/select.tsx";
import { Separator } from "../shadcn-full/ui/separator.tsx";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "../shadcn-full/ui/sheet.tsx";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "../shadcn-full/ui/sidebar.tsx";
import { Skeleton } from "../shadcn-full/ui/skeleton.tsx";
import { Slider } from "../shadcn-full/ui/slider.tsx";
import { Toaster } from "../shadcn-full/ui/sonner.tsx";
import { Spinner } from "../shadcn-full/ui/spinner.tsx";
import { Switch } from "../shadcn-full/ui/switch.tsx";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "../shadcn-full/ui/table.tsx";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../shadcn-full/ui/tabs.tsx";
import { Textarea } from "../shadcn-full/ui/textarea.tsx";
import { Toggle } from "../shadcn-full/ui/toggle.tsx";
import {
  ToggleGroup,
  ToggleGroupItem,
} from "../shadcn-full/ui/toggle-group.tsx";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../shadcn-full/ui/tooltip.tsx";
import type { SectionName } from "./layout.ts";

const FRUITS = ["Apple", "Banana", "Cherry"];
const ROWS = Array.from({ length: 10 }, (_, i) => `Row ${i}`);
const CHART = {
  desktop: { label: "Desktop", color: "#0f172a" },
  mobile: { label: "Mobile", color: "#dc2626" },
};

function AccordionBody() {
  return (
    <Accordion type="single" collapsible defaultValue="a">
      <AccordionItem value="a">
        <AccordionTrigger>Is it accessible?</AccordionTrigger>
        <AccordionContent>
          Yes. It follows the WAI-ARIA pattern.
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value="b">
        <AccordionTrigger>Is it styled?</AccordionTrigger>
        <AccordionContent>Yes, with the shadcn defaults.</AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}

function AlertDialogBody() {
  const [open, setOpen] = useState(false);
  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="destructive" size="sm">
          Delete project
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction>Continue</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function AlertBody() {
  return (
    <Alert>
      <AlertTitle>Heads up</AlertTitle>
      <AlertDescription>Your session expires in five minutes.</AlertDescription>
    </Alert>
  );
}

function AspectRatioBody() {
  return (
    <div className="w-[200px]">
      <AspectRatio ratio={16 / 9}>
        <div className="w-full h-full bg-slate-200 flex-col items-center justify-center">
          <span className="text-xs">16:9</span>
        </div>
      </AspectRatio>
    </div>
  );
}

function AttachmentBody() {
  return (
    <Attachment>
      <AttachmentMedia>PDF</AttachmentMedia>
      <AttachmentContent>
        <AttachmentTitle>report.pdf</AttachmentTitle>
        <AttachmentDescription>12 KB</AttachmentDescription>
      </AttachmentContent>
    </Attachment>
  );
}

function AvatarBody() {
  return (
    <div className="flex-row items-center gap-2">
      <Avatar>
        <AvatarImage src="a.png" />
        <AvatarFallback>JG</AvatarFallback>
      </Avatar>
      <Avatar>
        <AvatarFallback>XY</AvatarFallback>
      </Avatar>
    </div>
  );
}

function BadgeBody() {
  return (
    <div className="flex-row items-center gap-2">
      <Badge>Default</Badge>
      <Badge variant="secondary">Secondary</Badge>
      <Badge variant="destructive">Destructive</Badge>
      <Badge variant="outline">Outline</Badge>
    </div>
  );
}

function BreadcrumbBody() {
  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink href="#">Home</BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <BreadcrumbPage>Data</BreadcrumbPage>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  );
}

function BubbleBody() {
  return (
    <BubbleGroup>
      <Bubble>
        <BubbleContent>Hello</BubbleContent>
      </Bubble>
      <Bubble>
        <BubbleContent>Hi there</BubbleContent>
      </Bubble>
    </BubbleGroup>
  );
}

function ButtonGroupBody() {
  return (
    <ButtonGroup>
      <Button variant="outline">One</Button>
      <ButtonGroupSeparator />
      <Button variant="outline">Two</Button>
      <Button variant="outline">Three</Button>
    </ButtonGroup>
  );
}

function ButtonBody() {
  return (
    <div className="flex-col gap-2">
      <div className="flex-row gap-2">
        <Button>Default</Button>
        <Button variant="destructive">Destructive</Button>
        <Button variant="outline">Outline</Button>
      </div>
      <div className="flex-row gap-2">
        <Button variant="secondary">Secondary</Button>
        <Button variant="ghost">Ghost</Button>
        <Button variant="link">Link</Button>
      </div>
      <div className="flex-row items-center gap-2">
        <Button size="xs">XS</Button>
        <Button size="sm">Small</Button>
        <Button size="lg">Large</Button>
      </div>
    </div>
  );
}

function CalendarBody() {
  return <Calendar mode="single" selected={new Date(2026, 9, 26)} />;
}

function CardBody() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Create project</CardTitle>
        <CardDescription>Deploy in one click.</CardDescription>
        <CardAction>Edit</CardAction>
      </CardHeader>
      <CardContent>Body text</CardContent>
      <CardFooter>Footer</CardFooter>
    </Card>
  );
}

function CarouselBody() {
  return (
    <Carousel className="w-full flex-col">
      <CarouselContent className="w-full">
        {["One", "Two", "Three"].map((t) => (
          <CarouselItem key={t}>
            <div className="h-[60px] w-full bg-slate-200 flex-col items-center justify-center">
              <span className="text-sm font-bold">{t}</span>
            </div>
          </CarouselItem>
        ))}
      </CarouselContent>
      <CarouselPrevious className="top-[14px]" />
      <CarouselNext className="top-[14px]" />
    </Carousel>
  );
}

function ChartBody() {
  return (
    <ChartContainer config={CHART} className="w-full h-[120px]">
      <div className="flex-row items-end gap-2 w-full h-[110px]">
        <div className="w-[40px] h-[40px] bg-slate-900" />
        <div className="w-[40px] h-[70px] bg-slate-900" />
        <div className="w-[40px] h-[55px] bg-red-600" />
        <div className="w-[40px] h-[95px] bg-red-600" />
      </div>
    </ChartContainer>
  );
}

function CheckboxBody() {
  return (
    <div className="flex-row items-center gap-2">
      <Checkbox defaultChecked />
      <Checkbox />
    </div>
  );
}

function CollapsibleBody() {
  return (
    <Collapsible defaultOpen>
      <CollapsibleTrigger>Show more</CollapsibleTrigger>
      <CollapsibleContent>Hidden details, now visible.</CollapsibleContent>
    </Collapsible>
  );
}

function ComboboxBody() {
  return (
    <Combobox>
      <ComboboxInput placeholder="Pick a fruit" />
      <ComboboxContent>
        <ComboboxList>
          {FRUITS.map((f) => (
            <ComboboxItem key={f} value={f}>
              {f}
            </ComboboxItem>
          ))}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}

function CommandBody() {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex-col gap-2">
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        Open palette
      </Button>
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Type a command" />
        <CommandList>
          <CommandEmpty>No results.</CommandEmpty>
          <CommandGroup heading="Suggestions">
            <CommandItem>Calendar</CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>
      <Command className="h-[180px]">
        <CommandInput placeholder="Search" />
        <CommandList>
          <CommandEmpty>None</CommandEmpty>
          <CommandGroup heading="Suggestions">
            <CommandItem>
              Calendar<CommandShortcut>Ctrl K</CommandShortcut>
            </CommandItem>
            <CommandItem>Search</CommandItem>
            <CommandSeparator />
          </CommandGroup>
        </CommandList>
      </Command>
    </div>
  );
}

function ContextMenuBody() {
  const [open, setOpen] = useState(false);
  return (
    <ContextMenu open={open} onOpenChange={setOpen}>
      <ContextMenuTrigger>
        <Button variant="outline" size="sm">
          Right-click area
        </Button>
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuLabel>Edit</ContextMenuLabel>
        <ContextMenuItem>
          Copy<ContextMenuShortcut>Ctrl C</ContextMenuShortcut>
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuCheckboxItem checked>Wrap</ContextMenuCheckboxItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}

function DialogBody() {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">Edit profile</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit profile</DialogTitle>
          <DialogDescription>Make changes to your profile.</DialogDescription>
        </DialogHeader>
        <DialogFooter showCloseButton />
      </DialogContent>
    </Dialog>
  );
}

function DirectionBody() {
  return (
    <DirectionProvider direction="rtl">
      <span className="text-sm">Text</span>
    </DirectionProvider>
  );
}

function DrawerBody() {
  const [open, setOpen] = useState(false);
  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>
        <Button variant="outline" size="sm">
          Open drawer
        </Button>
      </DrawerTrigger>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Move goal</DrawerTitle>
          <DrawerDescription>Set your daily goal.</DrawerDescription>
        </DrawerHeader>
        <DrawerFooter>Done</DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}

function DropdownMenuBody() {
  const [open, setOpen] = useState(false);
  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="outline">Menu</Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuLabel>Account</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem>
            Profile<DropdownMenuShortcut>Ctrl P</DropdownMenuShortcut>
          </DropdownMenuItem>
          <DropdownMenuCheckboxItem checked>
            Status bar
          </DropdownMenuCheckboxItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function EmptyBody() {
  return (
    <Empty>
      <EmptyHeader>
        <EmptyMedia>Icon</EmptyMedia>
        <EmptyTitle>No items</EmptyTitle>
        <EmptyDescription>Add one to get started.</EmptyDescription>
      </EmptyHeader>
      <EmptyContent>Action</EmptyContent>
    </Empty>
  );
}

function FieldBody() {
  return (
    <FieldSet>
      <FieldLegend>Profile</FieldLegend>
      <FieldGroup>
        <Field>
          <FieldLabel>Name</FieldLabel>
          <Input placeholder="Name" />
          <FieldDescription>Your public display name.</FieldDescription>
          <FieldError>Required</FieldError>
        </Field>
      </FieldGroup>
    </FieldSet>
  );
}

function FormBody() {
  const form = useForm({ defaultValues: { username: "" } });
  return (
    <Form {...form}>
      <FormField
        control={form.control}
        name="username"
        render={() => (
          <FormItem>
            <FormLabel>Username</FormLabel>
            <FormControl>
              <Input placeholder="shadcn" />
            </FormControl>
            <FormDescription>Your public display name.</FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
    </Form>
  );
}

function HoverCardBody() {
  const [open, setOpen] = useState(false);
  return (
    <HoverCard open={open} onOpenChange={setOpen}>
      <HoverCardTrigger asChild>
        <Button variant="link" size="sm">
          @jun
        </Button>
      </HoverCardTrigger>
      <HoverCardContent>Joined 2023</HoverCardContent>
    </HoverCard>
  );
}

function InputGroupBody() {
  return (
    <InputGroup>
      <InputGroupAddon>
        <InputGroupText>$</InputGroupText>
      </InputGroupAddon>
      <InputGroupInput placeholder="Amount" />
      <InputGroupAddon>
        <InputGroupButton>Go</InputGroupButton>
      </InputGroupAddon>
    </InputGroup>
  );
}

function InputOtpBody() {
  return (
    <InputOTP maxLength={4}>
      <InputOTPGroup>
        <InputOTPSlot index={0} />
        <InputOTPSlot index={1} />
      </InputOTPGroup>
      <InputOTPSeparator />
      <InputOTPGroup>
        <InputOTPSlot index={2} />
        <InputOTPSlot index={3} />
      </InputOTPGroup>
    </InputOTP>
  );
}

function InputBody() {
  return <Input placeholder="Name" />;
}

function ItemBody() {
  return (
    <ItemGroup>
      <Item>
        <ItemMedia>M</ItemMedia>
        <ItemContent>
          <ItemTitle>Title</ItemTitle>
          <ItemDescription>Description</ItemDescription>
        </ItemContent>
        <ItemActions>Act</ItemActions>
      </Item>
      <ItemSeparator />
      <Item>
        <ItemContent>
          <ItemTitle>Second item</ItemTitle>
        </ItemContent>
      </Item>
    </ItemGroup>
  );
}

function KbdBody() {
  return (
    <div className="flex-row items-center gap-2">
      <Kbd>Ctrl</Kbd>
      <KbdGroup>
        <Kbd>Ctrl</Kbd>
        <Kbd>K</Kbd>
      </KbdGroup>
    </div>
  );
}

function LabelBody() {
  return (
    <div className="flex-col gap-1">
      <Label htmlFor="email">Email</Label>
      <Input placeholder="you@example.com" />
    </div>
  );
}

function MarkerBody() {
  return (
    <Marker>
      <MarkerContent>Pinned</MarkerContent>
    </Marker>
  );
}

function MenubarBody() {
  return (
    <Menubar>
      <MenubarMenu value="file">
        <MenubarTrigger className="text-sm font-bold text-slate-900">
          File
        </MenubarTrigger>
        <MenubarContent>
          <MenubarItem>
            New<MenubarShortcut>Ctrl N</MenubarShortcut>
          </MenubarItem>
          <MenubarSeparator />
          <MenubarCheckboxItem checked>Wrap</MenubarCheckboxItem>
        </MenubarContent>
      </MenubarMenu>
      <MenubarMenu value="edit">
        <MenubarTrigger className="text-sm font-bold text-slate-900">
          Edit
        </MenubarTrigger>
      </MenubarMenu>
    </Menubar>
  );
}

function MessageScrollerBody() {
  return (
    <MessageScroller>
      <MessageScrollerViewport className="h-[130px] w-full">
        <MessageScrollerContent>
          {["Hi", "How are you?", "Fine, thanks.", "Good."].map((t) => (
            <MessageScrollerItem key={t}>{t}</MessageScrollerItem>
          ))}
        </MessageScrollerContent>
      </MessageScrollerViewport>
      <MessageScrollerButton />
    </MessageScroller>
  );
}

function MessageBody() {
  return (
    <MessageGroup>
      <Message>
        <MessageAvatar>JG</MessageAvatar>
        <MessageHeader>Jun</MessageHeader>
        <MessageContent>Hello</MessageContent>
        <MessageFooter>10:00</MessageFooter>
      </Message>
      <Message>
        <MessageHeader>Assistant</MessageHeader>
        <MessageContent>Hi, how can I help?</MessageContent>
      </Message>
    </MessageGroup>
  );
}

function NativeSelectBody() {
  return (
    <NativeSelect defaultValue="apple">
      <NativeSelectOptGroup label="Fruit">
        <NativeSelectOption value="apple">Apple</NativeSelectOption>
        <NativeSelectOption value="pear">Pear</NativeSelectOption>
      </NativeSelectOptGroup>
    </NativeSelect>
  );
}

function NavigationMenuBody() {
  return (
    <NavigationMenu>
      <NavigationMenuList>
        <NavigationMenuItem>
          <NavigationMenuTrigger>Getting started</NavigationMenuTrigger>
          <NavigationMenuContent>
            <NavigationMenuLink>Introduction</NavigationMenuLink>
          </NavigationMenuContent>
        </NavigationMenuItem>
        <NavigationMenuItem>
          <NavigationMenuLink>Docs</NavigationMenuLink>
        </NavigationMenuItem>
      </NavigationMenuList>
    </NavigationMenu>
  );
}

function PaginationBody() {
  return (
    <Pagination>
      <PaginationContent>
        <PaginationItem>
          <PaginationPrevious href="#" />
        </PaginationItem>
        <PaginationItem>
          <PaginationLink href="#" isActive>
            1
          </PaginationLink>
        </PaginationItem>
        <PaginationItem>
          <PaginationEllipsis />
        </PaginationItem>
        <PaginationItem>
          <PaginationNext href="#" />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  );
}

function PopoverBody() {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm">
          Open popover
        </Button>
      </PopoverTrigger>
      <PopoverContent>
        <PopoverHeader>
          <PopoverTitle>Dimensions</PopoverTitle>
          <PopoverDescription>Set the width.</PopoverDescription>
        </PopoverHeader>
      </PopoverContent>
    </Popover>
  );
}

function ProgressBody() {
  return (
    <div className="flex-col gap-2">
      <Progress value={60} />
      <Progress value={20} />
    </div>
  );
}

function RadioGroupBody() {
  return (
    <RadioGroup defaultValue="a">
      <div className="flex-row items-center gap-2">
        <RadioGroupItem value="a" />
        <Label htmlFor="r-a">Default</Label>
      </div>
      <div className="flex-row items-center gap-2">
        <RadioGroupItem value="b" />
        <Label htmlFor="r-b">Comfortable</Label>
      </div>
    </RadioGroup>
  );
}

function ResizableBody() {
  return (
    <div className="w-full h-[120px]">
      <ResizablePanelGroup direction="horizontal">
        <ResizablePanel defaultSize={50}>
          <div className="w-full h-full bg-slate-200">
            <span className="text-sm">A</span>
          </div>
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel defaultSize={50}>
          <div className="w-full h-full bg-slate-100">
            <span className="text-sm">B</span>
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}

function ScrollAreaBody() {
  return (
    <ScrollArea className="h-[120px] w-[240px]">
      <div className="flex-col">
        {ROWS.map((row) => (
          <span key={row} className="text-sm">
            {row}
          </span>
        ))}
      </div>
      <ScrollBar orientation="vertical" />
    </ScrollArea>
  );
}

function SelectBody() {
  const [open, setOpen] = useState(false);
  return (
    <Select open={open} onOpenChange={setOpen} defaultValue="apple">
      <SelectTrigger>
        <SelectValue placeholder="Pick a fruit" />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectLabel>Fruit</SelectLabel>
          <SelectItem value="apple">Apple</SelectItem>
          <SelectSeparator />
          <SelectItem value="pear">Pear</SelectItem>
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}

function SeparatorBody() {
  return (
    <div className="flex-col gap-2">
      <span className="text-sm">Above</span>
      <Separator />
      <span className="text-sm">Below</span>
    </div>
  );
}

function SheetBody() {
  const [open, setOpen] = useState(false);
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm">
          Open sheet
        </Button>
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Edit</SheetTitle>
          <SheetDescription>Make changes.</SheetDescription>
        </SheetHeader>
        <SheetFooter>
          <SheetClose>Done</SheetClose>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

function SidebarBody() {
  return (
    <div className="w-full h-[240px] overflow-hidden">
      <SidebarProvider>
        <Sidebar>
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel>App</SidebarGroupLabel>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton>Inbox</SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton>Calendar</SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroup>
          </SidebarContent>
        </Sidebar>
        <SidebarInset>
          <SidebarTrigger />
          <span className="text-sm">Main</span>
        </SidebarInset>
      </SidebarProvider>
    </div>
  );
}

function SkeletonBody() {
  return (
    <div className="flex-col gap-2">
      <Skeleton className="h-4 w-48" />
      <Skeleton className="h-4 w-32" />
    </div>
  );
}

function SliderBody() {
  return <Slider defaultValue={[40]} max={100} />;
}

function SonnerBody() {
  return (
    <div className="flex-col gap-2">
      <Toaster />
      <Button size="sm" variant="outline" onClick={() => toast("Saved")}>
        Show toast
      </Button>
    </div>
  );
}

function SpinnerBody() {
  return <Spinner />;
}

function SwitchBody() {
  return (
    <div className="flex-row items-center gap-2">
      <Switch defaultChecked />
      <Switch />
    </div>
  );
}

function TableSectionBody() {
  return (
    <Table>
      <TableCaption>Recent</TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Qty</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow>
          <TableCell>Apple</TableCell>
          <TableCell>3</TableCell>
        </TableRow>
        <TableRow>
          <TableCell>Pear</TableCell>
          <TableCell>2</TableCell>
        </TableRow>
      </TableBody>
      <TableFooter>
        <TableRow>
          <TableCell>Total</TableCell>
          <TableCell>5</TableCell>
        </TableRow>
      </TableFooter>
    </Table>
  );
}

function TabsBody() {
  return (
    <Tabs defaultValue="account">
      <TabsList>
        <TabsTrigger value="account">Account</TabsTrigger>
        <TabsTrigger value="password">Password</TabsTrigger>
      </TabsList>
      <TabsContent value="account">Make changes to your account.</TabsContent>
      <TabsContent value="password">Change your password.</TabsContent>
    </Tabs>
  );
}

function TextareaBody() {
  return <Textarea placeholder="Type your message" />;
}

function ToggleGroupBody() {
  return (
    <ToggleGroup type="single" defaultValue="b">
      <ToggleGroupItem value="a">A</ToggleGroupItem>
      <ToggleGroupItem value="b">B</ToggleGroupItem>
    </ToggleGroup>
  );
}

function ToggleBody() {
  return (
    <div className="flex-row items-center gap-2">
      <Toggle aria-label="Bold" defaultPressed>
        B
      </Toggle>
      <Toggle aria-label="Italic" variant="outline">
        I
      </Toggle>
    </div>
  );
}

function TooltipBody() {
  const [open, setOpen] = useState(false);
  return (
    <TooltipProvider>
      <Tooltip open={open} onOpenChange={setOpen}>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="sm">
            Hover me
          </Button>
        </TooltipTrigger>
        <TooltipContent>Add to library</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/** One body per section name. The type makes a missing or extra name a compile error. */
export const BODIES: Record<SectionName, () => ReactElement> = {
  accordion: AccordionBody,
  "alert-dialog": AlertDialogBody,
  alert: AlertBody,
  "aspect-ratio": AspectRatioBody,
  attachment: AttachmentBody,
  avatar: AvatarBody,
  badge: BadgeBody,
  breadcrumb: BreadcrumbBody,
  bubble: BubbleBody,
  "button-group": ButtonGroupBody,
  button: ButtonBody,
  calendar: CalendarBody,
  card: CardBody,
  carousel: CarouselBody,
  chart: ChartBody,
  checkbox: CheckboxBody,
  collapsible: CollapsibleBody,
  combobox: ComboboxBody,
  command: CommandBody,
  "context-menu": ContextMenuBody,
  dialog: DialogBody,
  direction: DirectionBody,
  drawer: DrawerBody,
  "dropdown-menu": DropdownMenuBody,
  empty: EmptyBody,
  field: FieldBody,
  form: FormBody,
  "hover-card": HoverCardBody,
  "input-group": InputGroupBody,
  "input-otp": InputOtpBody,
  input: InputBody,
  item: ItemBody,
  kbd: KbdBody,
  label: LabelBody,
  marker: MarkerBody,
  menubar: MenubarBody,
  "message-scroller": MessageScrollerBody,
  message: MessageBody,
  "native-select": NativeSelectBody,
  "navigation-menu": NavigationMenuBody,
  pagination: PaginationBody,
  popover: PopoverBody,
  progress: ProgressBody,
  "radio-group": RadioGroupBody,
  resizable: ResizableBody,
  "scroll-area": ScrollAreaBody,
  select: SelectBody,
  separator: SeparatorBody,
  sheet: SheetBody,
  sidebar: SidebarBody,
  skeleton: SkeletonBody,
  slider: SliderBody,
  sonner: SonnerBody,
  spinner: SpinnerBody,
  switch: SwitchBody,
  table: TableSectionBody,
  tabs: TabsBody,
  textarea: TextareaBody,
  "toggle-group": ToggleGroupBody,
  toggle: ToggleBody,
  tooltip: TooltipBody,
};
