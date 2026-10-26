// Minimal usage of form as a shadcn consumer writes it (inventory probe, not product code).
import {
  Form,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
} from "../ui/form.tsx";
import { Input } from "../ui/input.tsx";

export default function Probe() {
  return (
    <div className="w-full h-full flex-col gap-2 p-2 bg-slate-100">
      <Form>
        <FormItem>
          <FormLabel>Email</FormLabel>
          <FormControl>
            <Input placeholder="you@x.com" />
          </FormControl>
          <FormDescription>Work address</FormDescription>
          <FormMessage />
        </FormItem>
      </Form>
    </div>
  );
}
