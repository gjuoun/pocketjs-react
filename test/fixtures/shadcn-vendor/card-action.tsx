// C8 Step 8 fixture: a vendored shadcn Card whose header carries a CardAction. The header's grid
// is approximated as a row with space between (Q3=A); the test reads the two texts' positions.
import { Card, CardAction, CardHeader, CardTitle } from "./ui/card.tsx";

export function CardActionDemo() {
  return (
    <div className="w-full h-full flex-col p-2 bg-slate-100">
      <Card>
        <CardHeader>
          <CardTitle>Title</CardTitle>
          <CardAction>Act</CardAction>
        </CardHeader>
      </Card>
    </div>
  );
}
