// Entry for the icon sheet fixture, built by tools/build.ts. The tests mount IconSheet in-process.
import { mount } from "pocketjs-react";
import { IconSheet } from "./sheet.tsx";

mount(<IconSheet />, { compat: { classMiss: "drop" } });
