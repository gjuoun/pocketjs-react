// react-reconciler host config over PocketJS's native tree. Every mutation goes through the
// framework's own native-tree functions, so focus repair on removal, the end-of-frame sweep
// and the `focus:`/`active:` style variants behave exactly as for Solid, Vue and Octane.
import Reconciler from "react-reconciler";
import { DefaultEventPriority } from "react-reconciler/constants";
import {
  applyProps,
  createElement,
  createTextNode,
  insertNode,
  removeNode,
  replaceText,
  setProp,
  ENUMS,
  type NodeMirror,
} from "../internal/pocket.ts";

type Props = Record<string, unknown>;

const HOST_TYPES = new Set(["view", "text", "image"]);

/** Hooks the style layer installs (className runtime, CSS style mapping). */
export interface PropsTransform {
  /** Turn React props into native-tree props (children removed). */
  toHost(props: Props): Props;
  /** Called once after every React commit (for example to load a grown style table). */
  afterCommit(): void;
}

let transform: PropsTransform = {
  toHost(props) {
    const out: Props = {};
    for (const key in props) if (key !== "children") out[key] = props[key];
    return out;
  },
  afterCommit() {},
};

export function setPropsTransform(next: PropsTransform): void {
  transform = next;
}

let currentPriority: number = DefaultEventPriority;

/** Run `fn` with React updates scheduled at `priority` (discrete for button presses). */
export function withPriority<T>(priority: number, fn: () => T): T {
  const previous = currentPriority;
  currentPriority = priority;
  try {
    return fn();
  } finally {
    currentPriority = previous;
  }
}

const hostConfig = {
  supportsMutation: true,
  supportsPersistence: false,
  supportsHydration: false,
  isPrimaryRenderer: true,
  noTimeout: -1,
  scheduleTimeout: (fn: () => void) => setTimeout(fn, 0),
  cancelTimeout: () => {},
  supportsMicrotasks: true,
  scheduleMicrotask: queueMicrotask,

  createInstance(type: string, props: Props): NodeMirror {
    if (!HOST_TYPES.has(type)) throw new Error("pocketjs-react: unknown host element <" + type + ">");
    const node = createElement(type);
    applyProps(node, transform.toHost(props));
    return node;
  },
  createTextInstance(text: string): NodeMirror {
    return createTextNode(text);
  },
  appendInitialChild(parent: NodeMirror, child: NodeMirror) { insertNode(parent, child); },
  appendChild(parent: NodeMirror, child: NodeMirror) { insertNode(parent, child); },
  appendChildToContainer(parent: NodeMirror, child: NodeMirror) { insertNode(parent, child); },
  insertBefore(parent: NodeMirror, child: NodeMirror, before: NodeMirror) { insertNode(parent, child, before); },
  insertInContainerBefore(parent: NodeMirror, child: NodeMirror, before: NodeMirror) { insertNode(parent, child, before); },
  removeChild(parent: NodeMirror, child: NodeMirror) { removeNode(parent, child); },
  removeChildFromContainer(parent: NodeMirror, child: NodeMirror) { removeNode(parent, child); },
  commitTextUpdate(node: NodeMirror, _old: string, next: string) { replaceText(node, next); },
  commitUpdate(node: NodeMirror, _type: string, oldProps: Props, newProps: Props) {
    applyProps(node, transform.toHost(newProps), transform.toHost(oldProps));
  },
  finalizeInitialChildren() { return false; },
  shouldSetTextContent() { return false; },
  getRootHostContext() { return {}; },
  getChildHostContext(context: unknown) { return context; },
  getPublicInstance(node: NodeMirror) { return node; },
  prepareForCommit() { return null; },
  resetAfterCommit() { transform.afterCommit(); },
  preparePortalMount() {},
  clearContainer(container: NodeMirror) {
    for (const child of [...container.children]) removeNode(container, child);
  },
  hideInstance(node: NodeMirror) { setProp(node, "style", { display: ENUMS.Display.None }); },
  unhideInstance(node: NodeMirror) { setProp(node, "style", { display: ENUMS.Display.Flex }); },
  hideTextInstance(node: NodeMirror) { replaceText(node, ""); },
  unhideTextInstance(node: NodeMirror, text: string) { replaceText(node, text); },
  setCurrentUpdatePriority(priority: number) { currentPriority = priority; },
  getCurrentUpdatePriority() { return currentPriority; },
  resolveUpdatePriority() { return currentPriority || DefaultEventPriority; },
  maySuspendCommit() { return false; },
  maySuspendCommitOnUpdate() { return false; },
  maySuspendCommitInSyncRender() { return false; },
  preloadInstance() { return true; },
  startSuspendingCommit() {},
  suspendInstance() {},
  waitForCommitToBeReady() { return null; },
  getInstanceFromNode() { return null; },
  beforeActiveInstanceBlur() {},
  afterActiveInstanceBlur() {},
  prepareScopeUpdate() {},
  getInstanceFromScope() { return null; },
  detachDeletedInstance() {},
  resetFormInstance() {},
  requestPostPaintCallback() {},
  shouldAttemptEagerTransition() { return false; },
  trackSchedulerEvent() {},
  resolveEventType() { return null; },
  resolveEventTimeStamp() { return -1.1; },
  NotPendingTransition: null,
  HostTransitionContext: { $$typeof: Symbol.for("react.context"), _currentValue: null, _currentValue2: null },
};

// The host config's instance types are concrete; react-reconciler's generic signature
// is too wide to express them without a long type parameter list.
export const reconciler = Reconciler(hostConfig as never);
