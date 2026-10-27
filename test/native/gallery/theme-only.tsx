// The theme page alone, mounted as the whole app: the entry the theme-switch bench builds (tools/native/theme-switch.ts).
import { mount } from "../../../src/index.ts";
import { ThemePage } from "./pages.tsx";

mount(<ThemePage />, { compat: { classMiss: "throw", tokenMap: false } });
