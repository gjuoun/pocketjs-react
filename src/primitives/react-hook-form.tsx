// react-hook-form shim (batch 4, R9): the pure-state subset the vendored shadcn form uses, with no npm package in the
// runtime. useForm owns the values and errors and re-renders its host on change; FormProvider and useFormContext share the
// methods; Controller hands render() a field, a field state and the form state. Named boundaries (throw, never silent):
// `rules` (validation is the caller's: validate in handleSubmit and call setError) and `register` (uncontrolled inputs
// are not supported: use Controller). Errors come only from setError and clearErrors.
import {
  type ReactNode,
  createContext,
  useContext,
  useLayoutEffect,
  useRef,
  useState,
} from "react";

type Values = Record<string, unknown>;
interface FieldError {
  type?: string;
  message?: string;
}
interface Store {
  values: Values;
  defaults: Values;
  errors: Record<string, FieldError | undefined>;
  listeners: Set<() => void>;
}
export interface Control {
  store: Store;
}

function notify(store: Store): void {
  for (const listener of [...store.listeners]) listener();
}

/** A component re-renders when the store changes. */
function useStoreTick(store: Store | undefined): void {
  const [, tick] = useState(0);
  useLayoutEffect(() => {
    if (!store) return;
    const listener = () => tick((n) => n + 1);
    store.listeners.add(listener);
    return () => {
      store.listeners.delete(listener);
    };
  }, [store]);
}

export interface UseFormReturn {
  control: Control;
  formState: { errors: Record<string, FieldError | undefined> };
  getValues(name?: string): unknown;
  setValue(name: string, value: unknown): void;
  watch(name: string): unknown;
  setError(name: string, error: FieldError): void;
  clearErrors(name?: string): void;
  getFieldState(name: string): {
    error?: FieldError;
    invalid: boolean;
    isDirty: boolean;
    isTouched: boolean;
  };
  handleSubmit(
    fn: (values: Values, event?: unknown) => unknown,
  ): (event?: { preventDefault?: () => void }) => unknown;
  reset(values?: Values): void;
  register(name: string): never;
}

export function useForm(
  options: { defaultValues?: Values; [option: string]: unknown } = {},
): UseFormReturn {
  const store = useRef<Store | null>(null);
  if (store.current === null) {
    const defaults = { ...(options.defaultValues ?? {}) };
    store.current = {
      values: { ...defaults },
      defaults,
      errors: {},
      listeners: new Set(),
    };
  }
  const s = store.current;
  useStoreTick(s);
  return {
    control: { store: s },
    formState: { errors: s.errors },
    getValues: (name) =>
      name === undefined ? { ...s.values } : s.values[name],
    setValue(name, value) {
      s.values[name] = value;
      notify(s);
    },
    watch: (name) => s.values[name],
    setError(name, error) {
      s.errors = { ...s.errors, [name]: error };
      notify(s);
    },
    clearErrors(name) {
      if (name === undefined) s.errors = {};
      else {
        const next = { ...s.errors };
        delete next[name];
        s.errors = next;
      }
      notify(s);
    },
    getFieldState(name) {
      const error = s.errors[name];
      return {
        error,
        invalid: error !== undefined,
        isDirty: false,
        isTouched: false,
      };
    },
    handleSubmit: (fn) => (event) => {
      event?.preventDefault?.();
      return fn({ ...s.values }, event);
    },
    reset(values) {
      s.values = { ...s.defaults, ...(values ?? {}) };
      s.errors = {};
      notify(s);
    },
    register(name) {
      throw new Error(
        'pocketjs-react: react-hook-form register("' +
          name +
          '") is not supported (use Controller or FormField)',
      );
    },
  };
}

interface FormContextValue {
  control?: Control;
  formState: { errors: Record<string, FieldError | undefined> };
  getFieldState: UseFormReturn["getFieldState"];
  [method: string]: unknown;
}

/** Outside a provider (a Form with no methods) the form has no values and no errors. */
const DEFAULT: FormContextValue = {
  formState: { errors: {} },
  getFieldState: () => ({
    error: undefined,
    invalid: false,
    isDirty: false,
    isTouched: false,
  }),
};

const Ctx = createContext<FormContextValue>(DEFAULT);

export function FormProvider(props: {
  children?: ReactNode;
  [method: string]: unknown;
}) {
  const { children, ...methods } = props;
  return (
    <Ctx.Provider value={{ ...DEFAULT, ...methods } as FormContextValue}>
      {children}
    </Ctx.Provider>
  );
}

export function useFormContext(): FormContextValue {
  return useContext(Ctx);
}

export function useFormState(_options?: { name?: string }): {
  errors: Record<string, FieldError | undefined>;
} {
  return { errors: useContext(Ctx).formState.errors };
}

export interface ControllerProps {
  name: string;
  control?: Control;
  defaultValue?: unknown;
  rules?: unknown;
  render: (props: {
    field: {
      name: string;
      value: unknown;
      onChange(event: unknown): void;
      onBlur(): void;
      ref(): void;
      disabled: boolean;
    };
    fieldState: {
      error?: FieldError;
      invalid: boolean;
      isDirty: boolean;
      isTouched: boolean;
    };
    formState: { errors: Record<string, FieldError | undefined> };
  }) => ReactNode;
}

export function Controller(props: ControllerProps): ReactNode {
  if (props.rules !== undefined)
    throw new Error(
      "pocketjs-react: react-hook-form rules are not supported (validate in handleSubmit and call setError)",
    );
  const ctx = useContext(Ctx);
  const store = (props.control ?? ctx.control)?.store;
  useStoreTick(store);
  if (!store) return null;
  const value = store.values[props.name] ?? props.defaultValue;
  const error = store.errors[props.name];
  return props.render({
    field: {
      name: props.name,
      value,
      onChange(event: unknown) {
        const next =
          event !== null && typeof event === "object" && "target" in event
            ? (event as { target: { value: unknown } }).target.value
            : event;
        store.values[props.name] = next;
        notify(store);
      },
      onBlur() {},
      ref() {},
      disabled: false,
    },
    fieldState: {
      error,
      invalid: error !== undefined,
      isDirty: false,
      isTouched: false,
    },
    formState: { errors: store.errors },
  });
}

export type FieldValues = Values;
export type FieldPath<T> = Extract<keyof T, string>;
