// Minimal usage of tabs as a shadcn consumer writes it (inventory probe, not product code).
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../ui/tabs.tsx";

export default function Probe() {
  return (
    <div className="w-full h-full flex-col gap-2 p-2 bg-slate-100">
      <Tabs defaultValue="a">
        <TabsList>
          <TabsTrigger value="a">Account</TabsTrigger>
          <TabsTrigger value="b">Password</TabsTrigger>
        </TabsList>
        <TabsContent value="a">Make changes</TabsContent>
      </Tabs>
    </div>
  );
}
