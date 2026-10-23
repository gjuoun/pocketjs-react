// Installs the style layer into the host config:
//   - className goes through the class runtime (static table, then runtime records);
//   - style (camelCase CSS) is mapped to core props and written as overrides. As on the web,
//     an inline style beats focus:/active: for the same property. The core has no op that
//     clears an override, so a removed key is written back to the class's own value for it,
//     or to the core default when the class does not set it.

import { type NodeMirror, type PropName, setProp } from "../internal/pocket.ts";
import { setPropsTransform } from "../renderer/host-config.ts";
import {
  applyClassName,
  classBaseValue,
  flushClassTable,
} from "./class-runtime.ts";
import { CORE_DEFAULTS, type CoreStyle, cssToCore } from "./css.ts";

type Props = Record<string, unknown>;
const appliedStyle = new WeakMap<NodeMirror, CoreStyle>();

function applyStyle(node: NodeMirror, style: unknown): void {
  const next = cssToCore(style);
  const prev = appliedStyle.get(node) ?? {};
  const delta: CoreStyle = {};
  let changed = false;
  for (const key of Object.keys(next) as PropName[]) {
    if (!Object.is(prev[key], next[key])) {
      delta[key] = next[key];
      changed = true;
    }
  }
  for (const key of Object.keys(prev) as PropName[]) {
    if (key in next) continue;
    delta[key] = classBaseValue(node, key) ?? CORE_DEFAULTS[key] ?? 0;
    changed = true;
  }
  appliedStyle.set(node, next);
  if (changed) setProp(node, "style", delta, {});
}

export function installStyleLayer(): void {
  setPropsTransform({
    toHost(props) {
      const out: Props = {};
      for (const key in props)
        if (key !== "children" && key !== "className" && key !== "style")
          out[key] = props[key];
      return out;
    },
    afterProps(node: NodeMirror, props: Props) {
      applyClassName(node, props.className);
      if (props.style !== undefined || appliedStyle.has(node))
        applyStyle(node, props.style);
    },
    afterCommit() {
      flushClassTable();
    },
  });
}
