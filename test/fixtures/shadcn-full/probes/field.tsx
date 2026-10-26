// Minimal usage of field as a shadcn consumer writes it (inventory probe, not product code).
import {
  FieldSet,
  FieldLegend,
  FieldGroup,
  Field,
  FieldLabel,
  FieldDescription,
  FieldError,
} from "../ui/field.tsx";
import { Input } from "../ui/input.tsx";

export default function Probe() {
  return (
    <div className="w-full h-full flex-col gap-2 p-2 bg-slate-100">
      <FieldSet>
        <FieldLegend>Profile</FieldLegend>
        <FieldGroup>
          <Field>
            <FieldLabel>Name</FieldLabel>
            <Input placeholder="Name" />
            <FieldDescription>Public</FieldDescription>
            <FieldError>Required</FieldError>
          </Field>
        </FieldGroup>
      </FieldSet>
    </div>
  );
}
