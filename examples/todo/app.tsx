// The todo app: the reference project for the SDK manual (docs/sdk.md).
//
// Six things a todo list must do, each on its own input:
//   list todos            the rows below, windowed to what fits the 480x272 screen
//   add todos             the input row; Enter (or the on-screen keyboard's OK) commits
//   complete todos        CIRCLE on a row, or a click; the box fills
//   adjust order          L/R shoulder moves the focused row among its siblings
//   create sub-todos      SQUARE starts a sub-task of the focused row; one level deep
//   set due date          TRIANGLE opens the due picker; quick picks, or a month grid
// SELECT (Shift) deletes with a confirm. START (Space) puts the caret in the input row.
// Todos are saved to the host's file system when it mounts one (the browser host backs it with
// localStorage); a host without fs keeps them for the session.

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  BTN,
  closeField,
  fieldFor,
  focusNode,
  openField,
  pushFocusController,
  Text,
  useButton,
  View,
} from "pocketjs-react";
import {
  Badge,
  Button,
  Calendar,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  Input,
  ThemeProvider,
} from "pocketjs-react/native";
import type { CalendarDate } from "pocketjs-react/native";
import {
  addChild,
  addRoot,
  counts,
  dueLabel,
  flatten,
  isOverdue,
  moveSibling,
  newTodo,
  type Row,
  removeTodo,
  seed,
  setDue,
  shiftISO,
  todayISO,
  toggleDone,
  type Todo,
} from "./model.ts";
import { load, save } from "./storage.ts";

/** Rows that fit the list area at one time; the window follows the focus. */
const VISIBLE = 5;
/** A row's title is clipped to this many characters: the screen has no ellipsis and no scroll. */
const TITLE_MAX = 34;

function clip(text: string): string {
  return text.length > TITLE_MAX ? text.slice(0, TITLE_MAX - 1) + "~" : text;
}

interface RowsProps {
  rows: Row[];
  focusId: string | null;
  onFocus: (id: string) => void;
  onPress: (row: Row) => void;
}

/** The list: one focusable row per todo, a window that follows the focus, and a sub-todo indent. */
function Rows(props: RowsProps) {
  const container = useRef<unknown>(null);
  const nodes = useRef(new Map<string, unknown>());
  const [start, setStart] = useState(0);
  const state = useRef({ start, focusId: props.focusId, rows: props.rows });
  state.current = { start, focusId: props.focusId, rows: props.rows };
  const count = Math.min(VISIBLE, props.rows.length);
  const maxStart = Math.max(0, props.rows.length - count);

  useLayoutEffect(
    () =>
      pushFocusController(container.current as never, (direction) => {
        if (direction !== "up" && direction !== "down") return false;
        const now = state.current;
        const at = now.rows.findIndex((row) => row.todo.id === now.focusId);
        const next = Math.max(0, Math.min(now.rows.length - 1, at + (direction === "down" ? 1 : -1)));
        if (next === at || next < 0) return true;
        let s = now.start;
        if (next < s) s = next;
        if (next >= s + count) s = next - count + 1;
        props.onFocus(now.rows[next].todo.id);
        setStart(s);
        return true;
      }),
    [count, props.rows.length],
  );

  // The focused row owns the core's focus, so a click, a re-order or a delete lands on it.
  useLayoutEffect(() => {
    const node = nodes.current.get(props.focusId ?? "");
    if (node) focusNode(node as never);
  }, [props.focusId, start, props.rows]);

  useEffect(() => {
    if (start > maxStart) setStart(maxStart);
  }, [start, maxStart]);

  const shown = props.rows.slice(start, start + count);
  return (
    <View ref={container as never} className="flex-col gap-1 w-full">
      {shown.map((row) => {
        const done = row.todo.done;
        const due = row.todo.due;
        return (
          <View
            key={row.todo.id}
            ref={(node: unknown | null) => {
              if (node) nodes.current.set(row.todo.id, node);
              else nodes.current.delete(row.todo.id);
            }}
            className={
              row.todo.id === props.focusId
                ? "h-[30px] flex-row items-center gap-2 px-2 rounded-lg bg-blue-100"
                : done
                  ? "h-[30px] flex-row items-center gap-2 px-2 rounded-lg bg-slate-100"
                  : "h-[30px] flex-row items-center gap-2 px-2 rounded-lg bg-white"
            }
            focusable
            onPress={() => props.onPress(row)}
            debugName={row.todo.id}
          >
            {row.depth === 1 ? <View className="w-[14px]" /> : null}
            <View className={done ? "w-[14px] h-[14px] rounded bg-emerald-500" : "w-[14px] h-[14px] rounded bg-slate-300"}>
              <Text className="text-xs text-white">{done ? "v" : ""}</Text>
            </View>
            <View className="flex-1">
              <Text className={done ? "text-sm text-slate-500" : "text-sm text-slate-900"}>
                {clip(row.todo.title)}
              </Text>
            </View>
            {due ? (
              <Badge variant={isOverdue(due, done) ? "destructive" : "secondary"}>
                {dueLabel(due, done)}
              </Badge>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

/** The month grid, as its own screen: the calendar is 214 px tall and a dialog panel is not. */
function DueScreen(props: { todo: Todo; onPick: (iso: string | null) => void; onBack: () => void }) {
  const today = new Date();
  const value: CalendarDate | null = props.todo.due
    ? {
        year: Number(props.todo.due.slice(0, 4)),
        month: Number(props.todo.due.slice(5, 7)),
        day: Number(props.todo.due.slice(8, 10)),
      }
    : null;
  useButton(BTN.CROSS, props.onBack);
  return (
    <View className="w-full h-full flex-col bg-slate-50 p-2 gap-1">
      <View className="flex-row items-center justify-between">
        <Text className="text-sm font-bold text-slate-900">Due date</Text>
        <Text className="text-xs text-slate-500">CIRCLE sets · X back</Text>
      </View>
      <View className="w-full items-center">
        <Calendar
          autoFocus
          value={value}
          defaultValue={value}
          onValueChange={(picked) => {
            const iso =
              picked.year +
              "-" +
              (picked.month < 10 ? "0" : "") +
              picked.month +
              "-" +
              (picked.day < 10 ? "0" : "") +
              picked.day;
            props.onPick(iso);
          }}
          today={{ year: today.getFullYear(), month: today.getMonth() + 1, day: today.getDate() }}
        />
      </View>
      <View className="flex-row gap-2">
        <Button size="sm" variant="ghost" onPress={() => props.onPick(null)}>
          Clear
        </Button>
      </View>
    </View>
  );
}

export function App() {
  const [tree, setTree] = useState<Todo[]>(() => load() ?? seed());
  const [focusId, setFocusId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [addingTo, setAddingTo] = useState<Todo | null>(null);
  const [dueFor, setDueFor] = useState<string | null>(null);
  const [picking, setPicking] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<Row | null>(null);
  const field = useRef<unknown>(null);

  const rows = useMemo(() => flatten(tree), [tree]);
  const focused = rows.find((row) => row.todo.id === focusId) ?? rows[0] ?? null;
  const open = dueFor !== null || picking !== null || confirming !== null;
  const tally = counts(tree);
  const dueTarget = rows.find((row) => row.todo.id === dueFor)?.todo ?? null;
  const pickTarget = rows.find((row) => row.todo.id === picking)?.todo ?? null;

  useEffect(() => {
    save(tree);
  }, [tree]);

  const toggle = (row: Row) => setTree((prev) => toggleDone(prev, row.todo.id));
  const move = (row: Row, step: number) => {
    const at = row.parentId === null ? row.index : row.index;
    if (at + step < 0 || at + step >= row.siblings) return;
    setTree((prev) => moveSibling(prev, row, step));
    setFocusId(row.todo.id);
  };
  const forget = (row: Row) => {
    const at = rows.findIndex((r) => r.todo.id === row.todo.id);
    const next = rows[at + 1] ?? rows[at - 1] ?? null;
    setTree((prev) => removeTodo(prev, row.todo.id));
    setFocusId(next ? next.todo.id : null);
    setConfirming(null);
  };
  const submit = (value: string) => {
    const title = value.trim();
    if (!title) {
      setDraft("");
      setAddingTo(null);
      return;
    }
    const todo = newTodo(clip(title));
    if (addingTo) setTree((prev) => addChild(prev, addingTo.id, todo));
    else setTree((prev) => addRoot(prev, todo, focused && focused.parentId === null ? focused.todo.id : null));
    setDraft("");
    setAddingTo(null);
    setFocusId(todo.id);
  };
  const pickDue = (iso: string | null) => {
    const id = dueFor ?? picking;
    if (id) setTree((prev) => setDue(prev, id, iso));
    setPicking(null);
    setDueFor(null);
    setFocusId(id);
  };
  const openInput = () => {
    const node = field.current as never;
    if (!node) return;
    focusNode(node);
    const binding = fieldFor(node);
    if (binding) openField(binding);
  };
  const closeInput = () => {
    const node = field.current as never;
    if (!node) return;
    const binding = fieldFor(node);
    if (binding) closeField(binding);
  };
  const startSubtask = () => {
    if (!focused || focused.parentId !== null) return;
    setAddingTo(focused.todo);
    setDraft("");
    openInput();
  };

  // The input row owns the focus at boot, so typing starts a todo without a click.
  useLayoutEffect(() => {
    const node = field.current as never;
    if (node) focusNode(node);
  }, []);

  useButton(
    BTN.LTRIGGER | BTN.RTRIGGER,
    (bit) => {
      if (!focused) return;
      move(focused, bit === BTN.LTRIGGER ? -1 : 1);
    },
    { enabled: !open },
  );
  useButton(
    BTN.TRIANGLE,
    () => {
      if (focused) setDueFor(focused.todo.id);
    },
    { enabled: !open },
  );
  useButton(BTN.SQUARE, startSubtask, { enabled: !open });
  useButton(
    BTN.SELECT,
    () => {
      if (focused) setConfirming(focused);
    },
    { enabled: !open },
  );
  useButton(BTN.START, openInput);
  useButton(
    BTN.CROSS,
    () => {
      if (addingTo) {
        setAddingTo(null);
        setDraft("");
        closeInput();
      }
    },
    { enabled: !open },
  );

  if (picking !== null && pickTarget) {
    return (
      <ThemeProvider theme="light">
        <DueScreen todo={pickTarget} onPick={pickDue} onBack={() => setPicking(null)} />
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider theme="light">
      <View className="w-full h-full flex-col bg-slate-50 p-2 gap-1">
        <View className="flex-row items-center justify-between">
          <Text className="text-sm font-bold text-slate-900">
            {addingTo ? "Sub-task of " + clip(addingTo.title) : "Todos"}
          </Text>
          <Text className="text-xs text-slate-500">
            {tally.done + "/" + tally.total + " done"}
          </Text>
        </View>

        <Input
          value={draft}
          placeholder={addingTo ? "Sub-task, then Enter" : "New task, then Enter"}
          nodeRef={(node) => {
            field.current = node;
          }}
          onChange={setDraft}
          onCommit={submit}
        />

        <View className="flex-1">
          {rows.length > 0 ? (
            <Rows rows={rows} focusId={focused ? focused.todo.id : null} onFocus={setFocusId} onPress={toggle} />
          ) : (
            <View className="w-full h-[60px] items-center justify-center">
              <Text className="text-xs text-slate-500">No todos yet. Type one above.</Text>
            </View>
          )}
        </View>

        <Text className="text-xs text-slate-500">
          Square due · Triangle sub-task · L/R move · Select delete
        </Text>
      </View>

      <Dialog open={dueFor !== null} onOpenChange={(next) => setDueFor(next ? dueFor : null)}>
        <DialogContent>
          <DialogTitle>Due date</DialogTitle>
          <DialogDescription>{dueTarget ? clip(dueTarget.title) : ""}</DialogDescription>
          <View className="flex-row gap-2">
            <Button size="sm" onPress={() => pickDue(todayISO())}>
              Today
            </Button>
            <Button size="sm" variant="outline" onPress={() => pickDue(shiftISO(1))}>
              Tomorrow
            </Button>
          </View>
          <View className="flex-row gap-2">
            <Button size="sm" variant="outline" onPress={() => pickDue(shiftISO(3))}>
              In 3 days
            </Button>
            <Button size="sm" variant="outline" onPress={() => pickDue(shiftISO(7))}>
              Next week
            </Button>
          </View>
          <View className="flex-row gap-2">
            <Button size="sm" variant="secondary" onPress={() => setPicking(dueFor)}>
              Pick a date
            </Button>
            <Button size="sm" variant="ghost" onPress={() => pickDue(null)}>
              Clear
            </Button>
          </View>
        </DialogContent>
      </Dialog>

      <Dialog open={confirming !== null} onOpenChange={(next) => setConfirming(next ? confirming : null)}>
        <DialogContent>
          <DialogTitle>Delete this todo?</DialogTitle>
          <DialogDescription>{confirming ? clip(confirming.todo.title) : ""}</DialogDescription>
          <View className="flex-row gap-2">
            <Button size="sm" variant="destructive" onPress={() => confirming && forget(confirming)}>
              Delete
            </Button>
            <Button size="sm" variant="secondary" onPress={() => setConfirming(null)}>
              Cancel
            </Button>
          </View>
        </DialogContent>
      </Dialog>
    </ThemeProvider>
  );
}
