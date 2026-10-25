// Entry for the JG-156 inheritance fixture, built by tools/build.ts and mounted like any app.
import { mount } from "pocketjs-react";
import { Inherit } from "./inherit.tsx";

mount(<Inherit />, { compat: { classMiss: "drop" } });
