// Entry for the C2 variants build: mounts <Variants/> through the product mount().
import { mount } from "pocketjs-react";
import { Variants } from "./variants.tsx";

mount(<Variants />, { compat: { classMiss: "drop" } });
