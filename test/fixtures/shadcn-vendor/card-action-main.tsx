// Entry for the C8 card-action fixture, built by tools/build.ts and mounted like any app.
import { mount } from "pocketjs-react";
import { CardActionDemo } from "./card-action.tsx";

mount(<CardActionDemo />, { compat: { classMiss: "drop" } });
