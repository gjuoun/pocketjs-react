// JG-156 fixtures: the text-colour inheritance probe (Step 1 G1). A view sets a text colour, its
// labels carry none of their own; the labels must take the view's colour (Step 2).
export function Inherit() {
  return (
    <div className="w-full h-full flex-col p-2 bg-white text-slate-900">
      <span className="text-sm">Inherited</span>
      <div className="flex-row bg-slate-900 text-white p-2">
        <span className="text-sm">Explicit</span>
      </div>
    </div>
  );
}
