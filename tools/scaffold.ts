// Start a new app in examples/: one command, then build and serve it.
//
//   bun tools/scaffold.ts examples/clock
//
// Writes main.tsx (the mount) and app.tsx (a screen with a title, a counter button and a footer)
// and prints the two commands that run it. It refuses a directory that already exists, and it
// touches nothing outside examples/. The files it writes are the same shape the SDK manual
// documents: see docs/sdk.md.
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { basename, join, relative, resolve } from "node:path";

const ROOT = resolve(import.meta.dir, "..");
const target = process.argv[2];

if (!target) {
  console.error("usage: bun tools/scaffold.ts examples/<name>");
  process.exit(1);
}

const dir = resolve(ROOT, target);
if (!dir.startsWith(join(ROOT, "examples") + "/")) {
  console.error("the scaffold only writes under examples/ (got " + target + ")");
  process.exit(1);
}
if (existsSync(dir)) {
  console.error(relative(ROOT, dir) + " already exists; pick another name");
  process.exit(1);
}

const name = basename(dir);
const title = name.charAt(0).toUpperCase() + name.slice(1);

const MAIN = `import { mount } from "pocketjs-react";
import { App } from "./app.tsx";

mount(<App />);
`;

const APP = `// examples/${name} — a starting screen. Build it with:
//   bun tools/build.ts examples/${name}/main.tsx --name=${name}
// and serve it with:
//   bun tools/web/serve.ts --js dist/${name}.js --pak dist/${name}.pak --port 8140
//
// A plain tree gets no focus at mount: <FocusScope autoFocus> focuses its first focusable, so
// CIRCLE does something before the user touches the d-pad.
import { useState } from "react";
import { FocusScope, Text, View } from "pocketjs-react";
import { Button, Separator, ThemeProvider } from "pocketjs-react/native";

export function App() {
  const [presses, setPresses] = useState(0);
  return (
    <ThemeProvider theme="light">
      <FocusScope className="w-full h-full" autoFocus>
        <View className="w-full h-full flex-col gap-2 p-3 bg-slate-50">
          <Text className="text-base font-bold text-slate-900">${title}</Text>
          <Separator />
          <View className="flex-row items-center gap-2">
            <Button onPress={() => setPresses((n) => n + 1)}>Press me</Button>
            <Text className="text-sm text-slate-600">{"pressed " + presses + " times"}</Text>
          </View>
          <Separator />
          <Text className="text-xs text-slate-500">d-pad moves focus · CIRCLE presses · X goes back</Text>
        </View>
      </FocusScope>
    </ThemeProvider>
  );
}
`;

mkdirSync(dir, { recursive: true });
writeFileSync(join(dir, "main.tsx"), MAIN);
writeFileSync(join(dir, "app.tsx"), APP);

console.log("created " + relative(ROOT, dir) + "/ (main.tsx, app.tsx)\n");
console.log("  bun tools/build.ts " + relative(ROOT, dir) + "/main.tsx --name=" + name);
console.log("  bun tools/web/serve.ts --js dist/" + name + ".js --pak dist/" + name + ".pak --port 8140");
