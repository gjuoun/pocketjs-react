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

/** Zero-size: the badge itself is 0 x 0 (its own box, not a wrapper's); its label is a child of that box. */
function ZeroSizeBadge() {
  return (
    <View className="w-full flex-col items-start p-2">
      <Badge className="w-0 h-0 p-0">New</Badge>
    </View>
  );
}

/** Overflow: a 400 px slide, absolutely placed 200 px into its 400 px viewport with no clipping, runs past the
 *  viewport. The core clamps a flow child to its parent's width, so the slide is placed absolutely to overflow. */
function OverflowCarousel() {
  return (
    <Carousel className="w-full">
      <View className="relative flex-col h-[60px]" style={{ width: 400 }}>
        <CarouselItem className="h-[60px]">
          <View className="absolute left-[200px] top-0 w-[400px] h-[60px] bg-slate-200 flex-col items-center justify-center">
            <Text className="text-sm font-bold">One</Text>
          </View>
        </CarouselItem>
      </View>
    </Carousel>
  );
}

/** Control: the same viewport clipping (overflow-hidden) with a slide that fits inside it; the gate must pass on it. */
function OverflowCarouselFixed() {
  return (
    <Carousel className="w-full">
      <View className="relative flex-col h-[60px] overflow-hidden" style={{ width: 400 }}>
        <CarouselItem className="h-[60px]">
          <View className="absolute left-0 top-0 w-[400px] h-[60px] bg-slate-200 flex-col items-center justify-center">
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
  "overflow-carousel-fixed": { component: "carousel", defect: "control: clipped carousel (must pass)", h: 150, body: OverflowCarouselFixed },
};
