// Installs the style layer into the host config: className goes through the class runtime.
import { setPropsTransform } from "../renderer/host-config.ts";
import { applyClassName, flushClassTable } from "./class-runtime.ts";
import type { NodeMirror } from "../internal/pocket.ts";

type Props = Record<string, unknown>;

export function installStyleLayer(): void {
  setPropsTransform({
    toHost(props) {
      const out: Props = {};
      for (const key in props) if (key !== "children" && key !== "className") out[key] = props[key];
      return out;
    },
    afterProps(node: NodeMirror, props: Props) {
      applyClassName(node, props.className);
    },
    afterCommit() {
      flushClassTable();
    },
  });
}
