// The section frame: a title bar per component, a fixed-height body, and an error boundary around the body.
// A throw in one component replaces only its own body with a `failed:` line; the other sections still draw.

import { Text, View } from "pocketjs-react";
import { Component, type ReactNode } from "react";
import { TITLE_H } from "./layout.ts";

/** The prefix a failed section prints in place of its body (the proof test looks for it). */
export const FAILED = "failed: ";

interface GuardProps {
  name: string;
  children: ReactNode;
}
interface GuardState {
  error: string | null;
}

/** Error boundary: a render-time throw in one section becomes a one-line notice in that section. */
export class Guard extends Component<GuardProps, GuardState> {
  state: GuardState = { error: null };

  static getDerivedStateFromError(e: unknown): GuardState {
    const message = String((e as Error)?.message ?? e).split("\n")[0];
    return { error: message.slice(0, 120) };
  }

  render(): ReactNode {
    if (this.state.error !== null)
      return (
        <Text className="text-xs text-red-600">
          {`${FAILED + this.props.name}: ${this.state.error}`}
        </Text>
      );
    return this.props.children;
  }
}

interface FrameProps {
  index: number;
  total: number;
  name: string;
  h: number;
  /** A hidden frame keeps its height in the column but draws and lays out nothing. */
  hidden?: boolean;
  children: ReactNode;
}

/** One section: `NN/total name` on a dark bar, then the body in a white card of fixed height h. */
export function Frame(props: FrameProps) {
  const num = String(props.index + 1).padStart(2, "0");
  return (
    <View
      className="w-full flex-col bg-white"
      style={{ height: props.h, display: props.hidden ? "none" : "flex" }}
    >
      <View
        className="w-full flex-row items-center px-2 bg-slate-900"
        style={{ height: TITLE_H }}
      >
        <Text className="text-xs font-bold text-white">
          {`${num}/${props.total} ${props.name}`}
        </Text>
      </View>
      <View className="w-full flex-1 flex-col gap-2 p-2 overflow-hidden">
        <Guard name={props.name}>{props.children}</Guard>
      </View>
    </View>
  );
}
