// Fixture: a utility name assembled at runtime. "w-[40px]" never appears in the source as a
// complete token, so, as with Tailwind, it is not supported and must be reported.
import { mount, View } from "pocketjs-react";

const width = 40;

mount(<View className={"w-[" + width + "px] h-[10px] bg-blue-600"} />);
