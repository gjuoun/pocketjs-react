// Four defect mutants for the acceptance proof. Each is one section's real vendored components with one
// defect class applied. The gates must fail on the mutant and pass on the real section (tools/qa/acceptance/defects.ts).
import { Text, View } from "pocketjs-react";
import { Badge } from "../shadcn-full/ui/badge.tsx";
import { Button } from "../shadcn-full/ui/button.tsx";
import { Carousel, CarouselItem } from "../shadcn-full/ui/carousel.tsx";
import { Sheet, SheetContent, SheetTrigger } from "../shadcn-full/ui/sheet.tsx";
import type { ComponentType } from "react";

/** White-on-white: the label takes the same colour as its fill. */
function WhiteButton() {
  return (
    <View className="w-full flex-col items-start p-2">
      <Button className="bg-white text-white">Save</Button>
    </View>
  );
}

/** Zero-size: the badge's wrapper collapses to 0 x 0; its label is not drawn inside it. */
function ZeroSizeBadge() {
  return (
    <View className="w-0 h-0 flex-row">
      <Badge>New</Badge>
    </View>
  );
}

/** Overflow: a 600 px slide in a 400 px viewport with no clipping; the slide runs past the screen edge. */
function OverflowCarousel() {
  return (
    <Carousel className="w-full">
      <View className="flex-col" style={{ width: 400 }}>
        <CarouselItem>
          <View className="h-[60px] bg-slate-200 flex-col items-center justify-center" style={{ width: 600 }}>
            <Text className="text-sm font-bold">One</Text>
          </View>
        </CarouselItem>
      </View>
    </Carousel>
  );
}

/** Opens empty: the trigger works, the panel has no title, no description and no footer. */
function EmptySheet() {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm">
          Open sheet
        </Button>
      </SheetTrigger>
      <SheetContent>{null}</SheetContent>
    </Sheet>
  );
}

export interface Mutant {
  /** The section whose real body this mutant replaces. */
  component: string;
  /** The defect class, as the report names it. */
  defect: string;
  /** Frame height in logical px. */
  h: number;
  body: ComponentType;
}

export const MUTANTS: Record<string, Mutant> = {
  "white-button": { component: "button", defect: "white-on-white label", h: 140, body: WhiteButton },
  "zero-size-badge": { component: "badge", defect: "zero-size component", h: 80, body: ZeroSizeBadge },
  "overflow-carousel": { component: "carousel", defect: "overflowing carousel", h: 150, body: OverflowCarousel },
  "empty-sheet": { component: "sheet", defect: "sheet opens empty", h: 80, body: EmptySheet },
};
