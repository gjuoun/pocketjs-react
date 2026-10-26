// Minimal usage of button-group as a shadcn consumer writes it (inventory probe, not product code).
import { ButtonGroup, ButtonGroupSeparator } from "../ui/button-group.tsx";
import { Button } from "../ui/button.tsx";

export default function Probe() {
  return (
    <div className="w-full h-full flex-col gap-2 p-2 bg-slate-100">
      <ButtonGroup>
        <Button variant="outline">One</Button>
        <ButtonGroupSeparator />
        <Button variant="outline">Two</Button>
      </ButtonGroup>
    </div>
  );
}
