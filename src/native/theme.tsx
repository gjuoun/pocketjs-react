// ThemeProvider: the token table travels through context. A theme switch is a state change: the provider's theme
// name changes, the table it carries changes, and every component under it re-renders with the new class literals.
// No CSS layer, no variables. Without a provider the light table is used, so the components work bare.
import { createContext, type ReactNode, useContext, useMemo } from "react";
import { useControllableState } from "../primitives/state.ts";
import { THEMES, type ThemeName, type TokenTable } from "./tokens.ts";

interface ThemeValue {
  theme: ThemeName;
  setTheme: (theme: ThemeName) => void;
  tokens: TokenTable;
}

const Ctx = createContext<ThemeValue | null>(null);

export interface ThemeProviderProps {
  theme?: ThemeName;
  defaultTheme?: ThemeName;
  onThemeChange?: (theme: ThemeName) => void;
  children?: ReactNode;
}

export function ThemeProvider(props: ThemeProviderProps) {
  const [theme, setTheme] = useControllableState<ThemeName>(props.theme, props.defaultTheme ?? "light", props.onThemeChange);
  const value = useMemo<ThemeValue>(() => ({ theme, setTheme, tokens: THEMES[theme] }), [theme, setTheme]);
  return <Ctx.Provider value={value}>{props.children}</Ctx.Provider>;
}

/** The current theme name and a setter. Outside a ThemeProvider the setter is a no-op and the theme is light. */
export function useTheme(): { theme: ThemeName; setTheme: (theme: ThemeName) => void } {
  const ctx = useContext(Ctx);
  return ctx ? { theme: ctx.theme, setTheme: ctx.setTheme } : { theme: "light", setTheme: () => {} };
}

/** The token table in force: the provider's table, or the light table outside a provider. */
export function useTokens(): TokenTable {
  return useContext(Ctx)?.tokens ?? THEMES.light;
}
