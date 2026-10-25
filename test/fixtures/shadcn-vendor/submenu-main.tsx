// Entry for the C9 submenu demo, built by tools/build.ts and mounted like any app.
import { mount } from "pocketjs-react";
import { Submenu } from "./submenu.tsx";

mount(<Submenu />, { compat: { classMiss: "drop" } });
