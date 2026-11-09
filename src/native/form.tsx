// Form: the light shell (the ruling: no validation library). Form holds the errors map the app feeds it: one message per
// field name. FormField is the Field unit (its invalid context, so an Input in an errored field draws the red border, and
// its wrap and message column) with the label and the message as their own parts: FormLabel draws the name, FormMessage
// draws the field's error, and with no error it draws the hint instead. Nothing here validates: the app decides what a
// field's error is, and writes it into the map.
import { createContext, type ReactNode, useContext } from "react";
import { Text, View } from "../elements.ts";
import { FieldProvider } from "./field.tsx";
import { Label } from "./label.tsx";
import { useTokens } from "./theme.tsx";

interface FormContextValue {
  errors: Record<string, string>;
}
const FormCtx = createContext<FormContextValue | null>(null);

function useForm(part: string): FormContextValue {
  const ctx = useContext(FormCtx);
  if (!ctx) throw new Error("pocketjs-react native: " + part + " must be used inside <Form>");
  return ctx;
}

export interface FormProps {
  /** One message per field name; a missing name is a valid field. */
  errors?: Record<string, string>;
  children?: ReactNode;
}

export function Form(props: FormProps) {
  return <FormCtx.Provider value={{ errors: props.errors ?? {} }}>{props.children}</FormCtx.Provider>;
}

interface FieldValue {
  name: string;
  hint?: string;
  error?: string;
}
const FieldCtx = createContext<FieldValue | null>(null);

function useFieldValue(part: string): FieldValue {
  const ctx = useContext(FieldCtx);
  if (!ctx) throw new Error("pocketjs-react native: " + part + " must be used inside <FormField>");
  return ctx;
}

export interface FormFieldProps {
  /** The key this field reads its error from. */
  name: string;
  label?: string;
  /** The line under the control while the field has no error. */
  hint?: string;
  children?: ReactNode;
}

export function FormField(props: FormFieldProps) {
  const T = useTokens() as Record<string, string>;
  const form = useForm("FormField");
  const error = form.errors[props.name];
  return (
    <FieldCtx.Provider value={{ name: props.name, hint: props.hint, error }}>
      <FieldProvider invalid={error !== undefined} disabled={false}>
        <View className={T["form.field"]} debugName={"form-field:" + props.name}>
          {props.label ? <FormLabel>{props.label}</FormLabel> : null}
          {props.children}
          <View className={T["form.message"]}><FormMessage /></View>
        </View>
      </FieldProvider>
    </FieldCtx.Provider>
  );
}

export function FormLabel(props: { children?: string }) {
  return <Label>{props.children}</Label>;
}

/** The message line: the field's error when it has one, else its hint, else nothing. */
export function FormMessage() {
  const T = useTokens() as Record<string, string>;
  const field = useFieldValue("FormMessage");
  const message = field.error ?? field.hint ?? "";
  if (message === "") return null;
  return <Text className={field.error ? T["field.error.text"] : T["field.hint.text"]}>{message}</Text>;
}
