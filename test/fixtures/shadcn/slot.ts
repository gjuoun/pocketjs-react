// C1 fixture stand-in for radix-ui's Slot (plan fork F1=A): the verbatim shadcn sources
// import Slot only for the asChild path, which C1 does not support. Nothing in this fixture
// takes that path; if something ever does, fail loudly instead of rendering something else.
// The registry JSX/logic is otherwise byte-for-byte; only import specifiers are remapped.
export const Slot = {
  Root: () => {
    throw new Error("pocketjs-react compat fixture: asChild/Slot is not supported until C3/C5");
  },
};
