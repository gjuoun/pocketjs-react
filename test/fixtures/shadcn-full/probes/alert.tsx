// Minimal usage of alert as a shadcn consumer writes it (inventory probe, not product code).
import { Alert, AlertTitle, AlertDescription } from "../ui/alert.tsx";

export default function Probe() {
  return (
    <div className="w-full h-full flex-col gap-2 p-2 bg-slate-100">
      <Alert>
        <AlertTitle>Heads up</AlertTitle>
        <AlertDescription>Body text</AlertDescription>
      </Alert>
    </div>
  );
}
