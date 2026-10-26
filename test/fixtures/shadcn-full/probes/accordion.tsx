// Minimal usage of accordion as a shadcn consumer writes it (inventory probe, not product code).
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "../ui/accordion.tsx";

export default function Probe() {
  return (
    <div className="w-full h-full flex-col gap-2 p-2 bg-slate-100">
      <Accordion type="single" collapsible defaultValue="a">
        <AccordionItem value="a">
          <AccordionTrigger>Open</AccordionTrigger>
          <AccordionContent>Body</AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
