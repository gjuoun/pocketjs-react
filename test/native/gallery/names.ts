// The gallery's page names, in page order. A page title reads "NN/MM Name" with MM the page count.
// The judge reads each name back from the drawn title and checks it against this list.
export const PAGE_NAMES = ["Button", "Input", "Card", "Dialog", "Tabs", "Label", "Badge", "Separator", "Avatar", "Progress", "Skeleton", "Spinner", "Checkbox", "Switch", "RadioGroup", "Select", "Slider", "Accordion", "Sheet", "Popover", "Tooltip", "DropdownMenu", "Toast", "Table", "Breadcrumb", "Alert", "Empty", "Field", "Pagination", "InputOTP", "NavigationMenu", "Command", "Sidebar", "Resizable", "Carousel", "Theme"] as const;
export type PageName = (typeof PAGE_NAMES)[number];
