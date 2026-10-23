// Fixture entry: the C1 acceptance probe on the real build + bootApp path.
// classMiss=drop: shadcn's utility vocabulary (bg-primary, inline-flex, ...) is C2's job;
// until then the unsupported tokens are dropped and counted instead of crashing the app.
import { mount } from "pocketjs-react";
import { App } from "./app.tsx";

mount(<App />, { compat: { classMiss: "drop" } });
