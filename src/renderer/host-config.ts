// react-reconciler host config over PocketJS's native tree. Every mutation goes through the
// framework's own native-tree functions, so focus repair on removal, the end-of-frame sweep
// and the `focus:`/`active:` style variants behave exactly as for Solid, Vue and Octane.
import Reconciler from "react-reconciler";
import { DefaultEventPriority } from "react-reconciler/constants";
import {
  applyProps,
  createElement,
  createTextNode,
  ENUMS,
  insertNode,
  type NodeMirror,
  removeNode,
  replaceText,
  setDebugName,
  setProp,
} from "../internal/pocket.ts";

type Props = Record<string, unknown>;

const HOST_TYPES = new Set(["view", "text", "image"]);

/** The DOM-compat hook, installed by mount() through the compat layer. Default identity:
 *  every tag must already be a PocketJS host type. `count` is true on creation - the
 *  compat layer counts what it drops once per mount, not again on every re-render. */
export interface HostCompat {
  type(tag: string, props: Props): string;
  props(tag: string, props: Props, count: boolean): Props;
  /** After a node's host props are applied: give it state the native tree cannot express.
   *  C4 binds text entry elements here (the field owns their text children and press). */
  bind?(node: NodeMirror, tag: string, props: Props, count: boolean): void;
  /** Where a React child really goes: a raw run under a textual view is held by a text element. */
  hold?(parent: NodeMirror, child: NodeMirror): NodeMirror;
  /** The node a React child was inserted as (for removal and insert-before anchors). */
  heldBy?(child: NodeMirror): NodeMirror;
}

let compat: HostCompat = {
  type: (tag) => tag,
  props: (_tag, props) => {
    const out: Props = {};
    for (const key in props) if (key !== "children") out[key] = props[key];
    return out;
  },
};

export function setHostCompat(next: HostCompat): void {
  compat = next;
}

/** Hooks the style layer installs (className runtime, CSS style mapping). */
export interface PropsTransform {
  /** Turn React props into native-tree props (children removed). */
  toHost(props: Props): Props;
  /** Called after a node's host props were applied (create and update). Receives the props the
   *  compat layer produced, so a className the compat layer rewrote (JG-157 default focus) is the one applied. */
  afterProps(node: NodeMirror, props: Props): void;
  /** Called once after every React commit (for example to load a grown style table). */
  afterCommit(): void;
}

let transform: PropsTransform = {
  toHost(props) {
    const out: Props = {};
    for (const key in props) if (key !== "children") out[key] = props[key];
    return out;
  },
  afterProps() {},
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
    const hostType = compat.type(type, props);
    if (!HOST_TYPES.has(hostType))
      throw new Error("pocketjs-react: unknown host element <" + type + ">");
    const node = createElement(hostType);
    if (hostType !== type) setDebugName(node, type);
    const hostProps = compat.props(type, props, true);
    applyProps(node, transform.toHost(hostProps));
    transform.afterProps(node, hostProps);
    compat.bind?.(node, type, props, true);
    return node;
  },
  createTextInstance(text: string): NodeMirror {
    return createTextNode(text);
  },
  appendInitialChild(parent: NodeMirror, child: NodeMirror) {
    insertNode(parent, compat.hold?.(parent, child) ?? child);
  },
  appendChild(parent: NodeMirror, child: NodeMirror) {
    insertNode(parent, compat.hold?.(parent, child) ?? child);
  },
  appendChildToContainer(parent: NodeMirror, child: NodeMirror) {
    insertNode(parent, compat.hold?.(parent, child) ?? child);
  },
  insertBefore(parent: NodeMirror, child: NodeMirror, before: NodeMirror) {
    insertNode(
      parent,
      compat.hold?.(parent, child) ?? child,
      compat.heldBy?.(before) ?? before,
    );
  },
  insertInContainerBefore(
    parent: NodeMirror,
    child: NodeMirror,
    before: NodeMirror,
  ) {
    insertNode(
      parent,
      compat.hold?.(parent, child) ?? child,
      compat.heldBy?.(before) ?? before,
    );
  },
  removeChild(parent: NodeMirror, child: NodeMirror) {
    removeNode(parent, compat.heldBy?.(child) ?? child);
  },
  removeChildFromContainer(parent: NodeMirror, child: NodeMirror) {
    removeNode(parent, compat.heldBy?.(child) ?? child);
  },
  commitTextUpdate(node: NodeMirror, _old: string, next: string) {
    replaceText(node, next);
  },
  commitUpdate(
    node: NodeMirror,
    type: string,
    oldProps: Props,
    newProps: Props,
  ) {
    const hostProps = compat.props(type, newProps, false);
    applyProps(
      node,
      transform.toHost(hostProps),
      transform.toHost(compat.props(type, oldProps, false)),
    );
    transform.afterProps(node, hostProps);
    compat.bind?.(node, type, newProps, false);
  },
  finalizeInitialChildren() {
    return false;
  },
  shouldSetTextContent() {
    return false;
  },
  getRootHostContext() {
    return {};
  },
  getChildHostContext(context: unknown) {
    return context;
  },
  getPublicInstance(node: NodeMirror) {
    return node;
  },
  prepareForCommit() {
    return null;
  },
  resetAfterCommit() {
    transform.afterCommit();
  },
  preparePortalMount() {},
  clearContainer(container: NodeMirror) {
    for (const child of [...container.children]) removeNode(container, child);
  },
  hideInstance(node: NodeMirror) {
    setProp(node, "style", { display: ENUMS.Display.None });
  },
  unhideInstance(node: NodeMirror) {
    setProp(node, "style", { display: ENUMS.Display.Flex });
  },
  hideTextInstance(node: NodeMirror) {
    replaceText(node, "");
  },
  unhideTextInstance(node: NodeMirror, text: string) {
    replaceText(node, text);
  },
  setCurrentUpdatePriority(priority: number) {
    currentPriority = priority;
  },
  getCurrentUpdatePriority() {
    return currentPriority;
  },
  resolveUpdatePriority() {
    return currentPriority || DefaultEventPriority;
  },
  maySuspendCommit() {
    return false;
  },
  maySuspendCommitOnUpdate() {
    return false;
  },
  maySuspendCommitInSyncRender() {
    return false;
  },
  preloadInstance() {
    return true;
  },
  startSuspendingCommit() {},
  suspendInstance() {},
  waitForCommitToBeReady() {
    return null;
  },
  getInstanceFromNode() {
    return null;
  },
  beforeActiveInstanceBlur() {},
  afterActiveInstanceBlur() {},
  prepareScopeUpdate() {},
  getInstanceFromScope() {
    return null;
  },
  detachDeletedInstance() {},
  resetFormInstance() {},
  requestPostPaintCallback() {},
  shouldAttemptEagerTransition() {
    return false;
  },
  trackSchedulerEvent() {},
  resolveEventType() {
    return null;
  },
  resolveEventTimeStamp() {
    return -1.1;
  },
  NotPendingTransition: null,
  HostTransitionContext: {
    $$typeof: Symbol.for("react.context"),
    _currentValue: null,
    _currentValue2: null,
  },
};

// The host config's instance types are concrete; react-reconciler's generic signature
// is too wide to express them without a long type parameter list.
export const reconciler = Reconciler(hostConfig as never);
