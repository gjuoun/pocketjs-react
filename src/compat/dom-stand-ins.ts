// Effect-time DOM stand-ins (compat only). Vendored shadcn sources read window and document inside effects (the
// mobile breakpoint listener, the sidebar keyboard shortcut and cookie). PocketJS has neither, so each is supplied only
// when the host has none, and window.innerWidth is the live mount viewport. Nothing else reads them.
import { viewportWidth } from "../compat/selectors.ts";

export function installDomStandIns(): void {
  const g = globalThis as Record<string, unknown>;
  if (g.window === undefined) {
    g.window = {
      get innerWidth() {
        return viewportWidth();
      },
      addEventListener() {},
      removeEventListener() {},
      matchMedia: (query: string) => ({
        matches: false,
        media: query,
        addEventListener() {},
        removeEventListener() {},
      }),
    };
  }
  if (g.document === undefined) g.document = { cookie: "" };
}
