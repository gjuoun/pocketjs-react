// The todo model: one tree of todos, with the pure edits the app needs.
// A todo carries an id, a title, a done flag, an optional due date (YYYY-MM-DD) and its children.
// One level of nesting is allowed: a child's own children are not drawn.

export interface Todo {
  id: string;
  title: string;
  done: boolean;
  /** YYYY-MM-DD, or null when the todo has no due date. */
  due: string | null;
  children: Todo[];
}

/** A todo as the list draws it: its depth (0 for a root, 1 for a sub-todo) and its place among its siblings. */
export interface Row {
  todo: Todo;
  depth: number;
  parentId: string | null;
  /** Position among its siblings, and how many siblings it has (for the move commands). */
  index: number;
  siblings: number;
}

let counter = 0;

export function nextId(): string {
  counter += 1;
  return "t" + counter;
}

export function newTodo(title: string, due: string | null = null): Todo {
  return { id: nextId(), title, done: false, due, children: [] };
}

/** Seed data: one of everything the app can do, so a fresh screen shows every state. */
export function seed(): Todo[] {
  const today = todayISO();
  const write = newTodo("Write the SDK manual");
  write.children.push(newTodo("Start from examples/"), newTodo("List the components"));
  return [
    { ...newTodo("Ship the todo example"), due: today, children: [] },
    write,
    { ...newTodo("Re-read the acceptance gates"), children: [] },
    { ...newTodo("Call the dentist"), due: shiftISO(-2), done: true, children: [] },
  ];
}

/** Every row in drawing order: a root, then its children, then the next root. */
export function flatten(tree: readonly Todo[]): Row[] {
  const rows: Row[] = [];
  for (let i = 0; i < tree.length; i++) {
    const todo = tree[i];
    rows.push({ todo, depth: 0, parentId: null, index: i, siblings: tree.length });
    for (let j = 0; j < todo.children.length; j++) {
      rows.push({
        todo: todo.children[j],
        depth: 1,
        parentId: todo.id,
        index: j,
        siblings: todo.children.length,
      });
    }
  }
  return rows;
}

/** Map one todo by id, keeping the tree shape (and setting the flag on the todo it found). */
function mapById(tree: readonly Todo[], id: string, fn: (todo: Todo) => Todo): Todo[] {
  return tree.map((todo) => {
    if (todo.id === id) return fn(todo);
    const children = mapById(todo.children, id, fn);
    return children === todo.children ? todo : { ...todo, children };
  });
}

/** Map one todo's children by their own id (a child is one level down). */
function mapChildren(tree: readonly Todo[], parentId: string, fn: (children: Todo[]) => Todo[]): Todo[] {
  return tree.map((todo) => {
    if (todo.id === parentId) return { ...todo, children: fn(todo.children) };
    const children = mapChildren(todo.children, parentId, fn);
    return children === todo.children ? todo : { ...todo, children };
  });
}

export function findTodo(tree: readonly Todo[], id: string): Todo | null {
  for (const todo of tree) {
    if (todo.id === id) return todo;
    const child = findTodo(todo.children, id);
    if (child) return child;
  }
  return null;
}

export function toggleDone(tree: readonly Todo[], id: string): Todo[] {
  return mapById(tree, id, (todo) => ({ ...todo, done: !todo.done }));
}

export function setDue(tree: readonly Todo[], id: string, due: string | null): Todo[] {
  return mapById(tree, id, (todo) => ({ ...todo, due }));
}

export function retitle(tree: readonly Todo[], id: string, title: string): Todo[] {
  return mapById(tree, id, (todo) => ({ ...todo, title }));
}

/** Add a root todo, after the todo `afterId` (or at the top when it is null). */
export function addRoot(tree: readonly Todo[], todo: Todo, afterId: string | null): Todo[] {
  if (afterId === null) return [todo, ...tree];
  const at = tree.findIndex((t) => t.id === afterId);
  if (at < 0) return [...tree, todo];
  return [...tree.slice(0, at + 1), todo, ...tree.slice(at + 1)];
}

/** Add a sub-todo under `parentId`. A sub-todo's own sub-todos are not drawn, so this refuses deep nesting. */
export function addChild(tree: readonly Todo[], parentId: string, todo: Todo): Todo[] {
  return mapChildren(tree, parentId, (children) => [...children, todo]);
}

export function removeTodo(tree: readonly Todo[], id: string): Todo[] {
  return tree
    .filter((todo) => todo.id !== id)
    .map((todo) => {
      const children = todo.children.filter((child) => child.id !== id);
      return children.length === todo.children.length ? todo : { ...todo, children };
    });
}

/** Swap a todo with its previous (-1) or next (+1) sibling. Each sibling list is edited on its own. */
function swapAt(list: Todo[], at: number, step: number): Todo[] {
  const to = at + step;
  if (at < 0 || to < 0 || to >= list.length) return list;
  const next = [...list];
  next[at] = list[to];
  next[to] = list[at];
  return next;
}

/** Move a todo one place up (-1) or down (+1) among its siblings. */
export function moveSibling(tree: readonly Todo[], row: Row, step: number): Todo[] {
  if (row.parentId === null) return swapAt([...tree], row.index, step);
  return mapChildren(tree, row.parentId, (children) => swapAt([...children], row.index, step));
}

/** How many todos there are, and how many are done (sub-todos included). */
export function counts(tree: readonly Todo[]): { total: number; done: number } {
  let total = 0;
  let done = 0;
  for (const todo of tree) {
    total += 1;
    if (todo.done) done += 1;
    for (const child of todo.children) {
      total += 1;
      if (child.done) done += 1;
    }
  }
  return { total, done };
}

// ---- dates: YYYY-MM-DD strings, local time, no library ----

function pad(n: number): string {
  return n < 10 ? "0" + n : String(n);
}

export function isoOf(date: Date): string {
  return date.getFullYear() + "-" + pad(date.getMonth() + 1) + "-" + pad(date.getDate());
}

export function todayISO(): string {
  return isoOf(new Date());
}

/** The date `days` away from today (negative goes back). */
export function shiftISO(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return isoOf(date);
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** The badge text for a due date: today, tomorrow, Oct 30, or 2d late. */
export function dueLabel(due: string, done: boolean): string {
  const today = todayISO();
  if (due === today) return "today";
  if (due === shiftISO(1)) return "tmr";
  const late = due < today;
  if (late) {
    const days = Math.round((Date.parse(today) - Date.parse(due)) / 86400000);
    return done ? MONTHS[Number(due.slice(5, 7)) - 1] + " " + Number(due.slice(8, 10)) : days + "d late";
  }
  return MONTHS[Number(due.slice(5, 7)) - 1] + " " + Number(due.slice(8, 10));
}

export function isOverdue(due: string, done: boolean): boolean {
  return !done && due < todayISO();
}
