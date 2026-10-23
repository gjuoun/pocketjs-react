// Entry for the C3 vendored demo, built by tools/build.ts and mounted like any app.
import { mount } from "pocketjs-react";
import { Demo } from "./app.tsx";

mount(<Demo />, { compat: { classMiss: "drop" } });
