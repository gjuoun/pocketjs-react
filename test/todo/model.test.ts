// The todo example's model, tested on its own: the six features are all edits here, so a row's
// position, its parent and its due date are checked without a host.
import { describe, expect, test } from "bun:test";
import {
  addChild,
  addRoot,
  counts,
  dueLabel,
  findTodo,
  flatten,
  isOverdue,
  moveSibling,
  newTodo,
  removeTodo,
  seed,
  setDue,
  shiftISO,
  todayISO,
  toggleDone,
  type Todo,
} from "../../examples/todo/model.ts";

function titles(tree: readonly Todo[]): string[] {
  return flatten(tree).map((row) => (row.depth === 1 ? "- " : "") + row.todo.title);
}

describe("flatten", () => {
  test("a root, then its children, then the next root", () => {
    const tree = seed();
    expect(titles(tree).slice(0, 5)).toEqual([
      "Ship the todo example",
      "Write the SDK manual",
      "- Start from examples/",
      "- List the components",
      "Re-read the acceptance gates",
    ]);
  });

  test("a child carries its depth and its parent", () => {
    const tree = seed();
    const child = flatten(tree).find((row) => row.depth === 1);
    expect(child?.parentId).toBe(tree[1].id);
    expect(child?.index).toBe(0);
    expect(child?.siblings).toBe(2);
  });
});

describe("addRoot", () => {
  test("inserts after the named todo, keeping that todo's children with it", () => {
    const tree = seed();
    const next = addRoot(tree, newTodo("Buy milk"), tree[1].id);
    expect(titles(next).slice(0, 5)).toEqual([
      "Ship the todo example",
      "Write the SDK manual",
      "- Start from examples/",
      "- List the components",
      "Buy milk",
    ]);
  });

  test("null goes to the top, an unknown id to the end", () => {
    const tree = seed();
    expect(addRoot(tree, newTodo("Top"), null)[0].title).toBe("Top");
    expect(addRoot(tree, newTodo("End"), "nope").at(-1)?.title).toBe("End");
  });
});

describe("addChild", () => {
  test("adds a sub-todo under its parent and no deeper", () => {
    const tree = seed();
    const parent = tree[0];
    const next = addChild(tree, parent.id, newTodo("Get oat milk"));
    expect(next[0].children.length).toBe(1);
    expect(findTodo(next, next[0].children[0].id)?.title).toBe("Get oat milk");
  });
});

describe("toggleDone", () => {
  test("toggles a root and a child", () => {
    const tree = seed();
    const root = tree[1];
    const child = root.children[0];
    const next = toggleDone(toggleDone(tree, root.id), child.id);
    expect(next[1].done).toBe(true);
    expect(next[1].children[0].done).toBe(true);
    // The toggle is a copy: the input tree is untouched.
    expect(tree[1].done).toBe(false);
  });
});

describe("moveSibling", () => {
  test("swaps a root with its neighbour and carries its children", () => {
    const tree = seed();
    const row = flatten(tree).find((r) => r.todo.id === tree[1].id)!;
    const next = moveSibling(tree, row, -1);
    expect(titles(next).slice(0, 4)).toEqual([
      "Write the SDK manual",
      "- Start from examples/",
      "- List the components",
      "Ship the todo example",
    ]);
  });

  test("the ends do not move", () => {
    const tree = seed();
    const first = flatten(tree)[0];
    expect(titles(moveSibling(tree, first, -1))).toEqual(titles(tree));
  });

  test("a child moves only among its own siblings", () => {
    const tree = seed();
    const child = flatten(tree).find((r) => r.depth === 1)!;
    const next = moveSibling(tree, child, 1);
    expect(titles(next).slice(0, 4)).toEqual([
      "Ship the todo example",
      "Write the SDK manual",
      "- List the components",
      "- Start from examples/",
    ]);
  });
});

describe("removeTodo", () => {
  test("removes a root and its children", () => {
    const tree = seed();
    const next = removeTodo(tree, tree[1].id);
    expect(titles(next)).not.toContain("Write the SDK manual");
    expect(titles(next)).not.toContain("- Start from examples/");
  });

  test("removes one child and keeps its siblings", () => {
    const tree = seed();
    const child = tree[1].children[0];
    const next = removeTodo(tree, child.id);
    expect(next[1].children.length).toBe(1);
    expect(next[1].children[0].title).toBe("List the components");
  });
});

describe("due dates", () => {
  test("setDue writes one todo only", () => {
    const tree = seed();
    const next = setDue(tree, tree[2].id, "2026-11-02");
    expect(next[2].due).toBe("2026-11-02");
    expect(tree[2].due).toBeNull();
  });

  test("the badge says today, tmr, a date, or how late", () => {
    expect(dueLabel(todayISO(), false)).toBe("today");
    expect(dueLabel(shiftISO(1), false)).toBe("tmr");
    expect(dueLabel("2026-11-02", false)).toBe("Nov 2");
    expect(dueLabel(shiftISO(-2), false)).toBe("2d late");
    // A done todo shows its date, not its lateness.
    expect(dueLabel(shiftISO(-2), true)).toMatch(/[A-Z][a-z]{2} \d{1,2}/);
  });

  test("only an undone, past due date is overdue", () => {
    expect(isOverdue(shiftISO(-1), false)).toBe(true);
    expect(isOverdue(shiftISO(-1), true)).toBe(false);
    expect(isOverdue(todayISO(), false)).toBe(false);
  });
});

describe("counts", () => {
  test("counts children too", () => {
    const tree = seed();
    expect(counts(tree)).toEqual({ total: 6, done: 1 });
    expect(counts(addChild(tree, tree[0].id, newTodo("one more"))).total).toBe(7);
  });
});
