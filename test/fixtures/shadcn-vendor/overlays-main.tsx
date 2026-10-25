// Entry for the C5 overlays demo, built by tools/build.ts and mounted like any app.
import { mount } from "pocketjs-react";
import { Overlays } from "./overlays.tsx";

mount(<Overlays />, { compat: { classMiss: "drop" } });
