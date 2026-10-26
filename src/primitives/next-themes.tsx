// next-themes shim (batch 2): the R8 remap points `next-themes` here. A native app has one fixed theme, so
// useTheme returns a constant light theme and setTheme does nothing (no DOM write, no provider state).
import type { ReactNode } from "react";

export interface UseThemeResult {
  theme: string;
  resolvedTheme: string;
  systemTheme: "light";
  themes: string[];
  setTheme: (theme: string) => void;
}

export function useTheme(): UseThemeResult {
  return {
    theme: "light",
    resolvedTheme: "light",
    systemTheme: "light",
    themes: ["light"],
    setTheme: () => {},
  };
}

/** Renders its children; there is no theme state to provide. */
export function ThemeProvider(props: { children?: ReactNode }) {
  return <>{props.children}</>;
}
