// Inheritance fixtures: the text-colour inheritance probe (Step 1 G1). A view sets a text colour and its
// labels carry none of their own, so they must take the view's colour (Step 2). The explicit label
// keeps its own colour; the variant label is focus-only, so the pass must leave it native.
export function Inherit() {
  return (
    <div className="w-full h-full flex-col p-2 bg-white text-slate-900">
      <span className="text-sm">Inherited</span>
      <span className="text-sm focus:text-slate-900">Variant</span>
      <div className="flex-row bg-slate-900 text-white p-2">
        <span className="text-sm">Explicit</span>
      </div>
    </div>
  );
}
