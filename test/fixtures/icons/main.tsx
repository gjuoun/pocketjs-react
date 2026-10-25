// Icon colour fixture: the class strings the icon colour tests mount. The build scan collects their
// tokens into the style table, so the runtime class path resolves them. The entry is built, never run.

export function Samples() {
  return (
    <div>
      <div className="flex p-2 bg-white" />
      <div className="flex p-2 text-slate-500" />
      <div className="flex p-2 bg-slate-900 text-white" />
      <div className="flex flex-col gap-4 p-4 bg-white" />
      <div className="flex w-[120px] h-[40px] bg-slate-900 focus:text-white" />
      <div className="flex w-[120px] h-[40px] bg-white" />
    </div>
  );
}
