import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";

const LOW = 5;

type Row = {
  item_id: string;
  quantity: number;
  items: { name: string } | null;
};

export async function LowStockWidget() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("inventory_balances")
    .select("item_id, quantity, items(name)")
    .lt("quantity", LOW)
    .order("quantity", { ascending: true })
    .limit(5);

  const rows = (data ?? []) as Row[];

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          Low Stock
        </CardTitle>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            All items well-stocked.
          </p>
        ) : (
          <ul className="space-y-1">
            {rows.map((r) => (
              <li key={r.item_id} className="flex justify-between text-sm">
                <span className="truncate">{r.items?.name ?? r.item_id}</span>
                <span className="font-medium text-destructive">
                  {Number(r.quantity)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
