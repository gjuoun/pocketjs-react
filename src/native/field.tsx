// Field: a form-field wrapper. A Label names the control; the control slot takes any control (Input is the usual one); one
// message line sits under it: the error when invalid (it replaces the hint), else the hint, else nothing. The message line
// has a fixed height, so an error appearing moves nothing. The state reaches the control through FieldContext: an Input in
// an invalid Field draws a red border, and a disabled Field disables its control. States: rest with hint, invalid, disabled.
import { createContext, type ReactNode, useContext } from "react";
import { Text, View } from "../elements.ts";
import { Label } from "./label.tsx";
import { useTokens } from "./theme.tsx";

export interface FieldState {
  invalid: boolean;
  disabled: boolean;
}

const FieldContext = createContext<FieldState>({ invalid: false, disabled: false });

/** The Field this control sits in (a control outside a Field is valid and enabled). */
export function useField(): FieldState {
  return useContext(FieldContext);
}

export interface FieldProps {
  label?: string;
  hint?: string;
  /** The error message; when set the field is invalid. */
  error?: string;
  disabled?: boolean;
  children?: ReactNode;
}

export function Field(props: FieldProps) {
  const T = useTokens() as Record<string, string>;
  const invalid = !!props.error;
  const message = props.error ?? props.hint ?? "";
  return (
    <FieldContext.Provider value={{ invalid, disabled: props.disabled === true }}>
      <View className={T["field.wrap"]} debugName="field">
        {props.label ? <Label disabled={props.disabled}>{props.label}</Label> : null}
        {props.children}
        <View className={T["field.message"]}>
          {message ? <Text className={invalid ? T["field.error.text"] : T["field.hint.text"]}>{message}</Text> : null}
        </View>
      </View>
    </FieldContext.Provider>
  );
}
